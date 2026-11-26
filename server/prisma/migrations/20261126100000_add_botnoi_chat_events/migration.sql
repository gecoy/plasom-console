-- Ticket: ผูกห้องแชท Botnoi
ALTER TABLE "Ticket" ADD COLUMN "botnoiSourceId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "botnoiChannel" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "reviewRequestedAt" TIMESTAMP(3);
CREATE INDEX "Ticket_projectId_botnoiSourceId_idx" ON "Ticket"("projectId", "botnoiSourceId");

-- Message: กันบันทึกข้อความ Botnoi ซ้ำ
ALTER TABLE "Message" ADD COLUMN "botnoiMid" TEXT;
CREATE UNIQUE INDEX "Message_botnoiMid_key" ON "Message"("botnoiMid");

-- Project: ค้นร้านจาก bot_id
CREATE INDEX "Project_botnoiBotId_idx" ON "Project"("botnoiBotId");

-- แชทที่ยังไม่มีใบงาน
CREATE TABLE "BotnoiChatEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "text" TEXT NOT NULL,
    "mid" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotnoiChatEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BotnoiChatEvent_mid_key" ON "BotnoiChatEvent"("mid");
CREATE INDEX "BotnoiChatEvent_projectId_sentAt_idx" ON "BotnoiChatEvent"("projectId", "sentAt");
CREATE INDEX "BotnoiChatEvent_projectId_sourceId_sentAt_idx" ON "BotnoiChatEvent"("projectId", "sourceId", "sentAt");
ALTER TABLE "BotnoiChatEvent" ADD CONSTRAINT "BotnoiChatEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
