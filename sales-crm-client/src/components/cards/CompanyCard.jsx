import React from "react";
import { Building2, Star, MoreVertical, Eye, Edit2, Trash2, Phone, MapPin, Mail, ExternalLink } from "lucide-react";

const statusBg = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-red-100 text-red-600",
    Prospect: "bg-blue-100 text-blue-600",
};

const CompanyCard = ({ company, onEdit, onDelete, onView }) => {
    return (
        <div
            onClick={() => onView(company)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full cursor-pointer hover:border-red-200"
        >
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:from-red-50 group-hover:to-red-100 group-hover:border-red-100 group-hover:text-red-500 transition-all duration-300">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors uppercase text-xs tracking-wide">
                                {company.name}
                            </h3>
                        </div>
                    </div>
                    <div className="relative group/menu">
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        >
                            <MoreVertical size={18} />
                        </button>
                        <div className="absolute right-0 top-full pt-1 hidden group-hover/menu:block z-20 w-32">
                            <div className="bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onView(company); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                    <Eye size={14} /> View
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onEdit(company); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(company); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500">
                        <Phone size={14} className="flex-shrink-0" />
                        <span className="text-xs truncate">{company.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="text-xs truncate">{company.address || "—"}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBg[company.status] || "bg-gray-100 text-gray-600"}`}>
                        {company.status}
                    </span>
                    {company.industry && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-gray-50 text-gray-500 border border-gray-100">
                            {company.industry}
                        </span>
                    )}
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-700 uppercase">
                        {company.ownerId?.firstName?.[0] || "S"}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                        {company.ownerId ? `${company.ownerId.firstName} ${company.ownerId.lastName || ""}` : "System"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Mail size={12} className="text-gray-400 hover:text-red-500 cursor-pointer" />
                    <Phone size={12} className="text-gray-400 hover:text-red-500 cursor-pointer" />
                    <ExternalLink size={12} className="text-gray-400 hover:text-red-500 cursor-pointer" />
                </div>
            </div>
        </div>
    );
};

export default CompanyCard;
