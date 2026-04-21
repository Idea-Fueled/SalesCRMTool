import dotenv from 'dotenv';
import { sendEmail } from './utils/sendEmail.js';

dotenv.config();

console.log("Testing email sending...");
console.log("SENDGRID_SENDER_EMAIL:", process.env.SENDGRID_SENDER_EMAIL);

const testEmail = "anirudhj545@gmail.com"; // User's own email as test recipient

try {
    await sendEmail(testEmail, "CRM Test Email", "<h1>If you see this, email is working!</h1>");
    console.log("SUCCESS");
} catch (error) {
    console.error("FAILURE:", error.message);
}
