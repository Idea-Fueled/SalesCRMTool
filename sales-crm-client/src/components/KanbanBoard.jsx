import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, User, CalendarDays, DollarSign, Edit2, Trash2 } from "lucide-react";

const STAGE_CONFIG = {
    Lead: { color: "bg-red-500", light: "bg-red-50 border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
    Qualified: { color: "bg-orange-500", light: "bg-orange-50 border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
    Proposal: { color: "bg-yellow-500", light: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
    Negotiation: { color: "bg-orange-500", light: "bg-orange-50 border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
    "Closed Won": { color: "bg-green-500", light: "bg-green-50 border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700" },
    "Closed Lost": { color: "bg-red-400", light: "bg-red-50 border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
};

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

function formatValue(val) {
    if (!val) return "$0";
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toLocaleString()}`;
}

function DealCard({ deal, onEdit, onDelete }) {
    const navigate = useNavigate();
    const basePath = window.location.pathname.startsWith('/rep') ? '/rep' : '/dashboard';
    const cfg = STAGE_CONFIG[deal.stage] || STAGE_CONFIG["Lead"];
    const closeDate = deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : null;

    return (
        <div
            onClick={() => navigate(`${basePath}/deals/${deal._id}`)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 hover:text-red-600 transition-colors">
                    {deal.name}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(deal);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                    >
                        <Edit2 size={13} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(deal);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Value Badge */}
            <div className="flex items-center gap-1.5 mb-3">
                <span className="text-base font-bold text-green-700">{formatValue(deal.value)}</span>
                {deal.probability != null && (
                    <span className="ml-auto text-[10px] text-gray-400 font-medium">{deal.probability}% prob.</span>
                )}
            </div>

            {/* Details */}
            <div className="space-y-1.5">
                {(deal.companyId?.name || deal.companyName) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Building2 size={11} className="flex-shrink-0 text-gray-400" />
                        <span className="truncate">{deal.companyId?.name || deal.companyName}</span>
                    </div>
                )}
                {(deal.ownerId?.firstName) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User size={11} className="flex-shrink-0 text-gray-400" />
                        <span className="truncate">{deal.ownerId.firstName} {deal.ownerId.lastName}</span>
                    </div>
                )}
                {closeDate && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarDays size={11} className="flex-shrink-0 text-gray-400" />
                        <span>{closeDate}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function KanbanColumn({ stage, deals, onEdit, onDelete }) {
    const cfg = STAGE_CONFIG[stage];
    const colValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

    return (
        <div className="flex-shrink-0 w-72 flex flex-col">
            {/* Column header */}
            <div className={`rounded-xl border ${cfg.light} p-3 mb-3`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                        <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{stage}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
                        {deals.length}
                    </span>
                </div>
                <div className="mt-1.5 text-xs text-gray-500 font-medium pl-4.5">
                    {formatValue(colValue)} total
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3 min-h-[120px]">
                {deals.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-100 h-20 flex items-center justify-center">
                        <p className="text-xs text-gray-300 font-medium">No deals</p>
                    </div>
                ) : (
                    deals.map(deal => (
                        <DealCard
                            key={deal._id}
                            deal={deal}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function KanbanBoard({ deals, onEdit, onDelete }) {
    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = deals.filter(d => d.stage === stage);
        return acc;
    }, {});

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
                {STAGES.map(stage => (
                    <KanbanColumn
                        key={stage}
                        stage={stage}
                        deals={grouped[stage]}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}
