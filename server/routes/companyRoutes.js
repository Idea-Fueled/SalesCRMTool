import express from "express"
import { protect } from "../middlewares/authMiddleware.js";
import { changeOwnership, createCompany, deleteCompany, getCompanies, getCompanyById, updateCompany, getArchivedCompanies, restoreCompany } from "../controllers/companyController.js";

const router = express.Router();

router.post("/create", protect, createCompany)
router.get("/archived", protect, getArchivedCompanies)
router.patch("/:id/restore", protect, restoreCompany)
router.get("/", protect, getCompanies)
router.get("/:id", protect, getCompanyById)
router.put("/:id", protect, updateCompany)
router.delete("/:id", protect, deleteCompany);
router.patch("/:id/change-owner", protect, changeOwnership);

export default router;