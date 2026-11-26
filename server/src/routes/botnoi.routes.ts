import { Router } from "express";
import { handleBotnoiEvent } from "../controllers/botnoi.controller";

const router = Router();

// Event Subscribe URL ของ Provider ใน Botnoi Developer Console
router.post("/events", handleBotnoiEvent);

export default router;
