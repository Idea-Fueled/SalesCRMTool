import jwt from "jsonwebtoken"
import User from "../models/userSchema.js"
import { generateToken } from "../utils/authToken.js"

export const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token
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

        // Sliding Session: Re-issue token to extend the session by another 15 minutes on every active request
        const newToken = await generateToken(user._id, user.role);
        res.cookie("token", newToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            partitioned: true,
            maxAge: 15 * 60 * 1000
        });

        req.user = user
        next()
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized!"
        })
    }
}