import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv";
dotenv.config();
import { connectdb } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js"
import companyRoutes from "./routes/companyRoutes.js"
import contactRoutes from "./routes/contactRoutes.js"
import dealRoutes from "./routes/dealRoutes.js"
import auditLogRoutes from "./routes/auditLogRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"
// console.log("MONGO_URI:", process.env.MONGO_URI);

import http from "http";
import { initSocket } from "./utils/socket.js";

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

app.set("trust proxy", 1);

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://sales-crm-ui-87gs.vercel.app",
    "http://localhost:5173"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);

        // 1. Check if it's in our explicit list
        if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost")) {
            return callback(null, true);
        }

        // 2. Allow any vercel deployment for this specific project pattern
        const isVercelPreview = origin.startsWith("https://sales-crm-ui-87gs") && origin.endsWith(".vercel.app");
        if (isVercelPreview) {
            return callback(null, true);
        }

        console.error(`Status: CORS Error - Origin ${origin} not allowed by policy`);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(cookieParser())

// Health check and root route
app.get("/", (req, res) => res.status(200).send("Sales CRM API is running..."));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/notifications", notificationRoutes);

// Catch-all route for debugging 404s
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        hint: "Make sure you are prefixing your requests with /api"
    });
});

connectdb()

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})