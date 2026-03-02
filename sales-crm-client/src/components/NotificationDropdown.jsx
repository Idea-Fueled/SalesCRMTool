import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Clock, User, Briefcase, ChevronRight } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { formatDistanceToNow } from "date-fns"; // Need to check if installed

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(isOpen => false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case "deal_created": return <Briefcase size={14} className="text-green-500" />;
            case "deal_reassigned": return <User size={14} className="text-blue-500" />;
            case "deal_updated": return <Clock size={14} className="text-orange-500" />;
            default: return <Bell size={14} className="text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[11px] font-bold text-red-600 hover:text-red-700 transition uppercase"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

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
                                    onClick={() => !notification.isRead && markAsRead(notification._id)}
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
                                                {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 bg-red-600 rounded-full mt-1 flex-shrink-0"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-100 text-center bg-gray-50/50">
                        <button className="text-[10px] font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto uppercase">
                            View all history <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
