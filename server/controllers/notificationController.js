import mongoose from "mongoose";
import { Notification } from "../models/notificationSchema.js";
import User from "../models/userSchema.js";

export const getNotifications = async (req, res) => {
    try {
        const { id: userId } = req.user;
        
        // Notifications are personal (created per recipient by the service)
        const query = { recipientId: new mongoose.Types.ObjectId(userId) };

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
        const query = { recipientId: new mongoose.Types.ObjectId(userId), isRead: false };

        const result = await Notification.updateMany(query, { isRead: true });
        console.log(`[NotificationController] MarkAllAsRead: updated ${result.modifiedCount} notifications for user ${userId}`);
        
        res.status(200).json({ 
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error in markAllAsRead:", error);
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};
