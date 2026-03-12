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

        // Using explicit SMTP configuration for better reliability on cloud platforms
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // true for 465, false for 587
            auth: {
                user: emailUser,
                pass: emailPass
            },
            tls: {
                rejectUnauthorized: false // Helps in some restricted environments
            }
        });

        const mailOptions = {
            from: `"mbdConsulting" <${emailUser}>`,
            to,
            subject,
            html
        };

        console.log(`[sendEmail] Sending via smtp.gmail.com...`);
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully via NodeMailer: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ NodeMailer Error Details:", {
            message: error.message,
            code: error.code,
            command: error.command,
            responseCode: error.responseCode
        });
        throw new Error(`Failed to send email: ${error.message}`);
    }
}