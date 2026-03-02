import express from "express";
import { getAuditLogs } from "../controllers/auditLogController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Only Admins can view audit logs
router.get("/", protect, requireRole("admin"), getAuditLogs);

export default router;
