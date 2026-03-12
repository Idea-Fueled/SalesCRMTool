import express from "express";
import { getAuditLogs } from "../controllers/auditLogController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Only Admins, Managers and Reps can view audit logs
router.get("/", protect, requireRole("admin", "sales_manager", "sales_rep"), getAuditLogs);

export default router;
