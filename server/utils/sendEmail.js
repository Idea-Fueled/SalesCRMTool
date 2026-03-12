import sgMail from '@sendgrid/mail';

/**
 * Send an email using SendGrid API
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[sendEmail] Attempting to send email to: ${to} (via SendGrid API)`);

        const apiKey = process.env.SENDGRID_API_KEY;
        const senderEmail = process.env.SENDGRID_SENDER_EMAIL;

        if (!apiKey || !senderEmail) {
            const missing = [];
            if (!apiKey) missing.push("SENDGRID_API_KEY");
            if (!senderEmail) missing.push("SENDGRID_SENDER_EMAIL");
            console.error(`[sendEmail] MISSING environment variables: ${missing.join(", ")}`);
            throw new Error(`Email configuration is incomplete. Missing: ${missing.join(", ")}`);
        }

        sgMail.setApiKey(apiKey.trim());

        const msg = {
            to,
            from: senderEmail, // Must be verified in SendGrid
            subject,
            html,
        };

        const response = await sgMail.send(msg);
        console.log("✅ Email sent successfully via SendGrid: %s", response[0]?.headers?.['x-message-id'] || "Success");
        return response;
    } catch (error) {
        console.error("❌ SendGrid Error Details:", error.response?.body || error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}