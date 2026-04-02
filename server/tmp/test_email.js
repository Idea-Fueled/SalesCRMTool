import { sendNotificationEmail } from "../services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

const testRecipient = process.env.SENDGRID_SENDER_EMAIL || "anirudhj545@gmail.com";

const test = async () => {
    console.log(`🚀 Sending test email to: ${testRecipient}...`);
    try {
        await sendNotificationEmail(
            testRecipient,
            "System Connectivity Test",
            "<strong>Success!</strong> Your SalesCRM email notification system is now active. This is a tiered notification test."
        );
        console.log("✅ Test completed. Check the output above for any errors.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Test failed:", err);
        process.exit(1);
    }
};

test();
