import { Notification } from "../models/notificationSchema.js";
import User from "../models/userSchema.js";

export const getNotifications = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        let query = {};

        if (role === "admin") {
            // Admin sees everything
            query = {};
        } else if (role === "sales_manager") {
            // Manager sees their own AND their team's
            const teamUsers = await User.find({ managerId: userId }).select("_id");
            const teamIds = teamUsers.map(u => u._id);
            query = {
                $or: [
                    { recipientId: userId },
                    { recipientId: { $in: teamIds } },
                    { teamId: userId }
                ]
            };
        } else {
            // Rep sees only their own
            query = { recipientId: userId };
        }

        const notifications = await Notification.find(query)
            .populate("senderId", "firstName lastName")
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ data: notifications });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
        res.status(200).json({ data: notification });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const { id: userId } = req.user;
        await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};
