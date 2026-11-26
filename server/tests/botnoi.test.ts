import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeShape,
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

  // ไม่มี event_type แต่ sender เป็น bot -> นับเป็นข้อความบอท
  const noType = parseBotnoiEvent({
    sender: { sender_type: "bot" },
    messages: [{ type: "text", text: "รับเรื่องแล้วครับ" }],
  } as any);
  assert.equal(noType[0]?.sender, "BOT");
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
  const restore = stubPrisma({
    project: { findFirst: async () => null },
    ticket: { findFirst: async () => null },
    botnoiChatEvent: { findFirst: async () => null },
    botnoiEventLog: { create: async () => ({}), deleteMany: async () => ({ count: 0 }) },
  });
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
  let pruned: any;
  const restore = stubPrisma({
    project: { findFirst: async () => ({ id: "p1" }) },
    ticket: { findFirst: async () => null },
    review: { findFirst: async () => null },
    botnoiChatEvent: {
      createMany: async (args: any) => {
        buffered = args;
        return { count: 1 };
      },
      deleteMany: async (args: any) => {
        pruned = args;
        return { count: 0 };
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
    assert.equal(pruned.where.projectId, "p1");
    assert.ok(pruned.where.sentAt.lt instanceof Date);
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
    review: { findFirst: async () => null },
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
        { sourceId: "U-other", channel: "line", text: "สวัสดี", sentAt: new Date(2) },
        { sourceId: "U-cust", channel: "line", text: "เบอร์ 081-234-5678 ครับ", sentAt: new Date(1) },
      ],
    },
    message: { findMany: async () => [] },
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
    message: { findMany: async () => [] },
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

test("describeShape: เก็บแค่โครงสร้าง ไม่เก็บข้อความหรือเบอร์ลูกค้า", () => {
  const shape = describeShape({
    event_type: "msg_out",
    chat_room_source: { source_id: "U-secret", source_channel: "line_modular" },
    messages: [{ type: "text", text: "เบอร์ 0812345678" }],
  }) as any;
  assert.equal(shape.event_type, "msg_out");
  assert.equal(shape.chat_room_source.source_channel, "line_modular");
  assert.equal(shape.chat_room_source.source_id, "string(8)");
  assert.equal(shape.messages[0], "array(1)");
  assert.equal(shape.messages[1].type, "text");
  assert.match(shape.messages[1].text, /^string\(\d+\)$/);
  assert.ok(!JSON.stringify(shape).includes("0812345678"));
});

test("handleBotnoiEvent: ข้อความบอทที่ไม่มี bot_id -> หาร้านจากห้องแชทที่ผูกใบงานไว้", async () => {
  let saved: any;
  const restore = stubPrisma({
    project: { findFirst: async () => null },
    ticket: {
      findFirst: async (args: any) =>
        args.select?.project
          ? { project: { id: "p1", botnoiBotId: "bot-1" } }
          : { id: "t1", status: "SUBMITTED", updatedAt: new Date() },
    },
    message: {
      createMany: async (args: any) => {
        saved = args;
        return { count: 1 };
      },
    },
    botnoiEventLog: { create: async () => ({}), deleteMany: async () => ({ count: 0 }) },
  });
  try {
    const res = mockRes();
    await handleBotnoiEvent(
      {
        query: { token: "test-event-token" },
        header: () => undefined,
        body: {
          event_type: "msg_out",
          chat_room_source: { source_id: "U-cust", source_type: "user", source_channel: "line_modular" },
          sender: { sender_type: "bot" },
          messages: { type: "text", text: "รับเรื่องแล้วครับ" },
        },
      } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.stored, "ticket");
    assert.equal(saved.data[0].sender, "BOT");
    assert.equal(saved.data[0].text, "รับเรื่องแล้วครับ");
  } finally {
    restore();
  }
});

test("parseBotnoiEvent: ข้อความบอทที่ใช้ mid เดียวกับข้อความลูกค้า ต้องได้ key ไม่ชนกัน", () => {
  const cust = parseBotnoiEvent(incoming("Hi") as any);
  const bot = parseBotnoiEvent({
    event_type: "msg_out",
    sender: { sender_type: "bot" },
    messages: [
      { mid: "m-1", type: "text", text: "สวัสดีครับ" },
      { mid: "m-1", type: "text", text: "แจ้งซ่อมอะไรดีครับ" },
    ],
  } as any);
  assert.equal(cust[0].mid, "m-1");
  assert.deepEqual(bot.map((m) => m.mid), ["m-1:out:0", "m-1:out:1"]);
});

test("getProjectConversations: รวมแชทที่ยังไม่เปิดใบงาน + ตอบ changed:false เมื่อ version เดิม", async () => {
  const { getProjectConversations } = await import("../src/controllers/project.controller");
  const t0 = new Date("2026-11-26T09:00:00Z");
  const t1 = new Date("2026-11-26T09:05:00Z");
  const restore = stubPrisma({
    project: { findFirst: async () => ({ id: "p1" }) },
    message: { aggregate: async () => ({ _max: { createdAt: t0 }, _count: { _all: 2 } }) },
    ticket: {
      aggregate: async () => ({ _max: { updatedAt: t0 }, _count: { _all: 1 } }),
      findMany: async () => [
        {
          id: "t1",
          trackingCode: "CC-1",
          customerName: "ลูกค้าเก่า",
          brand: null,
          symptom: "",
          extraFields: {},
          createdAt: t0,
          updatedAt: t0,
          messages: [{ id: "m1", text: "hi", sender: "CUSTOMER", fromStaff: false, createdAt: t0 }],
        },
      ],
    },
    botnoiChatEvent: {
      aggregate: async () => ({ _max: { createdAt: t1 }, _count: { _all: 2 } }),
      findMany: async () => [
        { id: "e1", sourceId: "U-new", sender: "CUSTOMER", text: "สวัสดี", customerName: "น้องใหม่", sentAt: t1 },
        { id: "e2", sourceId: "U-new", sender: "BOT", text: "สวัสดีครับ", customerName: null, sentAt: t1 },
      ],
    },
  });
  try {
    const res = mockRes();
    const req: any = { user: { id: "u1" }, params: { projectId: "p1" }, query: {} };
    await getProjectConversations(req, res, nextSpy() as any);
    assert.equal(res.body.changed, true);
    assert.equal(res.body.data.length, 2);
    const pending = res.body.data[0];
    assert.equal(pending.pending, true);
    assert.equal(pending.customerName, "น้องใหม่");
    assert.equal(pending.trackingCode, null);
    assert.ok(!pending.id.includes("U-new"), "ไม่ส่ง LINE user id จริงออกไป");
    assert.deepEqual(pending.messages.map((m: any) => m.sender), ["CUSTOMER", "BOT"]);

    const res2 = mockRes();
    await getProjectConversations({ ...req, query: { version: res.body.version } }, res2, nextSpy() as any);
    assert.equal(res2.body.changed, false);
    assert.equal(res2.body.data, undefined);
  } finally {
    restore();
  }
});

function commentTestStubs(pending: { id: string } | null, updates: any[]) {
  return stubPrisma({
    project: { findFirst: async () => ({ id: "p1" }) },
    ticket: {
      findFirst: async (args: any) =>
        args.where?.review === null ? null : { id: "t1", status: "COMPLETED", updatedAt: new Date() },
    },
    review: {
      findFirst: async () => pending,
      update: async (args: any) => {
        updates.push(args);
        return {};
      },
    },
    message: { createMany: async () => ({ count: 1 }) },
    botnoiEventLog: { create: async () => ({}), deleteMany: async () => ({ count: 0 }) },
  });
}

test("handleBotnoiEvent: พิมพ์หลังให้ดาว -> บันทึกเป็นคำติชม", async () => {
  const savedToken = process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  delete process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  const updates: any[] = [];
  const restore = commentTestStubs({ id: "r1" }, updates);
  try {
    const res = mockRes();
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body: incoming("ช่างสุภาพมาก มาตรงเวลา") } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.reviewComment, "saved");
    assert.equal(updates[0].where.id, "r1");
    assert.equal(updates[0].data.comment, "ช่างสุภาพมาก มาตรงเวลา");
    assert.equal(updates[0].data.commentRequestedAt, null);
  } finally {
    restore();
    if (savedToken) process.env.BOTNOI_CHANNEL_ACCESS_TOKEN = savedToken;
  }
});

test("handleBotnoiEvent: กดปุ่ม ไม่มีครับ -> ไม่รอคำติชมแล้ว และไม่บันทึกข้อความเป็นคำติชม", async () => {
  const savedToken = process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  delete process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  const updates: any[] = [];
  const restore = commentTestStubs({ id: "r1" }, updates);
  try {
    const res = mockRes();
    const body = incoming("", {
      type: "postback",
      text: undefined,
      postback: { data: "plasom_review_skip:CC-20261126-AB12" },
    });
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.reviewComment, "skipped");
    assert.equal(updates[0].data.commentRequestedAt, null);
    assert.equal(updates[0].data.comment, undefined);
  } finally {
    restore();
    if (savedToken) process.env.BOTNOI_CHANNEL_ACCESS_TOKEN = savedToken;
  }
});

test("handleBotnoiEvent: ไม่มีรีวิวที่รอคำติชม -> ข้อความปกติไม่ถูกนับเป็นคำติชม", async () => {
  const updates: any[] = [];
  const restore = commentTestStubs(null, updates);
  try {
    const res = mockRes();
    await handleBotnoiEvent(
      { query: { token: "test-event-token" }, header: () => undefined, body: incoming("แอร์เสียอีกแล้วครับ") } as any,
      res,
      nextSpy() as any
    );
    assert.equal(res.body.reviewComment, undefined);
    assert.equal(updates.length, 0);
  } finally {
    restore();
  }
});

test("buildCommentRequestMessage: มีปุ่มข้ามที่ผูกรหัสใบงาน", async () => {
  const { buildCommentRequestMessage } = await import("../src/services/botnoi.service");
  const msg = buildCommentRequestMessage("CC-20261126-AB12", 5) as any;
  assert.equal(msg.type, "quick_reply");
  assert.match(msg.text, /5 ดาว/);
  assert.equal(msg.quick_reply_choices[0].data, "plasom_review_skip:CC-20261126-AB12");
});

test("linkBotnoiChatToTicket: ลูกค้าที่มีใบงานเก่าเปิดอยู่ แจ้งซ่อมเพิ่ม -> หาห้องจากแชทในใบงานเก่า", async () => {
  let ticketUpdate: any;
  const tx = {
    ticket: { update: async (args: any) => (ticketUpdate = args) },
    botnoiChatEvent: { findMany: async () => [], deleteMany: async () => ({ count: 0 }) },
    message: { createMany: async () => ({ count: 0 }) },
  };
  const restore = stubPrisma({
    botnoiChatEvent: { findMany: async () => [] },
    message: {
      findMany: async (args: any) =>
        args.select?.text
          ? [
              {
                text: "เบอร์ 0812345678",
                createdAt: new Date(5),
                ticket: { botnoiSourceId: "U-old", botnoiChannel: "line_modular" },
              },
            ]
          : [],
    },
    $transaction: async (fn: any) => fn(tx),
  });
  try {
    const result = await linkBotnoiChatToTicket(
      "p1",
      { id: "t-new", customerPhone: "0812345678", extraFields: {} },
      true
    );
    assert.equal(result?.sourceId, "U-old");
    assert.equal(ticketUpdate.data.botnoiSourceId, "U-old");
    assert.equal(ticketUpdate.data.botnoiChannel, "line_modular");
  } finally {
    restore();
  }
});

test("linkBotnoiChatToTicket: ไม่เจอเบอร์ในแชท แต่ใบงานเก่าเบอร์เดียวกันผูกห้องไว้ -> ใช้ห้องเดิม", async () => {
  let ticketUpdate: any;
  const tx = {
    ticket: { update: async (args: any) => (ticketUpdate = args) },
    botnoiChatEvent: { findMany: async () => [], deleteMany: async () => ({ count: 0 }) },
    message: { createMany: async () => ({ count: 0 }) },
  };
  const restore = stubPrisma({
    botnoiChatEvent: { findMany: async () => [] },
    message: { findMany: async () => [] },
    ticket: { findFirst: async () => ({ botnoiSourceId: "U-prev", botnoiChannel: "line" }) },
    $transaction: async (fn: any) => fn(tx),
  });
  try {
    const result = await linkBotnoiChatToTicket(
      "p1",
      { id: "t-new", customerPhone: "0812345678", extraFields: {} },
      true
    );
    assert.equal(result?.sourceId, "U-prev");
    assert.equal(ticketUpdate.data.botnoiSourceId, "U-prev");
  } finally {
    restore();
  }
});

test("Botnoi webhook เปิดใบงาน: extra_fields เป็นข้อความว่าง (ตัวแปรไม่มีค่า) ยังเปิดใบงานได้", async () => {
  const { createProjectTicketFromBotnoi } = await import("../src/controllers/ticket.controller");
  const { createHash } = await import("crypto");
  const secret = "s3cret-for-test";
  let createdData: any;
  const restore = stubPrisma({
    project: {
      findUnique: async () => ({ id: "p1", webhookSecretHash: createHash("sha256").update(secret).digest("hex") }),
    },
    ticket: { findUnique: async () => null, findFirst: async () => null },
    botnoiChatEvent: { findMany: async () => [] },
    message: { findMany: async () => [] },
    $transaction: async (callback: any) =>
      callback({
        ticket: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "t1", ...data };
          },
        },
        statusLog: { create: async () => ({}) },
      }),
  });
  try {
    const res = mockRes();
    const next = nextSpy();
    await createProjectTicketFromBotnoi(
      {
        params: { projectId: "p1" },
        header: (k: string) => (k.toLowerCase() === "x-webhook-secret" ? secret : undefined),
        body: {
          customer_name: "ทดสอบ",
          phone: "0812345678",
          info: "แอร์ | ไม่เย็น | บ้าน",
          date: "",
          ticket: "",
          extra_fields: "",
        },
      } as any,
      res,
      next as any
    );
    assert.deepEqual(next.calls, []);
    assert.equal(res.body?.success, true);
    assert.deepEqual(createdData.extraFields, {});
  } finally {
    restore();
  }
});
