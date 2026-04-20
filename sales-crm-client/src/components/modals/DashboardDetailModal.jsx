import React from "react";
import Modal from "./Modal";
import { Briefcase, Building2, Users, DollarSign } from "lucide-react";
import { truncateName } from "../../utils/stringUtils";

export default function DashboardDetailModal({ isOpen, onClose, category, data, title }) {
    const getDealOwnerFullName = (deal) =>
        `${deal?.ownerId?.firstName || ""} ${deal?.ownerId?.lastName || ""}`.trim();

    const getDealDisplayName = (deal) => {
        const raw = (deal?.name || "").trim();
        const ownerFullName = getDealOwnerFullName(deal);
        if (/^assigned deal to\b/i.test(raw) && ownerFullName) {
            return `Assigned deal to ${ownerFullName}`;
        }
        return raw;
    };

    const titles = {
        revenue: "Total Revenue Details",
        deals: "Active Deals",
        companies: "Total Companies",
        users: "System Users"
    };

    const icons = {
        revenue: <DollarSign size={20} className="text-red-500" />,
        deals: <Briefcase size={20} className="text-orange-500" />,
        companies: <Building2 size={20} className="text-rose-500" />,
        users: <Users size={18} className="text-gray-500" />
    };

    const renderContent = () => {
        if (!data || data.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-gray-500 font-bold  tracking-widest text-[10px] opacity-60"> 'No ' + $args[0].Groups[1].Value.ToLower() + ' found'  for this category.</p>
                </div>
            );
        }

        switch (category) {
            case "revenue":
            case "deals":
                return (
                    <div className="space-y-4">
                        {data.map((deal) => (
                            <div key={deal._id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wide whitespace-normal leading-tight">
                                            {getDealDisplayName(deal)}
                                        </h4>
                                    </div>
                                    <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                                        ${deal.value?.toLocaleString()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-500">
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[7px] font-bold text-white uppercase overflow-hidden border border-red-200 shrink-0">
                                                {deal.ownerId?.profilePicture ? (
                                                    <img src={deal.ownerId.profilePicture} alt="Owner" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>{deal.ownerId?.firstName?.[0] || "U"}</>
                                                )}
                                            </div>
                                            <span className="truncate">
                                                {(deal.ownerId?.firstName || deal.ownerId?.lastName)
                                                    ? getDealOwnerFullName(deal)
                                                    : (deal.ownerName || "Unassigned")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Building2 size={12} className="shrink-0" />
                                            <span className="truncate">
                                                {deal.companyId?.name || deal.companyName || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 justify-end capitalize font-bold ${deal.stage === 'Closed Lost' ? 'text-red-600' : ''}`}>
                                        <span className={`w-2 h-2 rounded-full ${deal.stage === 'Closed Won' ? 'bg-green-500' : deal.stage === 'Closed Lost' ? 'bg-red-500' : 'bg-orange-400'}`} />
                                        {deal.stage}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case "companies":
                return (
                    <div className="grid grid-cols-1 gap-4">
                        {data.map((company) => (
                            <div key={company._id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wide truncate">{truncateName(company.name)}</h4>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{company.industry || "No Industry specified"}</p>
                                </div>
                                <Building2 size={20} className="text-gray-300 shrink-0" />
                            </div>
                        ))}
                    </div>
                );
            case "users":
                return (
                    <div className="space-y-3">
                        {data.map((user) => (
                            <div key={user._id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-4">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-red-600 flex items-center justify-center font-bold text-white uppercase text-xs overflow-hidden border border-red-200">
                                    {user.profilePicture ? (
                                        <img src={user.profilePicture} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <>{user.firstName?.[0] || ""}{user.lastName?.[0] || ""}</>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</h4>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${user.isSetupComplete ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {user.isSetupComplete ? 'Active' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                title || (
                    <div className="flex items-center gap-3">
                        {category && icons[category]}
                        <span>{category ? titles[category] : ""}</span>
                    </div>
                )
            }
        >
            <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                {renderContent()}
            </div>
        </Modal>
    );
}








