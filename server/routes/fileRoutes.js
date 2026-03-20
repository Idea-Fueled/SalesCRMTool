import express from "express";
import { proxyDownload, proxyView } from "../controllers/fileController.js";

const router = express.Router();

// Publicly accessible proxies
router.get("/download", proxyDownload);
router.get("/view", proxyView);

export default router;
