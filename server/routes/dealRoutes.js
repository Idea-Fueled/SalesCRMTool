import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createDeal, deleteDeal, getDeals, getDealById, markDealResult, moveDealStage, updateDealInformation, getArchivedDeals, restoreDeal, addRemark, deleteRemarkFile, deleteAttachment, deleteRemark, generateDealSummary } from "../controllers/dealController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/:id/add-remark", protect, upload.array("files"), addRemark)
router.post("/create", protect, upload.array("files"), createDeal)
router.put("/:id/update", protect, upload.array("files"), updateDealInformation)
router.patch("/:id/update-stage", protect, moveDealStage)
router.patch("/:id/result", protect, markDealResult)
router.get("/archived", protect, getArchivedDeals)
router.patch("/:id/restore", protect, restoreDeal)
router.get("/", protect, getDeals)
router.get("/:id", protect, getDealById)
router.delete("/:id/delete", protect, deleteDeal)
router.delete("/:id/remarks/:remarkId/files/:fileId", protect, deleteRemarkFile)
router.delete("/:id/remarks/:remarkId", protect, deleteRemark)
router.delete("/:id/attachments/:fileId", protect, deleteAttachment)
router.post("/:id/ai-summary", protect, generateDealSummary)

export default router;