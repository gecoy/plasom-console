// ===========================
// Botnoi Developer Platform API client
// เอกสาร: https://developers.botnoi.ai
// ใช้ Channel Access Token ของ Provider "Plasom Console" (env BOTNOI_CHANNEL_ACCESS_TOKEN)
// ===========================

const BOTNOI_API_BASE = process.env.BOTNOI_API_BASE || "https://api-gateway.botnoi.ai";
const REQUEST_TIMEOUT_MS = 8000;

export const REVIEW_POSTBACK_PREFIX = "plasom_review";
export const REVIEW_SKIP_COMMENT_PREFIX = "plasom_review_skip";

export type BotnoiSource = {
  source_channel: string; // line / facebook / app
  source_type: string; // user / group / room
  source_id: string;
};

export type BotnoiOutgoingMessage =
  | { type: "text"; text: string }
  | {
      type: "quick_reply";
      text: string;
      quick_reply_choices: Array<{ type: "postback"; label: string; data: string }>;
    };

export class BotnoiApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "BotnoiApiError";
  }
}

function getToken(): string {
  const token = process.env.BOTNOI_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new BotnoiApiError("ยังไม่ได้ตั้งค่า BOTNOI_CHANNEL_ACCESS_TOKEN");
  }
  return token;
}

export function isBotnoiConfigured(): boolean {
  return Boolean(process.env.BOTNOI_CHANNEL_ACCESS_TOKEN);
}

async function botnoiRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BOTNOI_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      // ไม่แนบ token หรือ body ที่ส่งไปใน error เพื่อกันข้อมูลรั่วลง log
      throw new BotnoiApiError(`Botnoi API ${method} ${path} ตอบ ${res.status}`, res.status);
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err) {
    if (err instanceof BotnoiApiError) throw err;
    throw new BotnoiApiError(`เรียก Botnoi API ${method} ${path} ไม่สำเร็จ`);
  } finally {
    clearTimeout(timer);
  }
}

/** ส่งข้อความหาลูกค้าในห้องแชทที่เคยทักบอทแล้ว (POST /developer/platform-api/push-msgs) */
export async function pushMessages(
  botId: string,
  source: BotnoiSource,
  messages: BotnoiOutgoingMessage[]
): Promise<void> {
  await botnoiRequest("POST", "/developer/platform-api/push-msgs", {
    bot_id: botId,
    source,
    messages,
  });
}

/** ดึงรายชื่อบอทของบัญชี (GET /developer/platform-api/bot/my) — ใช้ในสเต็ปผูกบอทกับร้าน */
export async function listMyBots(): Promise<unknown> {
  return botnoiRequest("GET", "/developer/platform-api/bot/my");
}

/** ข้อความขอรีวิวพร้อมปุ่ม 1-5 ดาว (postback data = plasom_review:<รหัสใบงาน>:<ดาว>) */
export function buildReviewRequestMessage(trackingCode: string): BotnoiOutgoingMessage {
  return {
    type: "quick_reply",
    text: `งานซ่อมรหัส ${trackingCode} เสร็จเรียบร้อยแล้วครับ 🙏\nรบกวนให้คะแนนความพึงพอใจกับบริการครั้งนี้ด้วยครับ`,
    quick_reply_choices: [5, 4, 3, 2, 1].map((star) => ({
      type: "postback" as const,
      label: `${"⭐".repeat(star)} ${star}`,
      data: `${REVIEW_POSTBACK_PREFIX}:${trackingCode}:${star}`,
    })),
  };
}

/** ขอบคุณที่ให้ดาว + ชวนเขียนคำติชม (มีปุ่มข้ามได้) */
export function buildCommentRequestMessage(trackingCode: string, rating: number): BotnoiOutgoingMessage {
  return {
    type: "quick_reply",
    text:
      `ขอบคุณสำหรับคะแนน ${rating} ดาวครับ 🙏\n` +
      "มีอะไรอยากบอกเพิ่มเติมเกี่ยวกับบริการครั้งนี้ไหมครับ พิมพ์คำติชมส่งมาได้เลย",
    quick_reply_choices: [
      { type: "postback", label: "ไม่มีครับ", data: `${REVIEW_SKIP_COMMENT_PREFIX}:${trackingCode}` },
    ],
  };
}
