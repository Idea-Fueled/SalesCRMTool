import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDealById, updateDeal, deleteDeal } from "../../../API/services/dealService";
import { getCompanies } from "../../../API/services/companyService";
import { getContacts } from "../../../API/services/contactService";
import { getTeamUsers } from "../../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import DealModal from "../../components/modals/DealModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import {
    Briefcase, Building2, User, DollarSign,
    Calendar, Clock, Target, Info,
    TrendingUp, ArrowLeft, Tag, Share2, Loader2,
    Star, RotateCw, Maximize2, Lock, ThumbsUp, Shield,
    MoreHorizontal, Download, ChevronRight,
    MapPin, Mail, Phone, FileText, Paperclip, List, History, MessageSquare,
    Edit2, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { exportToPDF } from "../../utils/pdfExport";

const pipelineStages = [
    { id: "Lead", label: "Lead" },
    { id: "Qualified", label: "Qualified" },
    { id: "Proposal", label: "Proposal" },
    { id: "Negotiation", label: "Negotiation" },
    { id: "Closed Won", label: "Closed Won" },
    { id: "Closed Lost", label: "Closed Lost" }
];

const formatDate = (date, includeTime = false) => {
    if (!date) return "Not Set";
    const options = {
        day: "numeric",
        month: "short",
        year: "numeric",
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(date).toLocaleString("en-IN", options);
};

export default function DealDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [deal, setDeal] = useState(null);
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Remarks State
    const [newRemark, setNewRemark] = useState("");
    const [savingRemark, setSavingRemark] = useState(false);

    const fetchDealData = async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            const [dealRes, usersRes, companiesRes, contactsRes] = await Promise.all([
                getDealById(id),
                getTeamUsers(),
                getCompanies({ limit: 1000 }),
                getContacts({ limit: 1000 })
            ]);
            setDeal(dealRes.data.data);
            setUsers(usersRes.data || []);
            setCompanies(companiesRes.data.data);
            setContacts(contactsRes.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch deal details");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDealData();
    }, [id]);

    // Compute base path early so handlers can use it
    const basePath = window.location.pathname.startsWith('/rep') ? '/rep' :
        window.location.pathname.startsWith('/manager') ? '/manager' : '/dashboard';

    // Role-based authorization
    const canEdit = (() => {
        if (!currentUser || !deal) return false;
        const role = currentUser.role;
        const ownerId = deal.ownerId?._id || deal.ownerId;
        if (role === "admin") return true;
        if (role === "sales_manager") {
            // Manager can edit their own deals or their team's deals
            // deal.ownerId.managerId indicates the owner's manager
            const ownerManagerId = deal.ownerId?.managerId?._id || deal.ownerId?.managerId;
            return ownerId === currentUser._id || ownerManagerId === currentUser._id;
        }
        if (role === "sales_rep") {
            return ownerId === currentUser._id;
        }
        return false;
    })();

    const handleSaveDeal = async (formData) => {
        try {
            await updateDeal(deal._id, formData);
            toast.success("Deal updated successfully");
            setIsEditModalOpen(false);
            // Refresh deal
            const res = await getDealById(id);
            setDeal(res.data.data);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update deal");
        }
    };

    const handleAddRemark = async () => {
        if (!newRemark.trim()) return;
        setSavingRemark(true);
        try {
            const timestamp = formatDate(new Date(), true);
            const author = `${currentUser?.firstName || "Unknown"} ${currentUser?.lastName || ""}`.trim();
            const remarkEntry = `\n\n[${timestamp}] Added by ${author}\n${newRemark.trim()}`;
            
            const updatedRemarks = (deal.remarks || "").trim() + remarkEntry;
            
            await updateDeal(deal._id, { remarks: updatedRemarks });
            
            // Refresh logic and reset
            setDeal(prev => ({ ...prev, remarks: updatedRemarks }));
            setNewRemark("");
            toast.success("Remark added successfully");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add remark");
        } finally {
            setSavingRemark(false);
        }
    };

    const handleDeleteDeal = async () => {
        try {
            await deleteDeal(deal._id);
            toast.success("Deal deleted successfully");
            navigate(`${basePath}/deals`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete deal");
        }
    };

    const getInitials = (name) => {
        if (!name) return "D";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-red-500" />
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-semibold">Deal not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-red-500 hover:text-red-600 font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft size={18} /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div id="exportable-deal-details" className="min-h-screen bg-gray-50/50 p-6 space-y-6 relative">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-orange-100 border-4 border-white shadow-md flex items-center justify-center text-orange-500 text-2xl font-black ring-1 ring-orange-100 uppercase">
                        {getInitials(deal.name)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 leading-none">{deal.name}</h1>
                            <Star size={18} className="text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Building2 size={14} className="text-gray-300" />
                                <button
                                    onClick={() => deal.companyId?._id && navigate(`${basePath}/companies/${deal.companyId._id}`)}
                                    className="hover:text-red-600 underline decoration-gray-200 underline-offset-4"
                                >
                                    {deal.companyId?.name || deal.companyName || "No Company"}
                                </button>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <MapPin size={12} className="text-gray-300" />
                                    <span>{deal.companyId?.address || "Location not specified"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-red-500 font-bold">
                                    <User size={12} className="text-red-400" />
                                    {deal.contactId?._id ? (
                                        <button
                                            onClick={() => navigate(`${basePath}/contacts/${deal.contactId._id}`)}
                                            className="hover:underline"
                                        >
                                            {deal.contactId.firstName} {deal.contactId.lastName}
                                        </button>
                                    ) : (
                                        <span>{deal.contactName || "No Contact"}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 no-print">
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => exportToPDF('exportable-deal-details', `${deal.name}_Details.pdf`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Download size={16} className="text-gray-500" /> Export PDF
                        </button>
                    )}
                    {canEdit && (
                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit Deal"
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-all active:scale-[0.97]"
                            >
                                <Edit2 size={11} /> Edit
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                title="Delete Deal"
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-all active:scale-[0.97]"
                            >
                                <Trash2 size={11} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Information */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Deals Information */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Commercial Parameters</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign size={10} className="text-green-500" /> Deal Value
                                </label>
                                <p className="text-sm font-bold text-gray-900">{deal.currency} {deal.value?.toLocaleString() || "0"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <TrendingUp size={10} className="text-blue-500" /> Win Probability
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${deal.probability || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-gray-900">{deal.probability || 0}%</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar size={10} className="text-red-400" /> Expected Close
                                </label>
                                <p className="text-sm font-bold text-gray-900">{formatDate(deal.expectedCloseDate)}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target size={10} className="text-purple-500" /> Lead Source
                                </label>
                                <p className="text-sm font-bold text-gray-900 capitalize">{deal.source || "Direct Identification"}</p>
                            </div>
                            
                            {/* Notes displayed in Commercial Parameters */}
                            <div className="space-y-1 pt-2 border-t border-gray-50">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                    <FileText size={10} className="text-gray-400" /> Interaction Notes
                                </label>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner max-h-[300px] overflow-y-auto">
                                    {deal.notes ? deal.notes : <span className="text-gray-400 italic">No notes yet. Add a remark from the right panel.</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Strategic Owner */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Executive Ownership</h3>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm ring-1 ring-red-100">
                                    {deal.ownerId?.firstName?.[0]}{deal.ownerId?.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900 leading-none">{deal.ownerId?.firstName} {deal.ownerId?.lastName || ""}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Strategic Account Manager</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stage History */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pipeline Transition Log</h3>
                            <button
                                onClick={() => fetchDealData(true)}
                                disabled={isRefreshing}
                                className={`text-gray-300 hover:text-red-500 transition-all ${isRefreshing ? "animate-spin text-red-500" : ""}`}
                                title="Refresh History"
                            >
                                <RotateCw size={12} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {(!deal.stageHistory || deal.stageHistory.length === 0) ? (
                                <p className="text-xs text-gray-400 italic text-center py-4">No historical transitions recorded.</p>
                            ) : (
                                deal.stageHistory.map((history, idx) => (
                                    <div key={idx} className="relative pl-6 pb-6 last:pb-0 border-l border-gray-100 last:border-0">
                                        <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-red-400 border-2 border-white ring-1 ring-red-100" />
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-gray-900 uppercase">{history.stage}</span>
                                                <span className="text-[9px] font-bold text-gray-400">{formatDate(history.changedAt)}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-medium">
                                                By {history.changedBy?.firstName ? `${history.changedBy.firstName} ${history.changedBy.lastName || ""}` : (typeof history.changedBy === 'string' ? "System" : "Unknown")}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Pipeline & Interactions */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Pipeline Status */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Symmetric Pipeline Status</h3>
                        <div className="flex flex-wrap items-center">
                            {pipelineStages.map((stage, index) => {
                                const currentStageIndex = pipelineStages.findIndex(s => s.id === deal.stage);
                                const isPast = index < currentStageIndex;
                                const isCurrent = deal.stage === stage.id;

                                return (
                                    <div key={stage.id} className="flex-1 min-w-[120px] relative group h-12 mb-2 mr-2">
                                        <div className={`
                                            h-full w-full flex items-center justify-center text-[10px] font-black px-4
                                            transition-all duration-300 cursor-default uppercase tracking-widest
                                            ${isCurrent
                                                ? (index === 0 ? "bg-blue-600 text-white" :
                                                    index === 1 ? "bg-amber-400 text-white" :
                                                        index === 2 ? "bg-orange-600 text-white" :
                                                            index === 3 ? "bg-pink-600 text-white" :
                                                                index === 4 ? "bg-green-600 text-white" :
                                                                    index === 5 ? "bg-red-600 text-white" :
                                                                        "bg-gray-200 text-gray-500")
                                                : isPast ? "bg-gray-800 text-white opacity-40" : "bg-gray-100 text-gray-400"}
                                            ${index === 0 ? "rounded-l-xl" : ""}
                                            ${index === pipelineStages.length - 1 ? "rounded-r-xl" : ""}
                                            relative z-10
                                        `}
                                            style={{
                                                clipPath: index === 0
                                                    ? "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)"
                                                    : index === pipelineStages.length - 1
                                                        ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10% 50%)"
                                                        : "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%)"
                                            }}>
                                            {stage.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[450px]">
                        <div className="px-6 h-14 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Remarks</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                <MessageSquare size={12} /> Communication History
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Narratives/Notes */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <MessageSquare size={10} /> Add New Remark
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner max-h-[300px] overflow-y-auto">
                                    {deal.remarks ? (
                                        deal.remarks.split('\n').map((line, i) => {
                                            const isHeader = line.trim().match(/^-*\s*\[.*?\] Added by .*?-*$/);
                                            if (isHeader) {
                                                return <span key={i} className="block text-[11px] text-gray-400 mt-4 mb-1">{line.replace(/-/g, '').trim()}</span>;
                                            }
                                            return <span key={i} className="block min-h-[1rem]">{line}</span>;
                                        })
                                    ) : (
                                        <span className="text-gray-400 italic">No remarks yet. Add a remark below.</span>
                                    )}
                                </div>
                                
                                {/* Add Remark Input */}
                                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-3 no-print">
                                    <textarea
                                        value={newRemark}
                                        onChange={(e) => setNewRemark(e.target.value)}
                                        placeholder="Type a new remark to append..."
                                        className="w-full min-h-[80px] p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:bg-white transition resize-y font-normal text-gray-800"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleAddRemark}
                                            disabled={savingRemark || !newRemark.trim()}
                                            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {savingRemark ? (
                                                <><Loader2 size={12} className="animate-spin" /> Saving...</>
                                            ) : (
                                                <><MessageSquare size={12} /> Add Remark</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Internal Metadata */}
                            <div className="pt-8 border-t border-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrative Metadata</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Unified ID</span>
                                                <span className="text-[10px] font-mono font-bold text-gray-600">{deal._id}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Schema Sync</span>
                                                <span className="text-[10px] font-bold text-green-600 uppercase">Synchronized</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Relationship Links</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-lg bg-gray-50/50 border border-gray-100 flex flex-col items-center justify-center text-center">
                                                <Paperclip size={14} className="text-gray-300 mb-1" />
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">0 Digital Assets</span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-gray-50/50 border border-gray-100 flex flex-col items-center justify-center text-center">
                                                <Mail size={14} className="text-gray-300 mb-1" />
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">1 Message Logged</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Meta Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-300" /> Origin: {formatDate(deal.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-300" /> Latest Sync: {formatDate(deal.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>Active Deal Stream</span>
                </div>
            </div>
            {/* Edit Deal Modal */}
            <DealModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                deal={deal}
                onSave={handleSaveDeal}
                companies={companies}
                contacts={contacts}
                userRole={currentUser?.role}
                potentialOwners={users}
                currentUserId={currentUser?._id || currentUser?.id}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteDeal}
                itemName={deal?.name}
            />
        </div>
    );
}
