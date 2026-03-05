import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Clock, User, Briefcase, ChevronRight, Trash2 } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const { user } = useAuth();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // ... existing useEffect ...

    const handleNotificationClick = async (notification) => {
        // Mark as read if unread
        if (!notification.isRead) {
            await markAsRead(notification._id);
        }

        // Close dropdown
        setIsOpen(false);

        // ... existing navigation logic ...
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent navigation when deleting
        await deleteNotification(id);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* ... bell button ... */}

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    {/* ... header ... */}

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer relative group ${!notification.isRead ? "bg-red-50/30" : ""}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.isRead ? "bg-red-100" : "bg-gray-100"}`}>
                                            {getTypeIcon(notification.type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-xs ${!notification.isRead ? "font-bold text-gray-900" : "text-gray-600"}`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                <Clock size={10} />
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 pr-1">
                                            {!notification.isRead && (
                                                <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></div>
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(e, notification._id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Delete notification"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ... footer ... */}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
