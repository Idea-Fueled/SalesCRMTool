import express from "express"
import { protect } from "../middlewares/authMiddleware.js";
import { changeOwnership, createCompany, deleteCompany, getCompanies, getCompanyById, updateCompany, getArchivedCompanies, restoreCompany, addRemark } from "../controllers/companyController.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/:id/add-remark", protect, upload.array("files"), addRemark)
router.post("/create", protect, upload.array("files"), createCompany)
router.get("/archived", protect, getArchivedCompanies)
router.patch("/:id/restore", protect, restoreCompany)
router.get("/", protect, getCompanies)
router.get("/:id", protect, getCompanyById)
router.put("/:id", protect, upload.array("files"), updateCompany)
router.delete("/:id", protect, deleteCompany);
router.patch("/:id/change-owner", protect, changeOwnership);

export default router;