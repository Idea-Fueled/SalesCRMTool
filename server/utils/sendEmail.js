import nodemailer from 'nodemailer';

/**
 * Send an email using Gmail SMTP (via Nodemailer)
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[sendEmail] Attempting to send email to: ${to} (via Gmail SMTP)`);

        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;

        if (!user || !pass) {
            const missing = [];
            if (!user) missing.push("EMAIL_USER");
            if (!pass) missing.push("EMAIL_PASS");
            console.error(`[sendEmail] MISSING environment variables: ${missing.join(", ")}`);
            throw new Error(`Email configuration is incomplete. Missing: ${missing.join(", ")}`);
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass
            }
        });

        const mailOptions = {
            from: user,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully via Gmail SMTP. MsgID: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Gmail SMTP Error:", error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}