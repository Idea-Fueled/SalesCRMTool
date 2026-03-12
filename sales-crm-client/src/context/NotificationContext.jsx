import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";
import API from "../API/Interceptor";
import { toast } from "react-hot-toast";

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8000";

export const NotificationProvider = ({ children }) => {
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            console.log("[NotificationContext] Fetching notifications...");
            const response = await API.get("/notifications"); // Interceptor already prepends /api
            const data = response.data.data;
            console.log("[NotificationContext] Notifications fetched:", data.length);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("[NotificationContext] Error fetching notifications:", error);
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

            // Force logout when admin deactivates this user
            newSocket.on("force_logout", (data) => {
                // Dispatch same event as Interceptor so AuthContext handles it once
                window.dispatchEvent(new CustomEvent("account_deactivated", {
                    detail: { message: data.message }
                }));
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
            await API.patch(`/notifications/${id}/read`);
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
            await API.post("/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await API.delete(`/notifications/${id}`);
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
