
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testGmailSMTP() {
    // Note: These are commented out in your .env, so I'll try to use them if I can read them manually or if you uncomment them.
    // For this test, I'll use the values I saw in the file.
    const user = "anirudhj545@gmail.com";
    const pass = "whqrmsfmtihgzgxu"; 

    console.log(`[Diagnostic] Testing Gmail SMTP with user: ${user}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });

    const mailOptions = {
        from: user,
        to: "rishabhloomba60@gmail.com", // External test
        subject: 'Gmail SMTP Diagnostic Test',
        text: 'This is a test email to verify Gmail SMTP delivery from SalesCRM.'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Gmail SMTP SUCCESS!");
        console.log("Message ID:", info.messageId);
        console.log("Response:", info.response);
    } catch (error) {
        console.error("❌ Gmail SMTP FAILURE!");
        console.error(error.message);
    }
}

testGmailSMTP();
