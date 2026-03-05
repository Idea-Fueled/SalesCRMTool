import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8000";

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const response = await axios.get("/api/notifications");
            const data = response.data.data;
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();

            const newSocket = io(SOCKET_URL, {
                withCredentials: true,
            });

            newSocket.on("connect", () => {
                console.log("Connected to socket server");
                newSocket.emit("join", {
                    userId: user.id,
                    role: user.role,
                    managerId: user.managerId
                });
            });

            newSocket.on("new_notification", (notification) => {
                setNotifications(prev => [notification, ...prev]);
                if (!notification.isRead) {
                    setUnreadCount(prev => prev + 1);
                    toast.success(notification.message, {
                        icon: "🔔",
                        duration: 5000
                    });
                }
            });

            setSocket(newSocket);

            return () => newSocket.disconnect();
        } else {
            setNotifications([]);
            setUnreadCount(0);
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [user, fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            await axios.patch(`/api/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.post("/api/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await axios.delete(`/api/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            // Update unread count if the deleted notification was unread
            const deletedNotification = notifications.find(n => n._id === id);
            if (deletedNotification && !deletedNotification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
