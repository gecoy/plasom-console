import { MessageSender, Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "./prisma";
import {
  buildReviewRequestMessage,
  isBotnoiConfigured,
  pushMessages,
} from "../services/botnoi.service";

// ===========================
// ผูกห้องแชท Botnoi เข้ากับใบงาน + ย้ายแชทที่พักไว้เข้าตาราง Message
// ===========================

const PHONE_LOOKBACK_MS = 3 * 60 * 60 * 1000; // หาเบอร์ในแชทย้อนหลัง 3 ชม.
const ACTIVE_FALLBACK_MS = 15 * 60 * 1000; // ถ้าไม่มีเบอร์ ใช้ห้องที่คุยอยู่ห้องเดียวใน 15 นาที
const MOVE_LOOKBACK_MS = 24 * 60 * 60 * 1000; // ย้ายแชทย้อนหลังไม่เกิน 24 ชม.
const BUFFER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // ลบแชทพักที่ไม่ได้ผูกเกิน 7 วัน

type LinkableTicket = {
  id: string;
  customerPhone: string;
  extraFields: Prisma.JsonValue;
};

/** หา source_id (ห้องแชทลูกค้า) ที่น่าจะเป็นเจ้าของใบงานนี้ */
export async function findSourceForTicket(
  projectId: string,
  ticket: LinkableTicket,
  hasRealPhone: boolean,
  now = new Date()
): Promise<{ sourceId: string; channel: string } | null> {
  // 1. บอทส่ง source id มาเองใน extra_fields
  const extra = (ticket.extraFields ?? {}) as Record<string, unknown>;
  const explicit = typeof extra.botnoi_source_id === "string" ? extra.botnoi_source_id.trim() : "";
  if (explicit) {
    const known = await prisma.botnoiChatEvent.findFirst({
      where: { projectId, sourceId: explicit },
      select: { channel: true },
      orderBy: { sentAt: "desc" },
    });
    return { sourceId: explicit, channel: known?.channel ?? "line" };
  }

  // 2. ลูกค้าพิมพ์เบอร์เดียวกับในใบงานไว้ในแชท
  //    ดูทั้งแชทที่พักไว้ และแชทที่ถูกบันทึกเข้าใบงานเก่าของลูกค้าคนเดิม (ลูกค้าที่มีใบงานเปิดอยู่แล้วแจ้งซ่อมเพิ่ม)
  if (hasRealPhone) {
    const since = new Date(now.getTime() - PHONE_LOOKBACK_MS);
    const [buffered, attached] = await Promise.all([
      prisma.botnoiChatEvent.findMany({
        where: { projectId, sender: MessageSender.CUSTOMER, sentAt: { gte: since } },
        select: { sourceId: true, channel: true, text: true, sentAt: true },
        orderBy: { sentAt: "desc" },
        take: 300,
      }),
      prisma.message.findMany({
        where: {
          sender: MessageSender.CUSTOMER,
          createdAt: { gte: since },
          ticket: { projectId, botnoiSourceId: { not: null }, id: { not: ticket.id } },
        },
        select: {
          text: true,
          createdAt: true,
          ticket: { select: { botnoiSourceId: true, botnoiChannel: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);
    const candidates = [
      ...buffered.map((e) => ({ sourceId: e.sourceId, channel: e.channel, text: e.text, at: e.sentAt })),
      ...attached.map((m) => ({
        sourceId: m.ticket.botnoiSourceId as string,
        channel: m.ticket.botnoiChannel ?? "line",
        text: m.text,
        at: m.createdAt,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
    const hit = candidates.find((c) => c.text.replace(/\D/g, "").includes(ticket.customerPhone));
    if (hit) return { sourceId: hit.sourceId, channel: hit.channel };

    // 2b. ลูกค้าเบอร์เดียวกันเคยแจ้งซ่อมผ่านบอทมาก่อน -> ห้องแชทเดิม
    const previous = await prisma.ticket.findFirst({
      where: {
        projectId,
        customerPhone: ticket.customerPhone,
        botnoiSourceId: { not: null },
        id: { not: ticket.id },
      },
      select: { botnoiSourceId: true, botnoiChannel: true },
      orderBy: { createdAt: "desc" },
    });
    if (previous?.botnoiSourceId) {
      return { sourceId: previous.botnoiSourceId, channel: previous.botnoiChannel ?? "line" };
    }
  }

  // 3. มีลูกค้าคุยกับบอทอยู่ห้องเดียวในช่วงนี้ (ถ้ามีหลายห้องจะไม่เดา กันผูกผิดคน)
  const activeSince = new Date(now.getTime() - ACTIVE_FALLBACK_MS);
  const [activeBuffered, activeAttached] = await Promise.all([
    prisma.botnoiChatEvent.findMany({
      where: { projectId, sender: MessageSender.CUSTOMER, sentAt: { gte: activeSince } },
      select: { sourceId: true, channel: true },
      distinct: ["sourceId"],
      take: 2,
    }),
    prisma.message.findMany({
      where: {
        sender: MessageSender.CUSTOMER,
        createdAt: { gte: activeSince },
        ticket: { projectId, botnoiSourceId: { not: null }, id: { not: ticket.id } },
      },
      select: { ticket: { select: { botnoiSourceId: true, botnoiChannel: true } } },
      take: 50,
    }),
  ]);
  const activeSources = new Map<string, string>();
  for (const e of activeBuffered) activeSources.set(e.sourceId, e.channel);
  for (const m of activeAttached) {
    if (m.ticket.botnoiSourceId) activeSources.set(m.ticket.botnoiSourceId, m.ticket.botnoiChannel ?? "line");
  }
  if (activeSources.size === 1) {
    const [[sourceId, channel]] = [...activeSources.entries()];
    return { sourceId, channel };
  }

  return null;
}

/** ผูกใบงานกับห้องแชท แล้วย้ายแชทที่พักไว้เข้าใบงาน คืนจำนวนข้อความที่ย้าย */
export async function linkBotnoiChatToTicket(
  projectId: string,
  ticket: LinkableTicket,
  hasRealPhone: boolean,
  now = new Date()
): Promise<{ sourceId: string; moved: number } | null> {
  const source = await findSourceForTicket(projectId, ticket, hasRealPhone, now);
  if (!source) return null;

  const moved = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { botnoiSourceId: source.sourceId, botnoiChannel: source.channel },
    });

    const buffered = await tx.botnoiChatEvent.findMany({
      where: {
        projectId,
        sourceId: source.sourceId,
        sentAt: { gte: new Date(now.getTime() - MOVE_LOOKBACK_MS) },
      },
      orderBy: { sentAt: "asc" },
    });

    if (buffered.length > 0) {
      await tx.message.createMany({
        data: buffered.map((e) => ({
          ticketId: ticket.id,
          text: e.text,
          sender: e.sender,
          fromStaff: e.sender === MessageSender.STAFF,
          botnoiMid: e.mid,
          createdAt: e.sentAt,
        })),
        skipDuplicates: true,
      });
    }

    await tx.botnoiChatEvent.deleteMany({
      where: {
        projectId,
        OR: [
          { sourceId: source.sourceId },
          { createdAt: { lt: new Date(now.getTime() - BUFFER_RETENTION_MS) } },
        ],
      },
    });

    return buffered.length;
  });

  return { sourceId: source.sourceId, moved };
}

// ===========================
// ส่งข้อความขอรีวิวหลังปิดงาน
// ===========================

export type ReviewRequestResult =
  | "sent"
  | "not_configured"
  | "no_chat"
  | "disabled"
  | "already_requested"
  | "already_reviewed";

export async function requestReviewForTicket(ticketId: string): Promise<ReviewRequestResult> {
  if (!isBotnoiConfigured()) return "not_configured";

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      botnoiSourceId: true,
      botnoiChannel: true,
      reviewRequestedAt: true,
      review: { select: { id: true } },
      project: { select: { botnoiBotId: true, features: true } },
    },
  });
  if (!ticket || ticket.status !== TicketStatus.COMPLETED) return "no_chat";
  if (ticket.review) return "already_reviewed";
  if (ticket.reviewRequestedAt) return "already_requested";
  if (!ticket.botnoiSourceId || !ticket.project?.botnoiBotId) return "no_chat";

  const features = (ticket.project.features ?? {}) as Record<string, unknown>;
  if (features.collectCsat === false) return "disabled";

  await pushMessages(
    ticket.project.botnoiBotId,
    {
      source_channel: ticket.botnoiChannel || "line",
      source_type: "user",
      source_id: ticket.botnoiSourceId,
    },
    [buildReviewRequestMessage(ticket.trackingCode)]
  );

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { reviewRequestedAt: new Date() },
  });
  return "sent";
}
