import express from "express";
import { proxyDownload } from "../controllers/fileController.js";

const router = express.Router();

// Publicly accessible download proxy (or you can add middleware to protect it)
router.get("/download", proxyDownload);

export default router;
