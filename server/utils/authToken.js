import jwt from "jsonwebtoken"

export const generateToken = async (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" })
}