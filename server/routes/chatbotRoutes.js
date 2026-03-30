import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { handleChat } from "../controllers/chatbotController.js";

const router = express.Router();

router.post("/", protect, handleChat);

export default router;
