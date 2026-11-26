-- ชื่อโปรไฟล์ LINE ของลูกค้า สำหรับแสดงแชทที่ยังไม่เปิดใบงาน
ALTER TABLE "BotnoiChatEvent" ADD COLUMN "customerName" TEXT;
