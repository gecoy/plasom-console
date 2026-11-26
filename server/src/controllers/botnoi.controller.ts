import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { MessageSender, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  buildCommentRequestMessage,
  pushMessages,
  REVIEW_POSTBACK_PREFIX,
  REVIEW_SKIP_COMMENT_PREFIX,
} from "../services/botnoi.service";

// ===========================
// POST /api/botnoi/events?token=<BOTNOI_EVENT_TOKEN>
// ตั้งเป็น "Event Subscribe URL" ใน Provider console ของ Botnoi
// รับ incoming_msg (ลูกค้าพิมพ์) และ msg_out (บอท/แอดมินตอบ) -> เก็บเป็นประวัติแชท
// และรับคะแนนรีวิวจากปุ่ม 1-5 ดาวที่ระบบส่งไปตอนปิดงาน
// ===========================

const ATTACH_COMPLETED_WINDOW_MS = 24 * 60 * 60 * 1000; // หลังปิดงาน 24 ชม. ยังเก็บแชทเข้าใบงานเดิม
const REVIEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // รับคะแนนแบบพิมพ์ตัวเลขภายใน 14 วัน
const COMMENT_WINDOW_MS = 30 * 60 * 1000; // รอคำติชมหลังให้ดาวไม่เกิน 30 นาที
const COMMENT_MAX_LENGTH = 1000;
const BUFFER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // แชทพักที่ไม่เคยเปิดใบงาน เก็บไม่เกิน 7 วัน

type BotnoiMessageObject = {
  mid?: string;
  type?: string;
  text?: string;
  timestamp?: number;
  postback?: { data?: string };
};

type BotnoiSourceObject = {
  source_id?: string;
  source_type?: string;
  source_channel?: string;
};

type BotnoiEvent = {
  event_type?: string;
  [extra: string]: unknown;
  bot_id?: string;
  chat_room_source?: BotnoiSourceObject;
  source?: BotnoiSourceObject; // บางช่องทาง (เช่น line_modular) อาจส่งเป็น source แทน
  sender?: { sender_type?: string; display_name?: string };
  message?: BotnoiMessageObject | BotnoiMessageObject[] | string;
  messages?: BotnoiMessageObject[] | BotnoiMessageObject | string;
};

const OUTGOING_EVENT_TYPES = new Set(["msg_out", "message_out", "bot_reply", "outgoing_msg"]);

function isOutgoing(event: BotnoiEvent): boolean {
  if (event.event_type && OUTGOING_EVENT_TYPES.has(event.event_type)) return true;
  const st = event.sender?.sender_type;
  return !event.event_type && (st === "bot" || st === "agent");
}

const SHAPE_VALUE_KEYS = new Set(["event_type", "sender_type", "source_type", "source_channel", "type"]);

/** โครงสร้าง JSON แบบไม่มีค่าจริง (เก็บค่าเฉพาะฟิลด์ประเภท เช่น event_type) กันข้อมูลลูกค้ารั่ว */
export function describeShape(value: unknown, key = "", depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    if (depth >= 5) return `array(${value.length})`;
    return [`array(${value.length})`, ...value.slice(0, 3).map((v) => describeShape(v, key, depth + 1))];
  }
  if (typeof value === "object") {
    if (depth >= 5) return "object";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      out[k] = describeShape(v, k, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") {
    return SHAPE_VALUE_KEYS.has(key) ? value.slice(0, 40) : `string(${value.length})`;
  }
  return typeof value;
}

/** จดโครงสร้าง event ลงฐานข้อมูล (ไว้ตรวจรูปแบบ event จริงของ Botnoi) ไม่ให้ล้มการทำงานหลัก */
async function logEventShape(event: BotnoiEvent, outcome: string): Promise<void> {
  try {
    const shape = describeShape(event) as object;
    console.log("[botnoi-event]", outcome, JSON.stringify(shape));
    await prisma.botnoiEventLog.create({ data: { outcome, shape } });
    await prisma.botnoiEventLog.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    });
  } catch (err) {
    console.error("⚠️ [Botnoi] จด log event ไม่สำเร็จ:", (err as Error).message);
  }
}

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

export function parseReviewSkip(data: string | null | undefined): string | null {
  if (!data) return null;
  const [prefix, trackingCode] = data.split(":");
  return prefix === REVIEW_SKIP_COMMENT_PREFIX && trackingCode ? trackingCode : null;
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
    if (parseReviewSkip(m.postback?.data)) return "ไม่มีคำติชมเพิ่มเติม";
    return m.text || `[กดปุ่ม] ${m.postback?.data ?? ""}`.trim();
  }
  if (m.text) return m.text;
  return NON_TEXT_LABELS[m.type ?? ""] ?? `[ข้อความประเภท ${m.type ?? "ไม่ทราบ"}]`;
}

function toItems(raw: unknown): BotnoiMessageObject[] {
  if (Array.isArray(raw)) return raw.filter((m) => m && typeof m === "object");
  if (raw && typeof raw === "object") return [raw as BotnoiMessageObject];
  if (typeof raw === "string" && raw.trim()) return [{ type: "text", text: raw }];
  return [];
}

export function parseBotnoiEvent(event: BotnoiEvent, now = new Date()): ParsedChatMessage[] {
  let sender: MessageSender;
  let items: BotnoiMessageObject[];

  if (event.event_type === "incoming_msg") {
    sender = MessageSender.CUSTOMER;
    items = toItems(event.message ?? event.messages);
  } else if (isOutgoing(event)) {
    sender = event.sender?.sender_type === "agent" ? MessageSender.STAFF : MessageSender.BOT;
    items = toItems(event.messages ?? event.message);
  } else {
    return [];
  }

  // Botnoi ใช้ mid เดียวกับข้อความลูกค้าที่บอทตอบกลับ จึงต้องแยก key ของข้อความขาออก ไม่ให้ชนกันตอนกันบันทึกซ้ำ
  const outgoing = sender !== MessageSender.CUSTOMER;
  return items
    .map((m, index) => ({
      mid: m.mid
        ? (outgoing ? `${String(m.mid)}:out:${index}` : String(m.mid)).slice(0, 200)
        : null,
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
    data: {
      projectId,
      ticketId: ticket.id,
      customerName: ticket.customerName,
      rating,
      comment: "",
      commentRequestedAt: new Date(),
    },
  });

  try {
    await pushMessages(
      source.botId,
      { source_channel: source.channel, source_type: "user", source_id: source.sourceId },
      [buildCommentRequestMessage(ticket.trackingCode, rating)]
    );
  } catch (err) {
    console.error("⚠️ [Botnoi] ส่งข้อความชวนเขียนคำติชมไม่สำเร็จ:", (err as Error).message);
  }
  return true;
}

async function replyQuietly(
  source: { botId: string; sourceId: string; channel: string },
  text: string
): Promise<void> {
  try {
    await pushMessages(
      source.botId,
      { source_channel: source.channel, source_type: "user", source_id: source.sourceId },
      [{ type: "text", text }]
    );
  } catch (err) {
    console.error("⚠️ [Botnoi] ส่งข้อความตอบกลับไม่สำเร็จ:", (err as Error).message);
  }
}

/**
 * ลูกค้าเพิ่งให้ดาว แล้วพิมพ์ข้อความถัดมา (ภายใน 30 นาที) = คำติชม
 * หรือกดปุ่ม "ไม่มีครับ" = ไม่รอคำติชมแล้ว
 */
async function handleReviewComment(
  projectId: string,
  message: ParsedChatMessage,
  source: { botId: string; sourceId: string; channel: string },
  now: Date
): Promise<"saved" | "skipped" | null> {
  const skipCode = parseReviewSkip(message.postbackData);
  const pending = await prisma.review.findFirst({
    where: {
      projectId,
      comment: "",
      commentRequestedAt: { gte: new Date(now.getTime() - COMMENT_WINDOW_MS) },
      ticket: {
        botnoiSourceId: source.sourceId,
        ...(skipCode ? { trackingCode: skipCode } : {}),
      },
    },
    select: { id: true },
    orderBy: { commentRequestedAt: "desc" },
  });
  if (!pending) return null;

  if (skipCode) {
    await prisma.review.update({ where: { id: pending.id }, data: { commentRequestedAt: null } });
    await replyQuietly(source, "รับทราบครับ ขอบคุณที่ใช้บริการนะครับ 🙏");
    return "skipped";
  }

  // ไม่นับปุ่มอื่น ๆ / สติกเกอร์ / รูปภาพ เป็นคำติชม
  if (message.postbackData || message.text.startsWith("[")) return null;
  const comment = message.text.trim().slice(0, COMMENT_MAX_LENGTH);
  if (!comment) return null;

  await prisma.review.update({
    where: { id: pending.id },
    data: { comment, commentRequestedAt: null },
  });
  await replyQuietly(source, "ขอบคุณสำหรับคำติชมครับ 🙏 ทางร้านจะนำไปปรับปรุงบริการให้ดียิ่งขึ้น");
  return "saved";
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
    const source = event.chat_room_source ?? event.source;
    const sourceId = source?.source_id;
    const channel = source?.source_channel || "line";
    const sourceType = source?.source_type || "user";

    // ตอบ 200 กับ event ที่ไม่เกี่ยวข้อง เพื่อไม่ให้ Botnoi มองว่าส่งไม่สำเร็จ
    if (!sourceId || sourceType !== "user") {
      await logEventShape(event, "unsupported_source");
      res.json({ success: true, ignored: "unsupported_source" });
      return;
    }

    const messages = parseBotnoiEvent(event);
    if (messages.length === 0) {
      await logEventShape(event, "no_messages");
      res.json({ success: true, ignored: "no_messages" });
      return;
    }

    // หาร้านจาก bot_id ก่อน ถ้า event ไม่มี bot_id (เช่นข้อความขาออกบางช่องทาง) ให้หาจากห้องแชทที่เคยผูกไว้
    let project: { id: string } | null = botId
      ? await prisma.project.findFirst({ where: { botnoiBotId: botId }, select: { id: true } })
      : null;
    let resolvedBotId = botId;
    if (!project) {
      const known =
        (await prisma.ticket.findFirst({
          where: { botnoiSourceId: sourceId },
          select: { project: { select: { id: true, botnoiBotId: true } } },
          orderBy: { createdAt: "desc" },
        }))?.project ??
        (await prisma.botnoiChatEvent.findFirst({
          where: { sourceId },
          select: { project: { select: { id: true, botnoiBotId: true } } },
          orderBy: { sentAt: "desc" },
        }))?.project ??
        null;
      if (known && (!botId || known.botnoiBotId === botId)) {
        project = { id: known.id };
        resolvedBotId = known.botnoiBotId ?? botId;
      }
    }
    if (!project) {
      await logEventShape(event, "unknown_bot");
      res.json({ success: true, ignored: "unknown_bot" });
      return;
    }
    const projectId = project.id;
    const now = new Date();

    // ---------- รีวิว ----------
    let reviewSaved = false;
    let commentResult: "saved" | "skipped" | null = null;
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
            botId: resolvedBotId ?? "",
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
          reviewSaved = await saveReview(projectId, ticket, typed, { botId: resolvedBotId ?? "", sourceId, channel });
        }
      }

      if (!reviewSaved && !fromButton) {
        commentResult = await handleReviewComment(
          projectId,
          messages[0],
          { botId: resolvedBotId ?? "", sourceId, channel },
          now
        );
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
          customerName:
            m.sender === MessageSender.CUSTOMER && event.sender?.display_name
              ? String(event.sender.display_name).slice(0, 100)
              : null,
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

    await logEventShape(event, attachTo ? "stored_ticket" : "stored_buffer");
    res.json({
      success: true,
      stored: attachTo ? "ticket" : "buffer",
      count: messages.length,
      reviewSaved,
      ...(commentResult ? { reviewComment: commentResult } : {}),
    });
  } catch (err) {
    next(err);
  }
}
