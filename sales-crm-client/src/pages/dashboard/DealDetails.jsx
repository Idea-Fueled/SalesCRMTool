import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDealById, updateDeal, deleteDeal, addRemark } from "../../API/services/dealService";
import { getCompanies } from "../../API/services/companyService";
import { getContacts } from "../../API/services/contactService";
import { getTeamUsers } from "../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import DealModal from "../../components/modals/DealModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import {
    Briefcase, Building2, User, DollarSign,
    Calendar, Clock, Target, Info,
    TrendingUp, ArrowLeft, Tag, Share2, Loader2,
    RotateCw, Maximize2, Lock, ThumbsUp, Shield,
    MoreHorizontal, Download, ChevronRight, Layers,
    MapPin, Mail, Phone, FileText, Paperclip, List, History, MessageSquare,
    Edit2, Trash2, X
} from "lucide-react";
import toast from "react-hot-toast";
import { exportToPDF } from "../../utils/pdfExport";
import { isDealOverdue } from "../../utils/dateUtils";

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
    const [remarkFiles, setRemarkFiles] = useState([]);
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
        if (role === "admin" || role === "sales_manager") return true;
        if (role === "sales_rep") {
            return ownerId === (currentUser._id || currentUser.id);
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

    const formatFileUrl = (url, fileType) => {
        if (!url) return "#";
        // If it's a Cloudinary URL and not an image, ensure fl_attachment is present
        if (url.includes("cloudinary.com") && !fileType?.startsWith("image/")) {
            if (!url.includes("fl_attachment")) {
                return url.replace("/upload/", "/upload/fl_attachment/");
            }
        }
        return url;
    };

    const handleAddRemark = async () => {
        if (!newRemark.trim() && remarkFiles.length === 0) return;
        setSavingRemark(true);
        try {
            const formData = new FormData();
            formData.append("text", newRemark.trim());
            remarkFiles.forEach(file => formData.append("files", file));
            
            const res = await addRemark(deal._id, formData);
            
            // Refresh logical state
            const updatedRemarks = Array.isArray(deal.remarks) ? [...deal.remarks, res.data.data] : [res.data.data];
            setDeal(prev => ({ 
                ...prev, 
                remarks: updatedRemarks 
            }));
            setNewRemark("");
            setRemarkFiles([]);
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
        <div id="exportable-deal-details" className="min-h-screen bg-gray-50/50 p-3 sm:p-6 lg:p-8 space-y-6 relative">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-100 border-4 border-white shadow-md flex items-center justify-center text-orange-500 text-xl sm:text-2xl font-black ring-1 ring-orange-100 uppercase flex-shrink-0">
                        {getInitials(deal.name)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 leading-none">{deal.name}</h1>
                            {isDealOverdue(deal) && (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black bg-red-600 text-white uppercase tracking-tighter animate-pulse shadow-sm shadow-red-100">
                                    <Clock size={10} /> Overdue for Closing
                                </span>
                            )}
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
                                            className="hover:underline truncate"
                                        >
                                            {deal.contactId.firstName} {deal.contactId.lastName}
                                        </button>
                                    ) : (
                                        <span className="truncate">{deal.contactName || "No Contact"}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 no-print lg:border-l lg:border-gray-100 lg:pl-8">
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => exportToPDF('exportable-deal-details', `${deal.name}_Details.pdf`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Download size={16} className="text-gray-500" /> Export PDF
                        </button>
                    )}
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit Deal"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-200 transition-all active:scale-[0.97]"
                            >
                                <Edit2 size={13} /> Edit
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                title="Delete Deal"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all active:scale-[0.97]"
                            >
                                <Trash2 size={13} /> Delete
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
                            <h3 className="text-[10px] font-bold">Commercial Parameters</h3>
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
                                <div className="flex items-center gap-2">
                                    <p className={`text-sm font-bold ${isDealOverdue(deal) ? "text-red-600" : "text-gray-900"}`}>{formatDate(deal.expectedCloseDate)}</p>
                                    {isDealOverdue(deal) && (
                                        <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase animate-pulse">Action Required</span>
                                    )}
                                </div>
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

                            {/* Digital Assets moved here */}
                            {deal.attachments && deal.attachments.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-gray-50">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={10} className="text-red-500" /> Digital Assets
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {deal.attachments.map((file, idx) => (
                                            <a
                                                key={`main-${idx}`}
                                                href={formatFileUrl(file.url)}
                                                download={file.fileName}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-xl hover:border-red-400 hover:shadow-sm transition-all duration-300"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                    <FileText size={14} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-gray-900 truncate">{file.fileName}</p>
                                                </div>
                                                <Download size={12} className="text-gray-300 group-hover:text-red-600 transition-colors" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Strategic Owner */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-[10px] font-bold">Executive Ownership</h3>
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
                            <h3 className="text-[10px] font-bold">Pipeline Transition Log</h3>
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
                    {/* Deals Pipeline Status */}
                    <div className="space-y-5">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Deals Pipeline Status</h3>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-y-3 sm:gap-x-1">
                            {pipelineStages.map((stage, index) => {
                                const currentStageIndex = pipelineStages.findIndex(s => s.id === deal.stage);
                                const isCurrent = deal.stage === stage.id;
                                
                                let isPast = index < currentStageIndex;
                                const isSkippedWon = deal.stage === "Closed Lost" && stage.id === "Closed Won";
                                if (isSkippedWon) {
                                    isPast = false;
                                }
                                
                                // Precise Color Palette from Reference
                                const stageColors = [
                                    "bg-[#2b39cc]", // Blue
                                    "bg-[#f9b115]", // Yellow
                                    "bg-[#ec602d]", // Orange
                                    "bg-[#d63384]", // Pink
                                    "bg-[#2eb85c]", // Green (standard for Won)
                                    "bg-[#e55353]"  // Red (standard for Lost)
                                ];

                                const style = isPast || isCurrent 
                                    ? stageColors[index] || "bg-gray-400" 
                                    : "bg-[#e4e6eb] text-gray-900";

                                return (
                                    <div 
                                        key={stage.id} 
                                        className={`
                                            relative h-12 flex items-center justify-center
                                            flex-1 min-w-[120px] sm:min-w-0
                                            transition-all duration-300 group
                                            ${style} ${isPast || isCurrent ? "text-white" : "text-gray-900"}
                                            font-bold text-[11px] sm:text-[13px]
                                            ${index === 0 ? "rounded-l-lg" : ""}
                                            ${index === pipelineStages.length - 1 ? "rounded-r-lg" : ""}
                                            ${isSkippedWon ? "opacity-30" : ""}
                                        `}
                                        style={{
                                            clipPath: (window.innerWidth >= 640) ? (
                                                index === 0 
                                                    ? "polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)"
                                                    : index === pipelineStages.length - 1
                                                        ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)"
                                                        : "polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)"
                                            ) : "none"
                                        }}
                                    >
                                        <span className="relative z-10 px-4 whitespace-nowrap">
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 h-14 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Remarks</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Narratives/Notes */}
                            <div className="space-y-4">
                                <div className="space-y-4 max-h-[500px] overflow-y-auto px-1">
                                    {deal.remarks && Array.isArray(deal.remarks) && deal.remarks.length > 0 ? (
                                        deal.remarks.map((remark, i) => (
                                            <div key={i} className="p-4 bg-gray-50/30 rounded-xl border border-gray-100">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-600 border border-red-100">
                                                            {remark.authorName?.[0] || 'U'}
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-gray-500">
                                                            {remark.authorName || "Unknown"} <span className="text-gray-300 mx-1">•</span> {formatDate(remark.createdAt, true)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-[13px] text-gray-700 leading-relaxed font-medium">
                                                    {remark.text}
                                                </div>
                                                {remark.files && remark.files.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {remark.files.map((file, fIdx) => (
                                                            <a
                                                                key={fIdx}
                                                                href={formatFileUrl(file.url, file.fileType)}
                                                                download={file.fileName}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 hover:text-red-600 hover:border-red-400 transition-all shadow-sm"
                                                            >
                                                                <Paperclip size={10} className="text-gray-400" />
                                                                <span className="max-w-[150px] truncate">{file.fileName}</span>
                                                                <Download size={10} className="text-gray-300" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 bg-gray-50/20 rounded-xl border border-dashed border-gray-100">
                                            <MessageSquare size={18} className="mx-auto text-gray-300 mb-1.5 opacity-20" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic">No remarks yet</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Add Remark Input */}
                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 no-print">
                                    <textarea
                                        value={newRemark}
                                        onChange={(e) => setNewRemark(e.target.value)}
                                        placeholder="Add a remark..."
                                        className="w-full min-h-[45px] p-3 text-[13px] bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-red-50 focus:border-red-300 focus:bg-white transition-all resize-none font-medium text-gray-700 shadow-inner"
                                    />
                                    
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex flex-wrap gap-2">
                                            {remarkFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg border border-red-100 text-[9px] font-bold text-red-600">
                                                    <span className="max-w-[120px] truncate">{file.name}</span>
                                                    <button
                                                        onClick={() => setRemarkFiles(prev => prev.filter((_, i) => i !== idx))}
                                                        className="hover:text-red-900"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:border-red-400 hover:text-red-600 cursor-pointer transition-all shadow-sm active:scale-95 group">
                                                <Paperclip size={12} className="group-hover:rotate-12 transition-transform" />
                                                <span>{remarkFiles.length > 0 ? "Add More" : "Attach"}</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files);
                                                        setRemarkFiles(prev => [...prev, ...files]);
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        <button
                                            onClick={handleAddRemark}
                                            disabled={savingRemark || (!newRemark.trim() && remarkFiles.length === 0)}
                                            className="px-5 py-2 text-[11px] font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md shadow-red-100 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                                        >
                                            {savingRemark ? (
                                                <><Loader2 size={12} className="animate-spin" /> ...</>
                                            ) : (
                                                <><MessageSquare size={12} /> Post</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Meta Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-gray-100 gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-300" /> Origin: {formatDate(deal.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-300" /> Latest Sync: {formatDate(deal.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-700">Active Deal Stream</span>
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
