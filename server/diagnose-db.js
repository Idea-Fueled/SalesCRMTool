import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/userSchema.js";
import { Deal } from "./models/dealSchema.js";
import { Company } from "./models/companySchema.js";
import { Contact } from "./models/contactSchema.js";

dotenv.config();

const diagnose = async () => {
    let report = "--- DB DIAGNOSTIC REPORT ---\n";
    try {
        report += "🔌 Connecting to DB...\n";
        await mongoose.connect(process.env.MONGO_URI);
        report += "✅ Connected.\n\n";

        const userList = await User.find({});
        report += `👤 USERS FOUND: ${userList.length}\n`;
        userList.forEach(u => {
            report += `- ${u.firstName} ${u.lastName} [${u.role}] ID: ${u._id} Email: ${u.email}\n`;
        });

        const deals = await Deal.find({});
        report += `\n📊 DEALS FOUND: ${deals.length}\n`;
        deals.forEach((d, i) => {
            report += `D${i}: title="${d.title}", ownerId=${d.ownerId}, isDeleted=${d.isDeleted}\n`;
        });

        const companies = await Company.find({});
        report += `\n🏢 COMPANIES FOUND: ${companies.length}\n`;
        companies.forEach((v, i) => {
            report += `C${i}: name="${v.name}", ownerId=${v.ownerId}, isDeleted=${v.isDeleted}\n`;
        });

        const contacts = await Contact.find({});
        report += `\n📞 CONTACTS FOUND: ${contacts.length}\n`;
        contacts.forEach((v, i) => {
            report += `X${i}: name="${v.firstName}", ownerId=${v.ownerId}, isDeleted=${v.isDeleted}\n`;
        });

        console.log(report);
        process.exit(0);
    } catch (err) {
        console.log(report);
        console.error("❌ ERROR:", err);
        process.exit(1);
    }
};

diagnose();
