import nodemailer from 'nodemailer';

/**
 * Send an email using Gmail SMTP (via Nodemailer)
 */
export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`Attempting to send email to: ${to} via Gmail/Nodemailer`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"mbdConsulting" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error in sendEmail utility:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}