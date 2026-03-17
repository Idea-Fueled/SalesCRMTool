import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import { getDeals } from "../../API/services/dealService";
import { Loader2, DollarSign, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ContactDealsModal({ isOpen, onClose, contact }) {
    const navigate = useNavigate();
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && contact?._id) {
            fetchDeals();
        } else {
            setDeals([]);
        }
    }, [isOpen, contact]);

    const fetchDeals = async () => {
        setLoading(true);
        try {
            const response = await getDeals({ contactId: contact._id });
            setDeals(response.data.data);
        } catch (error) {
            console.error("Error fetching deals:", error);
            toast.error("Failed to load deals for this contact");
        } finally {
            setLoading(false);
        }
    };

    const getStageColor = (stage) => {
        const stages = {
            'Discovery': 'bg-blue-100 text-blue-600',
            'Qualification': 'bg-purple-100 text-purple-600',
            'Proposal': 'bg-orange-100 text-orange-600',
            'Negotiation': 'bg-yellow-100 text-yellow-600',
            'Closed Won': 'bg-green-100 text-green-600',
            'Closed Lost': 'bg-red-100 text-red-600'
        };
        return stages[stage] || 'bg-gray-100 text-gray-600';
    };

    const basePath = window.location.pathname.startsWith('/rep') ? '/rep' :
        window.location.pathname.startsWith('/manager') ? '/manager' : '/dashboard';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Deals for ${contact?.firstName} ${contact?.lastName}`}
        >
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                        <Loader2 className="animate-spin" size={24} />
                        <p className="text-sm font-medium">Loading deals...</p>
                    </div>
                ) : deals.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-gray-400 text-sm font-medium">No active deals found for this contact</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {deals.map((deal) => (
                            <div
                                key={deal._id}
                                onClick={() => {
                                    onClose();
                                    navigate(`${basePath}/deals/${deal._id}`);
                                }}
                                className="group p-4 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-xl transition-all cursor-pointer flex flex-col gap-3"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors uppercase text-xs tracking-wide truncate">
                                            {deal.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${getStageColor(deal.stage)}`}>
                                                {deal.stage}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-green-600 shadow-sm">
                                            <DollarSign size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Value</p>
                                            <p className="text-xs font-bold text-gray-700 mt-0.5 tracking-tight">
                                                ${deal.value?.toLocaleString() || '0'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-sm">
                                            <Calendar size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Close Date</p>
                                            <p className="text-xs font-bold text-gray-700 mt-0.5 tracking-tight">
                                                {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : 'TBD'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
