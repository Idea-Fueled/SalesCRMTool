import fetch, { Headers } from 'node-fetch';
if (!global.Headers) {
    global.Headers = Headers;
}
if (!global.fetch) {
    global.fetch = fetch;
}

import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// The "from" address MUST use a verified domain in Resend.
// Until domain is verified, use onboarding@resend.dev (only works for sending to account owner's email).
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export const sendEmail = async (to, subject, html) => {
    try {
        console.log(`Attempting to send email to: ${to} via Resend`);

        const { data, error } = await resend.emails.send({
            from: `mbdConsulting <${FROM_ADDRESS}>`,
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw new Error(error.message);
        }

        console.log("Email sent successfully. Resend ID:", data.id);
        return data;
    } catch (error) {
        console.error("Detailed Email Error:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}