import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userSchema.js';
import { sendEmail } from './utils/sendEmail.js';
import crypto from 'crypto';

dotenv.config();

const testUserEmail = "test-recipient-" + Date.now() + "@yopmail.com"; // Using a random yopmail to avoid spam filters for test

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const invitationToken = crypto.randomBytes(32).toString("hex");
        
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const setupUrl = `${frontendUrl}/setup-password?token=${invitationToken}`;
        
        const message = `<h1>Testing Invitation</h1><p>Link: ${setupUrl}</p>`;
        
        console.log(`Attempting to send email to: ${testUserEmail}`);
        await sendEmail(testUserEmail, "Account Setup Invitation", message);
        console.log("Email sent successfully to " + testUserEmail);

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

test();
