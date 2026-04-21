import jwt from "jsonwebtoken"
import User from "../models/userSchema.js"
import { generateToken } from "../utils/authToken.js"
import { getCookieOptions } from "../utils/cookieOptions.js"

export const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized!"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        const user = await User.findById(decoded.id)
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        // Block deactivated users from accessing any protected route
        if (!user.isActive) {
            return res.status(403).json({
                message: "Your account has been deactivated. Please contact your administrator.",
                code: "ACCOUNT_DEACTIVATED"
            });
        }

        // Sliding Session: Re-issue token to extend the session by another 15 minutes on every active request
        const newToken = await generateToken(user._id, user.role);
        res.cookie("token", newToken, getCookieOptions());

        req.user = user
        next()
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized!"
        })
    }
}