import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/userSchema.js";
import { Deal } from "../models/dealSchema.js";

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}).lean();
        console.log("--- USERS ---");
        users.forEach(u => console.log(`${u.firstName} ${u.lastName} [${u.role}] ID: ${u._id}`));

        const deals = await Deal.find({}).lean();
        console.log("\n--- DEALS ---");
        deals.forEach(d => console.log(`Deal: ${d.name || d.title}, Owner: ${d.ownerId}, Deleted: ${d.isDeleted}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
