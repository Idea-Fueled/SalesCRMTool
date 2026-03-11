import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createContact, getContacts, getContactById, updateContact, deleteContact, getArchivedContacts, restoreContact, addRemark } from "../controllers/contactController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/:id/add-remark", protect, upload.array("files"), addRemark)
router.post("/create", protect, upload.array("files"), createContact)
router.get("/archived", protect, getArchivedContacts)
router.patch("/restore/:id", protect, restoreContact)
router.get("/", protect, getContacts)
router.get("/:id", protect, getContactById)
router.put("/update/:id", protect, upload.array("files"), updateContact)
router.delete("/delete/:id", protect, deleteContact)

export default router