import React from "react";
import { Briefcase, DollarSign, TrendingUp, Calendar, MoreVertical, Eye, Edit2, Trash2, Building2, User } from "lucide-react";
import { truncateName } from "../../utils/stringUtils";

const stageBadge = {
    Lead: "bg-red-50 text-red-600 border border-red-100",
    Qualified: "bg-orange-100 text-orange-700",
    Proposal: "bg-yellow-100 text-yellow-700",
    Negotiation: "bg-orange-100 text-orange-700",
    "Closed Won": "bg-green-100 text-green-700",
    "Closed Lost": "bg-red-100 text-red-700",
};

const DealCard = ({ deal, onEdit, onDelete, onView }) => {
    return (
        <div
            onClick={() => onView(deal)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full cursor-pointer hover:border-red-200"
        >
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:from-red-50 group-hover:to-red-100 group-hover:border-red-100 group-hover:text-red-500 transition-all duration-300 flex-shrink-0">
                            <Briefcase size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors uppercase text-xs tracking-wide">
                                {truncateName(deal.name)}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase truncate ${stageBadge[deal.stage] || "bg-gray-100 text-gray-600"}`}>
                                    {deal.stage}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="relative group/menu flex-shrink-0">
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        >
                            <MoreVertical size={18} />
                        </button>
                        <div className="absolute right-0 top-full pt-1 hidden group-hover/menu:block z-20 w-32">
                            <div className="bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onView(deal); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                    <Eye size={14} /> View
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onEdit(deal); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(deal); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-500">
                            <DollarSign size={14} className="text-green-500" />
                            <span className="text-sm font-bold text-gray-800">${deal.value?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <TrendingUp size={12} className="text-blue-500" />
                            <span className="text-[11px] font-bold">{deal.probability || 0}%</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-gray-500">
                        <Building2 size={14} className="text-gray-300 font-bold" />
                        <span className="text-xs truncate font-medium">{deal.companyId?.name || deal.companyName || "No Company"}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-gray-500">
                        <User size={14} className="text-red-400" />
                        <span className="text-xs truncate font-medium">
                            {deal.contactId ? `${deal.contactId.firstName} ${deal.contactId.lastName}` : (deal.contactName || "No Contact")}
                        </span>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {deal.ownerId?.firstName?.[0] || "U"}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                        {deal.ownerId?.firstName} {deal.ownerId?.lastName || ""}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold">
                        {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : "No Date"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DealCard;
