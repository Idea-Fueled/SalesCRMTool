import fetch from 'node-fetch';

/**
 * Send an email using Brevo (Sendinblue) API
 * This bypasses Render's SMTP port restrictions.
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[sendEmail] Attempting to send email to: ${to} (via Brevo API)`);

        const brevoApiKey = process.env.BREVO_API_KEY;
        const senderEmail = process.env.BREVO_SENDER_EMAIL;

        if (!brevoApiKey || !senderEmail) {
            const missing = [];
            if (!brevoApiKey) missing.push("BREVO_API_KEY");
            if (!senderEmail) missing.push("BREVO_SENDER_EMAIL");
            console.error(`[sendEmail] MISSING environment variables: ${missing.join(", ")}`);
            throw new Error(`Email configuration is incomplete. Missing: ${missing.join(", ")}`);
        }

        const url = "https://api.brevo.com/v3/smtp/email";
        const options = {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": brevoApiKey.trim(),
                "content-type": "application/json"
            },
            body: JSON.stringify({
                sender: {
                    name: "mbdConsulting",
                    email: senderEmail
                },
                to: [{ email: to }],
                subject: subject,
                htmlContent: html
            })
        };

        const response = await fetch(url, options);
        const result = await response.json();

        if (response.ok) {
            console.log("✅ Email sent successfully via Brevo: %s", result.messageId || "Success");
            return result;
        } else {
            console.error("❌ Brevo API Error:", result);
            throw new Error(`Brevo API failed: ${result.message || JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error("❌ Error in sendEmail utility:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}