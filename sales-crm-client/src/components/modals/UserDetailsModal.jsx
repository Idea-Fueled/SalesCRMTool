import React from "react";
import Modal from "./Modal";
import { Mail, Shield, User, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";

export default function UserDetailsModal({ isOpen, onClose, user }) {
    if (!user) return null;

    const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    const colors = ["bg-red-500", "bg-orange-500", "bg-red-600", "bg-rose-500", "bg-red-400", "bg-pink-500", "bg-red-300"];
    const avatarColor = colors[(user.firstName?.charCodeAt(0) || 0) % colors.length];

    const formatRole = (r) => ({
        admin: "ADMIN",
        sales_manager: "SALES MANAGER",
        sales_rep: "SALES REPRESENTATIVE"
    }[r] || r?.toUpperCase());

    const roleBadge = {
        admin: "bg-red-100 text-red-700 border-red-200",
        sales_manager: "bg-orange-100 text-orange-700 border-orange-200",
        sales_rep: "bg-red-50 text-red-600 border-red-100",
    };

    const formatDate = (date) => {
        if (!date) return "Never";
        return new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="User Profile Details">
            <div className="space-y-6">
                {/* Header Information */}
                <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-sm flex-shrink-0`}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 truncate">{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</h2>
                        <div className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge[user.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {formatRole(user.role)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Information Sections */}
                    <div className="space-y-4">
                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Mail size={12} className="text-gray-400" />
                                Contact Details
                            </h4>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700">{user.email}</span>
                                <span className="text-[11px] text-gray-400 italic">Primary Business Email</span>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Shield size={12} className="text-gray-400" />
                                Account Status
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {user.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                    {user.isActive ? "ACTIVE" : "DEACTIVATED"}
                                </span>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-4">
                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <User size={12} className="text-gray-400" />
                                Reporting To
                            </h4>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700 truncate">
                                    {user.managerId ? `${user.managerId.firstName || ""} ${user.managerId.lastName || ""}`.trim() : "No Direct Manager"}
                                </span>
                                <span className="text-[11px] text-gray-400 italic">Assigned Supervisor</span>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Clock size={12} className="text-gray-400" />
                                Last Activity
                            </h4>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700">{formatDate(user.lastLogin)}</span>
                                <span className="text-[11px] text-gray-400 italic">User's last successful session</span>
                            </div>
                        </section>
                    </div>
                </div>

                {/* System Timestamps */}
                <div className="pt-4 mt-2 border-t border-gray-100 flex flex-wrap gap-x-8 gap-y-2">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-300" />
                        <span className="text-[11px] text-gray-400">Created: <span className="font-semibold text-gray-500">{formatDate(user.createdAt)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-gray-300" />
                        <span className="text-[11px] text-gray-400">Last Modified: <span className="font-semibold text-gray-500">{formatDate(user.updatedAt)}</span></span>
                    </div>
                </div>

                <div className="flex pt-2">
                    <button onClick={onClose} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-100 transition-all active:scale-[0.98]">
                        Close Profile
                    </button>
                </div>
            </div>
        </Modal>
    );
}
