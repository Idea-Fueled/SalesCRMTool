/**
 * Returns the correct cookie options for the current environment.
 * - Production (HTTPS): secure, sameSite=none, partitioned
 * - Development (HTTP localhost): NOT secure, sameSite=lax, NOT partitioned
 *
 * This prevents the browser from silently dropping the auth cookie
 * on localhost (which uses HTTP, not HTTPS).
 */
export const getCookieOptions = (maxAge = 15 * 60 * 1000) => {
    // NODE_ENV is "production" only in actual deployment (Render, Vercel, etc.).
    // During local `npm run dev` / `nodemon`, it is undefined or "development".
    const isProduction = process.env.NODE_ENV === "production";

    console.log(`[Cookie] mode=${isProduction ? "PRODUCTION" : "DEVELOPMENT"}, NODE_ENV=${process.env.NODE_ENV}`);

    if (isProduction) {
        return {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            partitioned: true,
            maxAge
        };
    }

    // Development (localhost): HTTP-friendly cookie settings
    return {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge
    };
};
