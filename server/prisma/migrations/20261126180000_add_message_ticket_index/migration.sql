-- เร่งการโหลดแชทของใบงาน (หน้าแชทดึงข้อมูลซ้ำทุกไม่กี่วินาที)
CREATE INDEX "Message_ticketId_createdAt_idx" ON "Message"("ticketId", "createdAt");
