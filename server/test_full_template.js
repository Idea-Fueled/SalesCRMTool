import sgMail from '@sendgrid/mail';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_KEY = process.env.SENDGRID_API_KEY;
const SENDER = process.env.SENDGRID_SENDER_EMAIL;

sgMail.setApiKey(API_KEY);

const frontendUrl = process.env.FRONTEND_URL || "https://sales-crm-tool.vercel.app";
const logoUrl = `${frontendUrl}/Logo.png`;
const subject = "DEAL STAGE UPDATED";
const message = "This is a diagnostic email with the full premium template. \nIf you see this, the template itself is safe and working!";

const msg = {
    to: 'anirudhj545@gmail.com',
    from: SENDER,
    subject: `[SalesCRM] ${subject}`,
    text: message.replace(/<[^>]*>?/gm, ""),
    html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #f3f4f6;">
                <div style="text-align: center; padding: 35px 20px 25px 20px; border-bottom: 1px solid #f3f4f6;">
                    <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 48px; width: auto; display: block; margin: 0 auto;" />
                </div>
                <div style="padding: 40px 35px;">
                    <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px;">
                        ${subject}
                    </span>
                    <div style="font-size: 16px; line-height: 1.7; color: #374151; font-weight: 400; margin-bottom: 25px;">
                        ${message.replace(/\n/g, '<br/>')}
                    </div>
                    <div style="margin-top: 35px; padding: 22px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #dc2626;">
                        <p style="margin: 0; font-size: 14px; color: #4b5563;">
                            <strong>Manage from Dashboard:</strong> View the full details and history right in your CRM.
                        </p>
                        <a href="${frontendUrl}" style="display: inline-block; margin-top: 12px; color: #dc2626; font-size: 14px; font-weight: 700; text-decoration: none;">Go to SalesCRM &rarr;</a>
                    </div>
                </div>
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

console.log('Sending full-template test...');
sgMail.send(msg)
    .then(() => console.log('Successfully sent!'))
    .catch(err => console.error(err.response?.body || err.message));
