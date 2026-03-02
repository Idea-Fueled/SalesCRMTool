import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createDeal, deleteDeal, getDeals, getDealById, markDealResult, moveDealStage, updateDealInformation } from "../controllers/dealController.js";

const router = express.Router();

router.post("/create", protect, createDeal)
router.put("/:id/update", protect, updateDealInformation)
router.patch("/:id/update-stage", protect, moveDealStage)
router.patch("/:id/result", protect, markDealResult)
router.get("/", protect, getDeals)
router.get("/:id", protect, getDealById)
router.delete("/:id/delete", protect, deleteDeal)

export default router;