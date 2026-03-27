
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sgMail from '@sendgrid/mail';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testExternalEmail(toEmail) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const senderEmail = process.env.SENDGRID_SENDER_EMAIL;

    console.log(`[Diagnostic] Attempting to send email to: ${toEmail}`);
    console.log(`[Diagnostic] Using Sender: ${senderEmail}`);

    if (!apiKey || !senderEmail) {
        console.error("Missing credentials in .env");
        return;
    }

    sgMail.setApiKey(apiKey.trim());

    const msg = {
        to: toEmail,
        from: senderEmail,
        subject: 'SalesCRM Diagnostic Test',
        text: 'This is a test email to verify external delivery from SendGrid.',
        html: '<strong>This is a test email to verify external delivery from SendGrid.</strong>',
    };

    try {
        const response = await sgMail.send(msg);
        console.log("✅ SendGrid SUCCESS!");
        console.log("Response Status Code:", response[0].statusCode);
        console.log("Details:", JSON.stringify(response[0].headers, null, 2));
    } catch (error) {
        console.error("❌ SendGrid FAILURE!");
        if (error.response) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

// You can change this to a real external email you have access to, 
// or I can try a dummy one just to see if SendGrid accepts it.
const testTarget = process.argv[2] || "rishabhloomba60@gmail.com"; 
testExternalEmail(testTarget);
