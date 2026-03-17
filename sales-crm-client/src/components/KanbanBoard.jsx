import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Building2, User, CalendarDays, DollarSign, Edit2, Trash2, 
    GripVertical, TrendingUp, Clock, CheckCircle2 
} from "lucide-react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STAGE_CONFIG = {
    Lead: { color: "bg-[#2b39cc]", light: "bg-[#2b39cc10] border-[#2b39cc20]", text: "text-[#2b39cc]", badge: "bg-[#2b39cc15] text-[#2b39cc]" },
    Qualified: { color: "bg-[#f9b115]", light: "bg-[#f9b11510] border-[#f9b11520]", text: "text-[#f9b115]", badge: "bg-[#f9b11515] text-[#f9b115]" },
    Proposal: { color: "bg-[#ec602d]", light: "bg-[#ec602d10] border-[#ec602d20]", text: "text-[#ec602d]", badge: "bg-[#ec602d15] text-[#ec602d]" },
    Negotiation: { color: "bg-[#d63384]", light: "bg-[#d6338410] border-[#d6338420]", text: "text-[#d63384]", badge: "bg-[#d6338415] text-[#d63384]" },
    "Closed Won": { color: "bg-[#2eb85c]", light: "bg-[#2eb85c10] border-[#2eb85c20]", text: "text-[#2eb85c]", badge: "bg-[#2eb85c15] text-[#2eb85c]" },
    "Closed Lost": { color: "bg-[#e55353]", light: "bg-[#e5535310] border-[#e5535320]", text: "text-[#e55353]", badge: "bg-[#e5535315] text-[#e55353]" },
};

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

function formatValue(val) {
    if (!val) return "$0";
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toLocaleString()}`;
}

function SortableDealCard({ deal, onEdit, onDelete, isOverlay = false }) {
    const navigate = useNavigate();
    const basePath = window.location.pathname.startsWith('/rep') ? '/rep' : (window.location.pathname.startsWith('/manager') ? '/manager' : '/dashboard');
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: deal._id,
        data: {
            type: 'Deal',
            deal,
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const closeDate = deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 h-[140px] w-full"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                bg-white rounded-xl border border-gray-100 shadow-sm p-4 group 
                hover:shadow-lg hover:border-red-100 transition-all duration-300 cursor-default
                relative overflow-hidden
                ${isOverlay ? 'shadow-2xl border-red-200 scale-105 z-[100]' : ''}
            `}
        >
            {/* Grab Handle */}
            <div 
                {...attributes} 
                {...listeners}
                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={14} />
            </div>

            <div className="space-y-3">
                <div onClick={() => navigate(`${basePath}/deals/${deal._id}`)} className="cursor-pointer">
                    <p className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-red-600 transition-colors pr-6">
                        {deal.name}
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">{formatValue(deal.value)}</span>
                    {deal.probability != null && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            <TrendingUp size={10} />
                            {deal.probability}%
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-gray-50 space-y-2">
                    {(deal.companyId?.name || deal.companyName) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <Building2 size={12} className="text-gray-400" />
                            <span className="truncate font-medium">{deal.companyId?.name || deal.companyName}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Clock size={12} />
                            <span>{closeDate || "No date"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                                <Edit2 size={12} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(deal); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KanbanColumn({ stage, deals, onEdit, onDelete }) {
    const { setNodeRef } = useDroppable({
        id: stage,
    });
    const cfg = STAGE_CONFIG[stage];
    const colValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

    return (
        <div 
            ref={setNodeRef}
            className="flex-shrink-0 w-[300px] flex flex-col bg-gray-50/40 rounded-2xl p-3 h-full"
        >
            {/* Column header */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} shadow-[0_0_8px] shadow-current`} />
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">{stage}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 h-5 px-1.5 flex items-center justify-center rounded-lg min-w-[24px]">
                        {deals.length}
                    </span>
                </div>
                <div className="text-[11px] font-bold text-gray-400 pl-4.5">
                    {formatValue(colValue)} Total
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1 min-h-[200px]">
                <SortableContext
                    id={stage}
                    items={deals.map(d => d._id)}
                    strategy={verticalListSortingStrategy}
                >
                    {deals.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-100 h-24 flex flex-col items-center justify-center gap-1 bg-white/50">
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">No deals here</p>
                        </div>
                    ) : (
                        deals.map(deal => (
                            <SortableDealCard
                                key={deal._id}
                                deal={deal}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    );
}

export default function KanbanBoard({ deals, onEdit, onDelete, onMove }) {
    const [activeId, setActiveId] = useState(null);
    const [activeDeal, setActiveDeal] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = deals.filter(d => d.stage === stage);
        return acc;
    }, {});

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);
        setActiveDeal(active.data.current.deal);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        setActiveId(null);
        setActiveDeal(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Try to find the target stage
        let newStage = null;
        
        if (STAGES.includes(overId)) {
            // Dropped directly on a column
            newStage = overId;
        } else {
            // Dropped on a card, find its stage via deal data or SortableContext container
            const overData = over.data?.current;
            if (overData?.deal?.stage) {
                newStage = overData.deal.stage;
            } else if (overData?.sortable?.containerId) {
                newStage = overData.sortable.containerId;
            } else {
                // Fallback: search in deals
                const overDeal = deals.find(d => d._id === overId);
                if (overDeal) {
                    newStage = overDeal.stage;
                }
            }
        }

        const activeDeal = deals.find(d => d._id === activeId);
        if (activeDeal && newStage && activeDeal.stage !== newStage && STAGES.includes(newStage)) {
            onMove && onMove(activeId, newStage);
        }
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="overflow-x-auto pb-4 -mx-1 px-1">
                <div className="flex gap-5 min-w-max h-[calc(100vh-380px)] min-h-[500px]">
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

            <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? (
                    <SortableDealCard 
                        deal={activeDeal} 
                        isOverlay={true}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
