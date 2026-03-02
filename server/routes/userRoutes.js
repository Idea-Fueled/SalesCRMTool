import express from "express"
import { adminTest, activateUser, adminResetPassword, bulkReassignRecords, changePassword, deactivateUser, forgotPassword, getProfile, getTeamUsers, loginUser, logoutUser, registerUser, resetPassword, updateUser, softDeleteUser, getDeletedUsers, restoreUser, setupPassword, resendInvitation } from "../controllers/userController.js"
import { protect } from "../middlewares/authMiddleware.js"
import { requireRole } from "../middlewares/roleMiddleware.js"
const router = express.Router()

const optionalProtect = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (token) {
            const jwt = (await import("jsonwebtoken")).default;
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            const user = await (await import("../models/userSchema.js")).default.findById(decoded.id);
            if (user) req.user = user;
        }
    } catch (e) { /* ignore */ }
    next();
};

router.post("/register", optionalProtect, registerUser)
router.post("/login", loginUser)
router.post("/logout", protect, logoutUser)
router.get("/profile", protect, getProfile)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/setup-password", setupPassword)
router.post("/:id/resend-invitation", protect, resendInvitation)
router.get("/admin-test", protect, requireRole("admin"), adminTest)
router.get("/team", protect, getTeamUsers)
router.put("/:id", protect, updateUser)
router.patch("/:id/deactivate", protect, deactivateUser)
router.patch("/:id/activate", protect, activateUser)
router.patch("/:id/change-password", protect, changePassword)
router.patch("/:id/admin-reset-password", protect, requireRole("admin"), adminResetPassword)
router.patch("/:id/reassign", protect, bulkReassignRecords)
router.patch("/:id/soft-delete", protect, requireRole("admin"), softDeleteUser)
router.get("/trash", protect, requireRole("admin"), getDeletedUsers)
router.patch("/:id/restore", protect, requireRole("admin"), restoreUser)


export default router;