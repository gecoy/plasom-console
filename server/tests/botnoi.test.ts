import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleBotnoiEvent,
  parseBotnoiEvent,
  parseReviewPostback,
  parseTypedRating,
} from "../src/controllers/botnoi.controller";
import { buildReviewRequestMessage } from "../src/services/botnoi.service";
import { linkBotnoiChatToTicket, requestReviewForTicket } from "../src/lib/botnoiChat";
import { mockRes, stubPrisma } from "./helpers";

process.env.BOTNOI_EVENT_TOKEN = "test-event-token";

function nextSpy() {
  const calls: unknown[] = [];
  const fn = (err?: unknown) => calls.push(err);
  return Object.assign(fn, { calls });
}

const incoming = (text: string, extra: Record<string, unknown> = {}) => ({
  event_type: "incoming_msg",
  bot_id: "bot-1",
  chat_room_source: { source_id: "U-cust", source_type: "user", source_channel: "line" },
  sender: { sender_type: "user" },
  message: { mid: "m-1", type: "text", text, timestamp: 1764120000000, ...extra },
});

test("parseBotnoiEvent: แยกข้อความลูกค้าและบอท", () => {
  const cust = parseBotnoiEvent(incoming("แอร์ไม่เย็นครับ") as any);
  assert.equal(cust.length, 1);
  assert.equal(cust[0].sender, "CUSTOMER");
  assert.equal(cust[0].text, "แอร์ไม่เย็นครับ");
  assert.equal(cust[0].sentAt.getTime(), 1764120000000);

  const bot = parseBotnoiEvent({
    event_type: "msg_out",
    sender: { sender_type: "bot" },
    messages: [
      { mid: "b1", type: "text", text: "ขอชื่อด้วยครับ" },
      { mid: "b2", type: "image" },
    ],
  } as any);
  assert.deepEqual(
    bot.map((m) => [m.sender, m.text]),
    [
      ["BOT", "ขอชื่อด้วยครับ"],
      ["BOT", "[รูปภาพ]"],
    ]
  );

  const agent = parseBotnoiEvent({
    event_type: "msg_out",
    sender: { sender_type: "agent" },
    messages: [{ type: "text", text: "แอดมินรับเรื่องครับ" }],
  } as any);
  assert.equal(agent[0].sender, "STAFF");

  assert.equal(parseBotnoiEvent({ event_type: "dialogue" } as any).length, 0);
});

test("parseReviewPostback / parseTypedRating", () => {
  assert.deepEqual(parseReviewPostback("plasom_review:CC-20261126-AB12:5"), {
    trackingCode: "CC-20261126-AB12",
    rating: 5,
  });
  assert.equal(parseReviewPostback("plasom_review:CC-1:9"), null);
  assert.equal(parseReviewPostback("other:CC-1:5"), null);
  assert.equal(parseTypedRating("4"), 4);
  assert.equal(parseTypedRating(" 5 ดาว "), 5);
  assert.equal(parseTypedRating("⭐⭐⭐"), 3);
  assert.equal(parseTypedRating("บ้านเลขที่ 5"), null);
  assert.equal(parseTypedRating("0812345678"), null);
});

test("buildReviewRequestMessage: ปุ่ม 5 ตัวเลือก ใส่รหัสใบงานใน postback", () => {
  const msg = buildReviewRequestMessage("CC-20261126-AB12") as any;
  assert.equal(msg.type, "quick_reply");
  assert.equal(msg.quick_reply_choices.length, 5);
  assert.equal(msg.quick_reply_choices[0].data, "plasom_review:CC-20261126-AB12:5");
  assert.ok(msg.quick_reply_choices.every((c: any) => c.label.length <= 20));
});

test("handleBotnoiEvent: token ผิดได้ 401", async () => {
  const res = mockRes();
  await handleBotnoiEvent({ query: { token: "wrong" }, header: () => undefined, body: {} } as any, res, nextSpy() as any);
  assert.equal(res.statusCode, 401);
});

test("handleBotnoiEvent: bot ที่ไม่รู้จัก ตอบ 200 แบบ ignored", async () => {
  const restore = stubPrisma({ project: { findFirst: async () => null } });
  try {
    const res = mockRes();
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body: incoming("สวัสดี") } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ignored, "unknown_bot");
  } finally {
    restore();
  }
});

test("handleBotnoiEvent: ยังไม่มีใบงาน -> พักแชทไว้ใน BotnoiChatEvent", async () => {
  let buffered: any;
  const restore = stubPrisma({
    project: { findFirst: async () => ({ id: "p1" }) },
    ticket: { findFirst: async () => null },
    botnoiChatEvent: {
      createMany: async (args: any) => {
        buffered = args;
        return { count: 1 };
      },
    },
  });
  try {
    const res = mockRes();
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body: incoming("แอร์ไม่เย็น") } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.stored, "buffer");
    assert.equal(buffered.data[0].projectId, "p1");
    assert.equal(buffered.data[0].sourceId, "U-cust");
    assert.equal(buffered.data[0].mid, "m-1");
    assert.equal(buffered.skipDuplicates, true);
  } finally {
    restore();
  }
});

test("handleBotnoiEvent: มีใบงานที่ยังเปิดอยู่ -> บันทึกเข้า Message ของใบงาน", async () => {
  let saved: any;
  const restore = stubPrisma({
    project: { findFirst: async () => ({ id: "p1" }) },
    ticket: {
      findFirst: async () => ({ id: "t1", status: "SUBMITTED", updatedAt: new Date() }),
    },
    message: {
      createMany: async (args: any) => {
        saved = args;
        return { count: 1 };
      },
    },
  });
  try {
    const res = mockRes();
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body: incoming("ช่างมากี่โมงครับ") } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.stored, "ticket");
    assert.equal(saved.data[0].ticketId, "t1");
    assert.equal(saved.data[0].sender, "CUSTOMER");
    assert.equal(saved.data[0].botnoiMid, "m-1");
  } finally {
    restore();
  }
});

test("handleBotnoiEvent: กดปุ่มดาว -> สร้างรีวิวของใบงานที่ปิดแล้ว", async () => {
  let reviewData: any;
  const savedToken = process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  delete process.env.BOTNOI_CHANNEL_ACCESS_TOKEN; // ข้อความขอบคุณจะล้มแบบเงียบ ไม่กระทบรีวิว
  const restore = stubPrisma({
    project: { findFirst: async () => ({ id: "p1" }) },
    ticket: {
      findFirst: async (args: any) =>
        args.where.trackingCode
          ? { id: "t1", customerName: "ลูกค้า", trackingCode: "CC-20261126-AB12" }
          : { id: "t1", status: "COMPLETED", updatedAt: new Date() },
    },
    review: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        reviewData = data;
        return { id: "r1", ...data };
      },
    },
    message: { createMany: async () => ({ count: 1 }) },
  });
  try {
    const res = mockRes();
    const body = incoming("", {
      type: "postback",
      text: undefined,
      postback: { data: "plasom_review:CC-20261126-AB12:4" },
    });
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.reviewSaved, true);
    assert.equal(reviewData.rating, 4);
    assert.equal(reviewData.ticketId, "t1");
    assert.equal(reviewData.projectId, "p1");
  } finally {
    restore();
    if (savedToken) process.env.BOTNOI_CHANNEL_ACCESS_TOKEN = savedToken;
  }
});

test("linkBotnoiChatToTicket: จับห้องแชทจากเบอร์โทรแล้วย้ายแชทที่พักไว้", async () => {
  let ticketUpdate: any;
  let moved: any;
  let deleted: any;
  const tx = {
    ticket: { update: async (args: any) => (ticketUpdate = args) },
    botnoiChatEvent: {
      findMany: async () => [
        { text: "แอร์ไม่เย็น", sender: "CUSTOMER", mid: "m1", sentAt: new Date(1) },
        { text: "ขอเบอร์ครับ", sender: "BOT", mid: "m2", sentAt: new Date(2) },
      ],
      deleteMany: async (args: any) => (deleted = args),
    },
    message: { createMany: async (args: any) => (moved = args) },
  };
  const restore = stubPrisma({
    botnoiChatEvent: {
      findMany: async () => [
        { sourceId: "U-other", channel: "line", text: "สวัสดี" },
        { sourceId: "U-cust", channel: "line", text: "เบอร์ 081-234-5678 ครับ" },
      ],
    },
    $transaction: async (fn: any) => fn(tx),
  });
  try {
    const result = await linkBotnoiChatToTicket(
      "p1",
      { id: "t1", customerPhone: "0812345678", extraFields: {} },
      true
    );
    assert.deepEqual(result, { sourceId: "U-cust", moved: 2 });
    assert.equal(ticketUpdate.data.botnoiSourceId, "U-cust");
    assert.equal(moved.data.length, 2);
    assert.equal(moved.data[1].sender, "BOT");
    assert.equal(deleted.where.projectId, "p1");
  } finally {
    restore();
  }
});

test("linkBotnoiChatToTicket: ไม่มีเบอร์และมีหลายห้องคุยอยู่ -> ไม่เดา", async () => {
  const restore = stubPrisma({
    botnoiChatEvent: {
      findMany: async () => [
        { sourceId: "U-a", channel: "line" },
        { sourceId: "U-b", channel: "line" },
      ],
    },
  });
  try {
    const result = await linkBotnoiChatToTicket(
      "p1",
      { id: "t1", customerPhone: "0800000000", extraFields: {} },
      false
    );
    assert.equal(result, null);
  } finally {
    restore();
  }
});

test("requestReviewForTicket: ไม่มี token -> not_configured และไม่เรียก DB", async () => {
  const savedToken = process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  delete process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  try {
    assert.equal(await requestReviewForTicket("t1"), "not_configured");
  } finally {
    if (savedToken) process.env.BOTNOI_CHANNEL_ACCESS_TOKEN = savedToken;
  }
});

test("requestReviewForTicket: ส่ง quick reply เข้าห้องแชทแล้วบันทึกเวลา", async () => {
  process.env.BOTNOI_CHANNEL_ACCESS_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let sentBody: any;
  let sentAuth: string | undefined;
  globalThis.fetch = (async (_url: string, init: any) => {
    sentBody = JSON.parse(init.body);
    sentAuth = init.headers.Authorization;
    return new Response("{}", { status: 200 });
  }) as any;
  let updated: any;
  const restore = stubPrisma({
    ticket: {
      findUnique: async () => ({
        id: "t1",
        trackingCode: "CC-20261126-AB12",
        status: "COMPLETED",
        botnoiSourceId: "U-cust",
        botnoiChannel: "line",
        reviewRequestedAt: null,
        review: null,
        project: { botnoiBotId: "bot-1", features: { collectCsat: true } },
      }),
      update: async (args: any) => (updated = args),
    },
  });
  try {
    assert.equal(await requestReviewForTicket("t1"), "sent");
    assert.equal(sentAuth, "Bearer test-token");
    assert.equal(sentBody.bot_id, "bot-1");
    assert.equal(sentBody.source.source_id, "U-cust");
    assert.equal(sentBody.messages[0].type, "quick_reply");
    assert.ok(updated.data.reviewRequestedAt instanceof Date);
  } finally {
    restore();
    globalThis.fetch = originalFetch;
    delete process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  }
});
