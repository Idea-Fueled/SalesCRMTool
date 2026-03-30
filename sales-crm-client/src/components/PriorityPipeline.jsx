import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ChevronRight, Briefcase } from "lucide-react";
import { getRankedDeals } from "../API/services/rankService";
import RankBadge from "./RankBadge";

const PriorityPipeline = ({ title = "Priority Pipeline", limit = 5, basePath = "/dashboard" }) => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPriorityDeals = async () => {
            try {
                // Fetch top ranked deals. The backend should ideally support filtering by tier, 
                // but for now we fetch top 20 and filter locally for A/B if needed, 
                // or just show the top X ranked ones.
                const res = await getRankedDeals({ limit: 20 });
                const allDeals = res.data.data || [];
                
                // Show high-priority deals (Tier A and B)
                const priority = allDeals
                    .filter(d => d.aiTier === "A" || d.aiTier === "B")
                    .slice(0, limit);
                
                setDeals(priority);
            } catch (error) {
                console.error("Failed to fetch priority deals:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPriorityDeals();
    }, [limit]);

    if (loading && deals.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse h-[400px]">
                <div className="h-6 w-48 bg-gray-100 rounded mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-gray-50 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-red-600 rounded-full"></div>
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                </div>
                <Zap size={16} className="text-red-500 fill-red-500" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {deals.length > 0 ? (
                    deals.map((deal) => (
                        <div 
                            key={deal._id}
                            onClick={() => navigate(`${basePath}/deals/${deal._id}`)}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:border-red-100 hover:bg-red-50/30 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <RankBadge score={deal.aiScore} tier={deal.aiTier} compact />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">
                                        {deal.name}
                                    </p>
                                    <p className="text-[10px] text-gray-500 truncate mt-0.5 font-medium">
                                        {deal.companyName || deal.companyId?.name || "Unknown Company"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-xs font-black text-gray-900">
                                    ${(deal.value || 0).toLocaleString()}
                                </span>
                                <ChevronRight size={14} className="text-gray-300 group-hover:text-red-400 transition-colors" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                            <Briefcase size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Priority Deals</p>
                        <p className="text-xs text-gray-400 mt-1">High-confidence deals will appear here</p>
                    </div>
                )}
            </div>
            
            {deals.length > 0 && (
                <button 
                    onClick={() => navigate(`${basePath}/deals`)}
                    className="mt-4 w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors border-t border-gray-50 pt-4"
                >
                    View Pipeline
                </button>
            )}
        </div>
    );
};

export default PriorityPipeline;
