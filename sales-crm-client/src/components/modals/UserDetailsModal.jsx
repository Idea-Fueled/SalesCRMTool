import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import {
    User, Mail, Briefcase, Building2,
    Calendar, Clock, Info,
    TrendingUp, CheckCircle2, XCircle, DollarSign,
    Shield, Activity
} from "lucide-react";
import { getDeals } from "../../API/services/dealService";

export default function UserDetailsModal({ isOpen, onClose, user, title }) {
    const [stats, setStats] = useState({ deals: 0, won: 0, lost: 0, pipeline: "$0" });
    const [recentDeals, setRecentDeals] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        const fetchUserStats = async () => {
            if (!user || !isOpen) return;
            setLoadingStats(true);
            try {
                // Fetch all deals for this specific user
                const res = await getDeals({ owner: user._id, limit: 1000 });
                const allDeals = res.data.data || [];
                
                // Filter to only this user's deals (backend may return team deals for managers/admins)
                const deals = allDeals.filter(d => {
                    const dealOwnerId = d.ownerId?._id || d.ownerId;
                    return dealOwnerId === user._id || dealOwnerId?.toString() === user._id?.toString();
                });
                
                const wonDeals = deals.filter(d => d.stage === "Closed Won");
                const lostDeals = deals.filter(d => d.stage === "Closed Lost");
                const activeDeals = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
                
                const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                
                setStats({
                    deals: activeDeals.length,
                    won: wonDeals.length,
                    lost: lostDeals.length,
                    pipeline: `$${pipelineValue >= 1000 ? (pipelineValue / 1000).toFixed(1) + 'K' : pipelineValue}`
                });
                
                // Get the 3 most recent deals for this user only
                const sortedRecent = [...deals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
                setRecentDeals(sortedRecent);
                
            } catch (error) {
                console.error("Failed to fetch user stats:", error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchUserStats();
    }, [user, isOpen]);

    if (!user) return null;

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    const colors = ["bg-red-600", "bg-orange-500", "bg-rose-500", "bg-red-400", "bg-pink-600"];
    const avatarColor = colors[(user.firstName?.charCodeAt(0) || 0) % colors.length];

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

    const roleMap = {
        admin: "Administrator",
        sales_manager: "Sales Manager",
        sales_rep: "Sales Representative"
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || "User Profile Details"}>
            <div className="space-y-6">
                {/* Header Profile Section */}
                <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-md flex-shrink-0 overflow-hidden`}>
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt={fullName} className="w-full h-full object-cover" />
                        ) : initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 truncate">{fullName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-red-50 text-red-600 border-red-100`}>
                                {roleMap[user.role] || user.role}
                            </span>
                            <div className={`flex items-center gap-1.5 text-xs font-semibold ${user.isActive ? "text-green-600" : "text-gray-400"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                                {user.isActive ? "Active" : "Inactive"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Performance & Metrics */}
                    <div className="space-y-6">
                        <section className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                                <Activity size={12} className="text-red-500" />
                                Performance Statistics
                            </h4>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-gray-900 leading-none">{stats?.deals || 0}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total Deals</p>
                                </div>
                                <div className="space-y-0.5 border-l border-gray-200 pl-4">
                                    <p className="text-sm font-bold text-green-600 leading-none">{stats?.won || 0}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Closed Won</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-red-500 leading-none">{stats?.lost || 0}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Closed Lost</p>
                                </div>
                                <div className="space-y-0.5 border-l border-gray-200 pl-4">
                                    <p className="text-sm font-bold text-red-600 leading-none">{stats?.pipeline || "$0"}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Pipeline Value</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-1">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Briefcase size={12} className="text-red-400" />
                                Recent Deals
                            </h4>
                            <div className="space-y-2">
                                {recentDeals && recentDeals.length > 0 ? (
                                    recentDeals.slice(0, 3).map(deal => (
                                        <div key={deal._id} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-red-100 transition-colors group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                                    <Building2 size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-gray-700 truncate">{deal.name}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{deal.companyId?.name || deal.companyName || "—"}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-gray-900 flex-shrink-0 ml-2">
                                                ${deal.value?.toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 italic py-2">No recent deal activity recorded.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Contact & Context */}
                    <div className="space-y-6">
                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Mail size={12} className="text-red-400" />
                                Contact Information
                            </h4>
                            <div className="space-y-3 p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                                <div>
                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter block mb-0.5">Email Address</span>
                                    <span className="text-sm font-bold text-red-700 break-all">{user.email}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter block mb-0.5">Phone Number</span>
                                    <span className="text-sm font-bold text-red-700">{user.phoneNumber || "Not provided"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter block mb-0.5">Residential Address</span>
                                    <span className="text-sm font-bold text-red-700">{user.address || "Not provided"}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-100/30">
                                    <Clock size={10} className="text-red-400" />
                                    <span className="text-[10px] text-red-500 font-medium tracking-tight">
                                        Last Active: <span className="font-bold">{formatDate(user.lastLogin)}</span>
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Shield size={12} className="text-red-400" />
                                Security & Access
                            </h4>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Account Setup</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${user.isSetupComplete ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {user.isSetupComplete ? 'Complete' : 'Pending'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Member Since</span>
                                    <span className="text-[11px] font-semibold text-gray-700">
                                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>

                <div className="pt-6">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-100 transition-all active:scale-[0.98]"
                    >
                        Close Profile
                    </button>
                </div>
            </div>
        </Modal>
    );
}
