
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sgMail from '@sendgrid/mail';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or current dir
dotenv.config({ path: path.join(__dirname, '.env') });

async function testEmail() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const senderEmail = process.env.SENDGRID_SENDER_EMAIL;

    console.log("Testing SendGrid Configuration...");
    console.log("Sender Email:", senderEmail);
    console.log("API Key present:", !!apiKey);

    if (!apiKey || !senderEmail) {
        console.error("Missing credentials in .env");
        return;
    }

    sgMail.setApiKey(apiKey.trim());

    const msg = {
        to: senderEmail, // Sent it to yourself as a test
        from: senderEmail,
        subject: 'SendGrid Test Email',
        text: 'If you receive this, your SendGrid configuration for SalesCRM is working!',
        html: '<strong>If you receive this, your SendGrid configuration for SalesCRM is working!</strong>',
    };

    try {
        const response = await sgMail.send(msg);
        console.log("✅ SendGrid SUCCESS!");
        console.log("Response Status Code:", response[0].statusCode);
        console.log("Message ID:", response[0].headers['x-message-id']);
    } catch (error) {
        console.error("❌ SendGrid FAILURE!");
        if (error.response) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testEmail();
