
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import { sendEmail } from './utils/sendEmail.js';

async function bugTest() {
    console.log("Testing process.env loading...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS present:", !!process.env.EMAIL_PASS);

    try {
        await sendEmail("anirudhj545@gmail.com", "Utility Test", "<h1>Testing SendEmail Utility</h1>");
        console.log("✅ UTILITY SUCCESS!");
    } catch (err) {
        console.error("❌ UTILITY FAILURE!");
        console.error(err.message);
    }
}

bugTest();
