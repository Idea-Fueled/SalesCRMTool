import mongoose from "mongoose";
import dotenv from "dotenv";
import { Deal } from "./models/dealSchema.js";

dotenv.config();

const checkRecentDeal = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Find the most recently updated deal that has either remarks or attachments
        const deal = await Deal.findOne({ 
            $or: [
                { "remarks.files": { $not: { $size: 0 } } },
                { "attachments": { $not: { $size: 0 } } }
            ]
        }).sort({ updatedAt: -1 });

        if (deal) {
            console.log("Recent deal with files found:");
            console.log("ID:", deal._id);
            console.log("Attachments:", JSON.stringify(deal.attachments, null, 2));
            console.log("Remarks:", JSON.stringify(deal.remarks.map(r => ({ text: r.text, files: r.files })), null, 2));
        } else {
            console.log("No deal with files found.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkRecentDeal();
