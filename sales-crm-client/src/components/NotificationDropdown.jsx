import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Clock, User, Briefcase, ChevronRight, X, ArrowRightLeft, Shield, AlertTriangle } from "lucide-react";
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case "deal_created": return <Briefcase size={14} className="text-emerald-500" />;
            case "deal_reassigned": return <ArrowRightLeft size={14} className="text-violet-500" />;
            case "deal_updated": return <Clock size={14} className="text-amber-500" />;
            case "system": return <Shield size={14} className="text-blue-500" />;
            case "mention": return <User size={14} className="text-rose-500" />;
            default: return <Bell size={14} className="text-slate-500" />;
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read if unread
        if (!notification.isRead) {
            await markAsRead(notification._id);
        }

        // Close dropdown
        setIsOpen(false);

        // Determine destination based on role and entity
        if (!user) return;

        let basePath = "";
        if (user.role === "admin") basePath = "/dashboard";
        else if (user.role === "sales_manager") basePath = "/manager";
        else if (user.role === "sales_rep") basePath = "/rep";

        const { entityType, entityId } = notification;

        switch (entityType) {
            case "Deal":
                navigate(`${basePath}/deals/${entityId}`);
                break;
            case "Company":
                navigate(`${basePath}/companies/${entityId}`);
                break;
            case "Contact":
                navigate(`${basePath}/contacts/${entityId}`);
                break;
            case "User":
                if (user.role === "admin") navigate("/dashboard/users");
                else if (user.role === "sales_manager") navigate("/manager/team");
                break;
            default:
                navigate(basePath);
                break;
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent navigation when deleting
        await deleteNotification(id);
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
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50/80 transition-all cursor-pointer relative group ${!notification.isRead ? "bg-red-50/30" : ""}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${!notification.isRead ? "bg-white shadow-sm border border-red-100" : "bg-gray-100"}`}>
                                            {getTypeIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[12px] leading-relaxed ${!notification.isRead ? "font-semibold text-gray-900" : "text-gray-600 font-medium"}`}>
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                    <Clock size={10} className="opacity-70" />
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </p>
                                                {!notification.isRead && (
                                                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded">New</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <button
                                                onClick={(e) => handleDelete(e, notification._id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete notification"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-100 text-center bg-gray-50/50">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                if (user?.role === "admin") navigate("/dashboard/audit-logs");
                            }}
                            className="text-[10px] font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto uppercase"
                        >
                            View all history <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
