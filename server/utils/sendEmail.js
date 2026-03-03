import nodemailer from 'nodemailer';

/**
 * Send an email using Gmail SMTP (via Nodemailer)
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[sendEmail] Attempting to send email to: ${to}`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Add a short timeout to prevent hanging the entire process
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 20000,
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