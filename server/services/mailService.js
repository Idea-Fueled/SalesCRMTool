// import nodemailer from "nodemailer";

// /**
//  * Send an email using Mailtrap SMTP
//  * @param {Object} options - { to, subject, html }
//  */
// export const sendEmail = async (options) => {
//     try {
//         const transporter = nodemailer.createTransport({
//             host: process.env.MAILTRAP_HOST,
//             port: process.env.MAILTRAP_PORT,
//             auth: {
//                 user: process.env.MAILTRAP_USER,
//                 pass: process.env.MAILTRAP_PASS,
//             },
//         });

//         const mailOptions = {
//             from: `"Sales CRM" <no-reply@salescrm.com>`,
//             to: options.to,
//             subject: options.subject,
//             html: options.html,
//         };

//         const info = await transporter.sendMail(mailOptions);
//         console.log("✅ Email sent successfully: %s", info.messageId);
//         return info;
//     } catch (error) {
//         console.error("❌ Error in sendEmail service:", error.message);
//         throw new Error("Email delivery failed. Please check SMTP configuration.");
//     }
// };
