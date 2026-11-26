-- โครงสร้าง event จาก Botnoi (ไม่มีข้อความแชทจริง) ไว้ตรวจรูปแบบ
CREATE TABLE "BotnoiEventLog" (
    "id" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "shape" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotnoiEventLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BotnoiEventLog_createdAt_idx" ON "BotnoiEventLog"("createdAt");
