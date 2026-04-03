import sgMail from "@sendgrid/mail";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to this file's location (up one level to the server root)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

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
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #f3f4f6;">
                    
                    <!-- Header -->
                    <div style="text-align: center; padding: 35px 20px 25px 20px; border-bottom: 1px solid #f3f4f6;">
                        <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 48px; width: auto; display: block; margin: 0 auto;" />
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 40px 35px;">
                        <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px;">
                            ${subject}
                        </span>
                        
                        <div style="font-size: 16px; line-height: 1.7; color: #374151; font-weight: 400; margin-bottom: 25px;">
                            ${message.replace(/\n/g, '<br/>')}
                        </div>
                        
                        <!-- Call to Action Box -->
                        <div style="margin-top: 35px; padding: 22px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #dc2626;">
                            <p style="margin: 0; font-size: 14px; color: #4b5563;">
                                <strong>Manage from Dashboard:</strong> View the full details and history right in your CRM.
                            </p>
                            <a href="${frontendUrl}" style="display: inline-block; margin-top: 12px; color: #dc2626; font-size: 14px; font-weight: 700; text-decoration: none;">Go to SalesCRM &rarr;</a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f3f4f6; padding: 25px 35px; text-align: center;">
                        <p style="font-size: 12px; color: #6b7280; margin: 0; line-height: 1.6;">
                            This is an automated notification from <strong>SalesCRM</strong>.
                            <br>Please do not reply directly to this email address.
                        </p>
                    </div>

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
