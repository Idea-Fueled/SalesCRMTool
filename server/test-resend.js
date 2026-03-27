
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testResend() {
    const apiKey = "re_hfCgtSG3_3kcYMcEGt59pJgnyxQQx9Dsw"; // From their .env
    console.log("[Diagnostic] Testing Resend API...");

    const resend = new Resend(apiKey);

    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev', // Default test sender for Resend
            to: 'anirudhj545@gmail.com',
            subject: 'Resend Diagnostic Test',
            html: '<strong>Resend is working for your SalesCRM!</strong>'
        });

        if (error) {
            console.error("❌ Resend FAILURE!");
            console.error(error);
        } else {
            console.log("✅ Resend SUCCESS!");
            console.log("Data:", data);
        }
    } catch (err) {
        console.error("❌ Resend ERROR!");
        console.error(err.message);
    }
}

testResend();
