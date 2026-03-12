import nodemailer from 'nodemailer';

/**
 * Send an email using NodeMailer
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[sendEmail] Attempting to send email to: ${to} (via NodeMailer)`);

        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            const missing = [];
            if (!emailUser) missing.push("EMAIL_USER");
            if (!emailPass) missing.push("EMAIL_PASS");
            console.error(`[sendEmail] MISSING environment variables: ${missing.join(", ")}`);
            throw new Error(`Email configuration is incomplete. Missing: ${missing.join(", ")}`);
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        const mailOptions = {
            from: `"mbdConsulting" <${emailUser}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully via NodeMailer: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error in sendEmail utility:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}