
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const userSchema = new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
    isActive: Boolean,
    isDeleted: Boolean
});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({ isDeleted: { $ne: true } }).limit(10);
        console.log("--- Users ---");
        users.forEach(u => {
            console.log(`- ${u.firstName} ${u.lastName}: ${u.email} (Active: ${u.isActive})`);
        });

        const targetEmail = "anirudhj545@gmail.com";
        const targetUser = await User.findOne({ email: targetEmail });
        if (targetUser) {
            console.log(`\nFound target user: ${targetUser.email}`);
        } else {
            console.log(`\nUser ${targetEmail} NOT found in DB.`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkUsers();
