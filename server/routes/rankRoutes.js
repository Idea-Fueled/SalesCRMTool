import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getRankedDeals, getRankedCompanies, getRankedContacts } from "../controllers/rankController.js";

const router = express.Router();

router.get("/deals", protect, getRankedDeals);
router.get("/companies", protect, getRankedCompanies);
router.get("/contacts", protect, getRankedContacts);

export default router;
