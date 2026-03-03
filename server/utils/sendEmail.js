import nodemailer from 'nodemailer';

/**
 * Send an email using Gmail SMTP (via Nodemailer)
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[sendEmail] Attempting to send email to: ${to}`);

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            const missing = [];
            if (!process.env.EMAIL_USER) missing.push("EMAIL_USER");
            if (!process.env.EMAIL_PASS) missing.push("EMAIL_PASS");
            console.error(`[sendEmail] MISSING environment variables: ${missing.join(", ")}`);
            throw new Error(`Email configuration is incomplete. Missing: ${missing.join(", ")}`);
        }

        // Diagnostic logs for Render (checking for hidden spaces)
        console.log(`[sendEmail] EMAIL_USER character count: ${process.env.EMAIL_USER.trim().length} (raw: ${process.env.EMAIL_USER.length})`);
        console.log(`[sendEmail] EMAIL_PASS character count: ${process.env.EMAIL_PASS.trim().length} (raw: ${process.env.EMAIL_PASS.length})`);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER.trim(),
                pass: process.env.EMAIL_PASS.trim(),
            },
            // Force IPv4 to avoid ENETUNREACH on Render
            family: 4,
            // Timeouts to prevent hanging
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 30000,
        });

        // Verify the connection configuration
        console.log("[sendEmail] Verifying transporter...");
        await transporter.verify();
        console.log("[sendEmail] Transporter verified successfully.");

        const mailOptions = {
            from: `"mbdConsulting" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        };

        console.log("[sendEmail] Sending mail...");
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error in sendEmail utility:", error);

        // Specific help for common Gmail errors
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error("Authentication failed. Please check your EMAIL_USER and EMAIL_PASS (must be an App Password).");
        } else if (error.code === 'ECONNREFUSED') {
            console.error("Connection refused. This might be a firewall or network issue.");
        }

        throw new Error(`Failed to send email: ${error.message}`);
    }
}