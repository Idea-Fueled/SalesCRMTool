import mongoose from "mongoose";
import dotenv from "dotenv";
import { Deal } from "./models/dealSchema.js";

dotenv.config();

const checkDeal = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const deal = await Deal.findOne({ attachments: { $exists: true, $not: { $size: 0 } } });
        if (deal) {
            console.log("Deal with attachments found:");
            console.log(JSON.stringify(deal, null, 2));
        } else {
            console.log("No deal with attachments found.");
            const anyDeal = await Deal.findOne();
            if (anyDeal) {
                console.log("Sample deal:");
                console.log(JSON.stringify(anyDeal, null, 2));
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkDeal();
