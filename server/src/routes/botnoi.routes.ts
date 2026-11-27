import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authRequired } from "../middleware/auth";
import { getBotnoiBots, handleBotnoiEvent, sendBotnoiProjectReply } from "../controllers/botnoi.controller";

const router = Router();

const botnoiApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Event Subscribe URL ของ Provider ใน Botnoi Developer Console
router.post("/events", handleBotnoiEvent);

// Console APIs: ต้องล็อกอินและจำกัดอัตราการเรียก
router.get("/bots", authRequired, botnoiApiLimiter, getBotnoiBots);
router.post("/projects/:projectId/reply", authRequired, botnoiApiLimiter, sendBotnoiProjectReply);

export default router;
