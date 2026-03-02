import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4,              // 🔥 force IPv4 (important)
            serverSelectionTimeoutMS: 5000
        });

        console.log("Connected to database");
    } catch (err) {
        console.log("error connecting to database", err.message);
        process.exit(1);
    }
};