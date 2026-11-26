import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { MessageSender, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { pushMessages, REVIEW_POSTBACK_PREFIX } from "../services/botnoi.service";

// ===========================
// POST /api/botnoi/events?token=<BOTNOI_EVENT_TOKEN>
// ตั้งเป็น "Event Subscribe URL" ใน Provider console ของ Botnoi
// รับ incoming_msg (ลูกค้าพิมพ์) และ msg_out (บอท/แอดมินตอบ) -> เก็บเป็นประวัติแชท
// และรับคะแนนรีวิวจากปุ่ม 1-5 ดาวที่ระบบส่งไปตอนปิดงาน
// ===========================

const ATTACH_COMPLETED_WINDOW_MS = 24 * 60 * 60 * 1000; // หลังปิดงาน 24 ชม. ยังเก็บแชทเข้าใบงานเดิม
const REVIEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // รับคะแนนแบบพิมพ์ตัวเลขภายใน 14 วัน
const BUFFER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // แชทพักที่ไม่เคยเปิดใบงาน เก็บไม่เกิน 7 วัน

type BotnoiMessageObject = {
  mid?: string;
  type?: string;
  text?: string;
  timestamp?: number;
  postback?: { data?: string };
};

type BotnoiEvent = {
  event_type?: string;
  bot_id?: string;
  chat_room_source?: {
    source_id?: string;
    source_type?: string;
    source_channel?: string;
  };
  sender?: { sender_type?: string; display_name?: string };
  message?: BotnoiMessageObject;
  messages?: BotnoiMessageObject[];
};

export type ParsedChatMessage = {
  mid: string | null;
  text: string;
  sender: MessageSender;
  sentAt: Date;
  postbackData: string | null;
};

const NON_TEXT_LABELS: Record<string, string> = {
  image: "[รูปภาพ]",
  video: "[วิดีโอ]",
  audio: "[ข้อความเสียง]",
  file: "[ไฟล์แนบ]",
  location: "[ตำแหน่งที่ตั้ง]",
  sticker: "[สติกเกอร์]",
};

function tokenMatches(supplied: string | undefined): boolean {
  const expected = process.env.BOTNOI_EVENT_TOKEN;
  if (!expected || !supplied) return false;
  const a = crypto.createHash("sha256").update(expected).digest();
  const b = crypto.createHash("sha256").update(supplied).digest();
  return crypto.timingSafeEqual(a, b);
}

export function parseReviewPostback(data: string | null | undefined) {
  if (!data) return null;
  const [prefix, trackingCode, star] = data.split(":");
  if (prefix !== REVIEW_POSTBACK_PREFIX || !trackingCode) return null;
  const rating = Number(star);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return { trackingCode, rating };
}

/** รับเฉพาะข้อความที่เป็นคะแนนล้วน ๆ เช่น "5", "4 ดาว", "⭐⭐⭐" */
export function parseTypedRating(text: string): number | null {
  const t = text.trim();
  const numeric = t.match(/^([1-5])\s*(ดาว|คะแนน|⭐)?$/);
  if (numeric) return Number(numeric[1]);
  const stars = t.match(/^(⭐|★){1,5}$/u);
  if (stars) return Array.from(t).length;
  return null;
}

function messageText(m: BotnoiMessageObject): string {
  if (m.type === "text" && m.text) return m.text;
  if (m.type === "postback") {
    const review = parseReviewPostback(m.postback?.data);
    if (review) return `ให้คะแนน ${review.rating} ดาว`;
    return m.text || `[กดปุ่ม] ${m.postback?.data ?? ""}`.trim();
  }
  if (m.text) return m.text;
  return NON_TEXT_LABELS[m.type ?? ""] ?? `[ข้อความประเภท ${m.type ?? "ไม่ทราบ"}]`;
}

export function parseBotnoiEvent(event: BotnoiEvent, now = new Date()): ParsedChatMessage[] {
  let sender: MessageSender;
  let items: BotnoiMessageObject[];

  if (event.event_type === "incoming_msg") {
    sender = MessageSender.CUSTOMER;
    items = event.message ? [event.message] : [];
  } else if (event.event_type === "msg_out") {
    sender = event.sender?.sender_type === "agent" ? MessageSender.STAFF : MessageSender.BOT;
    items = Array.isArray(event.messages) ? event.messages : event.message ? [event.message] : [];
  } else {
    return [];
  }

  return items
    .map((m) => ({
      mid: m.mid ? String(m.mid).slice(0, 200) : null,
      text: messageText(m).slice(0, 4000),
      sender,
      sentAt:
        typeof m.timestamp === "number" && Number.isFinite(m.timestamp)
          ? new Date(m.timestamp)
          : now,
      postbackData: m.type === "postback" ? m.postback?.data ?? null : null,
    }))
    .filter((m) => m.text.length > 0);
}

async function saveReview(
  projectId: string,
  ticket: { id: string; customerName: string; trackingCode: string },
  rating: number,
  source: { botId: string; sourceId: string; channel: string }
): Promise<boolean> {
  const existing = await prisma.review.findUnique({ where: { ticketId: ticket.id } });
  if (existing) return false;

  await prisma.review.create({
    data: { projectId, ticketId: ticket.id, customerName: ticket.customerName, rating, comment: "" },
  });

  try {
    await pushMessages(
      source.botId,
      { source_channel: source.channel, source_type: "user", source_id: source.sourceId },
      [{ type: "text", text: `ขอบคุณสำหรับคะแนน ${rating} ดาวครับ 🙏 ไว้ใจให้เราดูแลอีกนะครับ` }]
    );
  } catch (err) {
    console.error("⚠️ [Botnoi] ส่งข้อความขอบคุณรีวิวไม่สำเร็จ:", (err as Error).message);
  }
  return true;
}

export async function handleBotnoiEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!process.env.BOTNOI_EVENT_TOKEN) {
      res.status(503).json({ success: false, error: "ยังไม่ได้ตั้งค่า BOTNOI_EVENT_TOKEN" });
      return;
    }
    const supplied = (req.query.token as string | undefined) ?? req.header("x-botnoi-event-token");
    if (!tokenMatches(supplied)) {
      res.status(401).json({ success: false, error: "token ไม่ถูกต้อง" });
      return;
    }

    const event = (req.body ?? {}) as BotnoiEvent;
    const botId = event.bot_id;
    const sourceId = event.chat_room_source?.source_id;
    const channel = event.chat_room_source?.source_channel || "line";
    const sourceType = event.chat_room_source?.source_type || "user";

    // ตอบ 200 กับ event ที่ไม่เกี่ยวข้อง เพื่อไม่ให้ Botnoi มองว่าส่งไม่สำเร็จ
    if (!botId || !sourceId || sourceType !== "user") {
      res.json({ success: true, ignored: "unsupported_source" });
      return;
    }

    const messages = parseBotnoiEvent(event);
    if (messages.length === 0) {
      res.json({ success: true, ignored: "no_messages" });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { botnoiBotId: botId },
      select: { id: true },
    });
    if (!project) {
      res.json({ success: true, ignored: "unknown_bot" });
      return;
    }
    const projectId = project.id;
    const now = new Date();

    // ---------- รีวิว ----------
    let reviewSaved = false;
    if (messages[0].sender === MessageSender.CUSTOMER) {
      const fromButton = parseReviewPostback(messages[0].postbackData);
      const typed = fromButton ? null : parseTypedRating(messages[0].text);

      if (fromButton) {
        const ticket = await prisma.ticket.findFirst({
          where: {
            projectId,
            trackingCode: fromButton.trackingCode,
            status: TicketStatus.COMPLETED,
            botnoiSourceId: sourceId,
          },
          select: { id: true, customerName: true, trackingCode: true },
        });
        if (ticket) {
          reviewSaved = await saveReview(projectId, ticket, fromButton.rating, {
            botId,
            sourceId,
            channel,
          });
        }
      } else if (typed !== null) {
        const ticket = await prisma.ticket.findFirst({
          where: {
            projectId,
            botnoiSourceId: sourceId,
            status: TicketStatus.COMPLETED,
            reviewRequestedAt: { gte: new Date(now.getTime() - REVIEW_WINDOW_MS) },
            review: null,
          },
          select: { id: true, customerName: true, trackingCode: true },
          orderBy: { reviewRequestedAt: "desc" },
        });
        if (ticket) {
          reviewSaved = await saveReview(projectId, ticket, typed, { botId, sourceId, channel });
        }
      }
    }

    // ---------- ประวัติแชท ----------
    const latest = await prisma.ticket.findFirst({
      where: { projectId, botnoiSourceId: sourceId, status: { not: TicketStatus.CANCELLED } },
      select: { id: true, status: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
    const attachTo =
      latest &&
      (latest.status !== TicketStatus.COMPLETED ||
        now.getTime() - latest.updatedAt.getTime() <= ATTACH_COMPLETED_WINDOW_MS)
        ? latest
        : null;

    if (attachTo) {
      await prisma.message.createMany({
        data: messages.map((m) => ({
          ticketId: attachTo.id,
          text: m.text,
          sender: m.sender,
          fromStaff: m.sender === MessageSender.STAFF,
          botnoiMid: m.mid,
          createdAt: m.sentAt,
        })),
        skipDuplicates: true,
      });
    } else {
      await prisma.botnoiChatEvent.createMany({
        data: messages.map((m) => ({
          projectId,
          sourceId,
          channel,
          sender: m.sender,
          text: m.text,
          mid: m.mid,
          sentAt: m.sentAt,
        })),
        skipDuplicates: true,
      });
      // ลบแชทพักเก่าของร้านนี้ที่ไม่เคยกลายเป็นใบงาน (ไม่เก็บข้อมูลลูกค้าไว้นานเกินจำเป็น)
      await prisma.botnoiChatEvent.deleteMany({
        where: { projectId, sentAt: { lt: new Date(now.getTime() - BUFFER_RETENTION_MS) } },
      });
    }

    res.json({
      success: true,
      stored: attachTo ? "ticket" : "buffer",
      count: messages.length,
      reviewSaved,
    });
  } catch (err) {
    next(err);
  }
}
