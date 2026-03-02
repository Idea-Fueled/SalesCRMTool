import React from "react";
import Modal from "./Modal";
import {
    Building2, Globe, Phone, MapPin,
    Calendar, Clock, Users, Briefcase,
    TrendingUp, FileText, Share2
} from "lucide-react";

export default function CompanyDetailsModal({ isOpen, onClose, company }) {
    if (!company) return null;

    const initials = company.name?.substring(0, 2).toUpperCase() || "CO";
    const colors = ["bg-red-500", "bg-orange-500", "bg-red-600", "bg-rose-500", "bg-red-400"];
    const avatarColor = colors[(company.name?.charCodeAt(0) || 0) % colors.length];

    const formatDate = (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const statusBadge = {
        Lead: "bg-red-50 text-red-600 border-red-100",
        Prospect: "bg-orange-50 text-orange-600 border-orange-100",
        Customer: "bg-green-50 text-green-700 border-green-100",
        Churned: "bg-gray-100 text-gray-600 border-gray-200",
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Company Information">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-md flex-shrink-0`}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 truncate">{company.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadge[company.status] || "bg-gray-100 text-gray-600"}`}>
                                {company.status || "Lead"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-500 font-medium">{company.industry || "General Industry"}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Primary Details */}
                    <div className="space-y-5">
                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Globe size={12} className="text-red-400" />
                                Online Presence
                            </h4>
                            <div className="space-y-2">
                                <div className="flex flex-col">
                                    <a
                                        href={company.website?.startsWith('http') ? company.website : `https://${company.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                        {company.website || "No website listed"}
                                        {company.website && <Share2 size={10} />}
                                    </a>
                                    <span className="text-[10px] text-gray-400 italic">Official Website</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Users size={12} className="text-red-400" />
                                Firmographics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700">{company.size || "Unknown"}</span>
                                    <span className="text-[10px] text-gray-400 italic">Company Size</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700">{company.revenueRange || "—"}</span>
                                    <span className="text-[10px] text-gray-400 italic">Annual Revenue</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <MapPin size={12} className="text-red-400" />
                                Location
                            </h4>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700 leading-snug">{company.address || "No address provided"}</span>
                                {company.phone && (
                                    <span className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                        <Phone size={10} /> {company.phone}
                                    </span>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Ownership & System Info */}
                    <div className="space-y-5">
                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Briefcase size={12} className="text-red-400" />
                                Internal Info
                            </h4>
                            <div className="flex flex-col p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                                <span className="text-xs text-red-400 font-bold uppercase tracking-tighter mb-1">Strategic Owner</span>
                                <span className="text-sm font-bold text-red-700">
                                    {company.ownerId ? `${company.ownerId.firstName || ""} ${company.ownerId.lastName || ""}`.trim() : "Not Assigned"}
                                </span>
                                <span className="text-[10px] text-red-400/80 italic mt-0.5">{company.ownerId?.email || "No contact info"}</span>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <FileText size={12} className="text-red-400" />
                                Additional Notes
                            </h4>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed italic max-h-24 overflow-y-auto custom-scrollbar">
                                {company.notes || "No internal notes available for this organization."}
                            </div>
                        </section>

                        <div className="pt-2">
                            <div className="flex items-center gap-4 text-[10px] text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    <span>Added: <span className="font-semibold text-gray-500">{formatDate(company.createdAt)}</span></span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>Updated: <span className="font-semibold text-gray-500">{formatDate(company.updatedAt)}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-100 transition-all active:transform active:scale-[0.98]"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </Modal>
    );
}
