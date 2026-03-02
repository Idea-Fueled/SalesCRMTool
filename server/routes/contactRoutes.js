import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createContact, getContacts, getContactById, updateContact, deleteContact } from "../controllers/contactController.js";

const router = express.Router();

router.post("/create", protect, createContact)
router.get("/", protect, getContacts)
router.get("/:id", protect, getContactById)
router.put("/update/:id", protect, updateContact)
router.delete("/delete/:id", protect, deleteContact)

export default router