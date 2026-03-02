import React from "react";
import Modal from "./Modal";
import {
    Briefcase, Building2, User, DollarSign,
    Calendar, Clock, Target, Info,
    TrendingUp, ArrowRight, Tag, Share2
} from "lucide-react";

export default function DealDetailsModal({ isOpen, onClose, deal }) {
    if (!deal) return null;

    const initials = deal.name?.substring(0, 2).toUpperCase() || "DL";
    const colors = ["bg-red-600", "bg-orange-500", "bg-rose-500", "bg-red-400", "bg-pink-600"];
    const avatarColor = colors[(deal.name?.charCodeAt(0) || 0) % colors.length];

    const formatDate = (date) => {
        if (!date) return "Not Set";
        return new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const stageBadge = {
        Lead: "bg-red-50 text-red-600 border border-red-100",
        Qualified: "bg-orange-50 text-orange-700 border border-orange-100",
        Proposal: "bg-yellow-50 text-yellow-700 border border-yellow-100",
        Negotiation: "bg-orange-50 text-orange-700 border border-orange-100",
        "Closed Won": "bg-green-100 text-green-700 border border-green-200",
        "Closed Lost": "bg-red-100 text-red-700 border border-red-200",
    };

    const getProbabilityColor = (prob) => {
        if (prob >= 75) return "text-green-600";
        if (prob >= 40) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Opportunity Intelligence">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-md flex-shrink-0`}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 truncate">{deal.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stageBadge[deal.stage] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                {deal.stage}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-500 font-medium">
                                {deal.currency} {deal.value?.toLocaleString() || "0"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Financials & Timeline */}
                    <div className="space-y-6">
                        <section className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                                <DollarSign size={12} className="text-red-500" />
                                Deal Economics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-gray-900 leading-none">
                                        {deal.currency} {deal.value?.toLocaleString() || "0"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Value</p>
                                </div>
                                <div className="space-y-1 border-l border-gray-200 pl-4">
                                    <p className={`text-lg font-bold leading-none ${getProbabilityColor(deal.probability)}`}>
                                        {deal.probability}%
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Probability</p>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-2 gap-4 px-1">
                            <div>
                                <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <Calendar size={12} className="text-red-400" />
                                    Expected Close
                                </h4>
                                <p className="text-sm font-semibold text-gray-700">{formatDate(deal.expectedCloseDate)}</p>
                            </div>
                            <div>
                                <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <Target size={12} className="text-red-400" />
                                    Source
                                </h4>
                                <p className="text-sm font-semibold text-gray-700">{deal.source || "Direct"}</p>
                            </div>
                        </section>

                        <section className="px-1">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Building2 size={12} className="text-red-400" />
                                Linked Records
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                            <Building2 size={14} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 truncate">{deal.companyId?.name || deal.companyName}</span>
                                    </div>
                                    <ArrowRight size={14} className="text-gray-300" />
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                            <User size={14} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 truncate">{deal.contactId ? `${deal.contactId.firstName || ""} ${deal.contactId.lastName || ""}`.trim() : (deal.contactName || "No Contact")}</span>
                                    </div>
                                    <ArrowRight size={14} className="text-gray-300" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Ownership & Logic */}
                    <div className="space-y-6">
                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Tag size={12} className="text-red-400" />
                                Ownership info
                            </h4>
                            <div className="flex flex-col p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter mb-1">Assigned Executive</span>
                                <span className="text-sm font-bold text-red-700">
                                    {`${deal.ownerId?.firstName || ""} ${deal.ownerId?.lastName || ""}`.trim() || "Not Assigned"}
                                </span>
                                <span className="text-[10px] text-red-400/80 italic mt-0.5">Strategic Account Unit</span>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Info size={12} className="text-red-400" />
                                Strategic Overview
                            </h4>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed italic h-32 overflow-y-auto custom-scrollbar shadow-inner">
                                {deal.notes || "No strategic overview provided for this mandate."}
                            </div>
                        </section>

                        <div className="pt-2">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase">
                                    <Clock size={10} className="text-gray-300" />
                                    Created: <span className="text-gray-600">{formatDate(deal.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase">
                                    <Clock size={10} className="text-gray-300" />
                                    Last Modified: <span className="text-gray-600">{formatDate(deal.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-100 transition-all active:scale-[0.98]"
                    >
                        Close Intelligence
                    </button>
                </div>
            </div>
        </Modal>
    );
}
