import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL;

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Sends a notification email using SendGrid.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email body (text or HTML)
 */
export const sendNotificationEmail = async (to, subject, message) => {
    if (!SENDGRID_API_KEY || !SENDER_EMAIL) {
        console.warn("[emailService] Skipping email send: SENDGRID_API_KEY or SENDER_EMAIL not configured.");
        return;
    }

    const frontendUrl = process.env.FRONTEND_URL || "https://sales-crm-tool.vercel.app";
    const logoUrl = `${frontendUrl}/Logo.png`;

    const msg = {
        to,
        from: SENDER_EMAIL,
        subject: `[SalesCRM] ${subject}`,
        text: message.replace(/<[^>]*>?/gm, ""), // Basic HTML to text fallback
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="text-align: center; padding: 25px 20px 15px 20px; background-color: #ffffff;">
                    <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 45px; width: auto;" />
                </div>
                <div style="background-color: #dc2626; color: white; padding: 15px; text-align: center;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 600;">System Notification</h2>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #374151;">
                    <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                        This is an automated notification from your SalesCRM system. Please do not reply to this email.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log(`[emailService] Email sent successfully to ${to}`);
    } catch (error) {
        console.error("[emailService] Error sending email:", error.response?.body || error.message);
    }
};
