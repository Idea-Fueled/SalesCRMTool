import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCompanyById, updateCompany, deleteCompany, addRemark as addCompanyRemark, deleteRemarkFile, deleteAttachment, deleteRemark } from "../../API/services/companyService";
import { getTeamUsers } from "../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import CompanyModal from "../../components/modals/CompanyModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import FileDeleteModal from "../../components/modals/FileDeleteModal";
import {
    Building2, User, MapPin, Globe, Phone,
    Mail, Briefcase, Calendar, Clock, ArrowLeft,
    ChevronRight, Download, RotateCw, Maximize2,
    Layers, Users, Target, Info, DollarSign,
    MoreHorizontal, List, FileText, Paperclip, X,
    Loader2, ExternalLink, MessageSquare, Edit2, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { exportToPDF } from "../../utils/pdfExport";
import { downloadFile, viewFile } from "../../utils/fileUtils";

const companyStatusPipeline = [
    { id: "Prospect", label: "Professional Prospect" },
    { id: "Active", label: "Active Company" },
    { id: "Inactive", label: "Inactive Company" }
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

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "Not Set";
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};

const getDownloadUrl = (url, fileName) => {
    if (!url || !url.includes("cloudinary.com")) return url || "#";
    
    // Check if it's a "raw" resource (no transformations allowed)
    const isRaw = url.includes("/raw/upload/");
    if (isRaw) return url;

    const isPdf = fileName?.toLowerCase().endsWith('.pdf') || url.toLowerCase().endsWith('.pdf');
    // Sanitize: letters, numbers, _ or - only (no spaces), preserve extension
    const safeName = fileName ? fileName.replace(/[^\w.-]+/g, '_') : (isPdf ? 'document.pdf' : 'file');
    
    // For downloads, enforce fl_attachment with the specific filename
    let clean = url.replace(/\/fl_attachment[^/]*\//, '/').replace(/\/f_pdf[^/]*\//, '/');
    
    if (clean.includes('/upload/')) {
        return clean.replace('/upload/', `/upload/fl_attachment:${safeName}/`);
    }
    return clean;
};

const formatFileUrl = (url, fileType) => {
    if (!url) return "#";
    
    // Check if it's a "raw" resource
    if (url.includes("/raw/upload/")) return url;

    const isPdf = url.toLowerCase().endsWith('.pdf') || fileType === "application/pdf";
    const isOfficeDoc = url.toLowerCase().endsWith('.doc') || 
                       url.toLowerCase().endsWith('.docx') || 
                       url.toLowerCase().endsWith('.xls') || 
                       url.toLowerCase().endsWith('.xlsx');

    // Always remove force-download/format flags for viewing
    // For PDFs as "image", this ensures they open inline
    let openingUrl = url.replace(/\/fl_attachment[^/]*\//, '/').replace(/\/f_pdf[^/]*\//, '/');

    // Open PDFs directly in a new tab to avoid proxy/CORS issues
    if (isPdf) {
        return openingUrl;
    }

    // Use Google Docs Viewer for Office docs as browsers can't render them natively
    if (isOfficeDoc) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(openingUrl)}&embedded=true`;
    }
    
    return openingUrl;
};

export default function CompanyDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modals & State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFileDeleteModalOpen, setIsFileDeleteModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState(null);
    const [newRemark, setNewRemark] = useState("");
    const [remarkFiles, setRemarkFiles] = useState([]);
    const [savingRemark, setSavingRemark] = useState(false);
    const [users, setUsers] = useState([]);

    const fetchCompany = async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            const [companyRes, usersRes] = await Promise.all([
                getCompanyById(id),
                getTeamUsers()
            ]);
            setCompany(companyRes.data.data);
            setUsers(usersRes.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch company details");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCompany();
    }, [id]);

    const handleAddRemark = async () => {
        if (!newRemark.trim() && remarkFiles.length === 0) return;
        setSavingRemark(true);
        try {
            const formData = new FormData();
            formData.append("text", newRemark.trim());
            remarkFiles.forEach(file => {
                formData.append("files", file);
            });

            const res = await addCompanyRemark(company._id, formData);
            
            setCompany(prev => ({
                ...prev,
                remarks: [...(Array.isArray(prev.remarks) ? prev.remarks : []), res.data.data]
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

    const handleSaveCompany = async (formData) => {
        try {
            await updateCompany(company._id, formData);
            toast.success("Company updated successfully");
            setIsEditModalOpen(false);
            fetchCompany(true);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update company");
            throw error;
        }
    };

    const prepareDeleteRemark = (remarkId) => {
        setAssetToDelete({ type: 'remark', remarkId });
        setIsFileDeleteModalOpen(true);
    };

    const prepareDeleteRemarkFile = (remarkId, fileId, fileName) => {
        setAssetToDelete({ type: 'remarkFile', remarkId, fileId, fileName });
        setIsFileDeleteModalOpen(true);
    };

    const prepareDeleteAttachment = (fileId, fileName) => {
        setAssetToDelete({ type: 'attachment', fileId, fileName });
        setIsFileDeleteModalOpen(true);
    };

    const handleConfirmAssetDelete = async () => {
        if (!assetToDelete) return;
        try {
            if (assetToDelete.type === 'remarkFile') {
                await deleteRemarkFile(company._id, assetToDelete.remarkId, assetToDelete.fileId);
                toast.success("File deleted successfully");
            } else if (assetToDelete.type === 'remark') {
                await deleteRemark(company._id, assetToDelete.remarkId);
                toast.success("Remark deleted successfully");
            } else {
                await deleteAttachment(company._id, assetToDelete.fileId);
                toast.success("Attachment deleted successfully");
            }
            setIsFileDeleteModalOpen(false);
            setAssetToDelete(null);
            fetchCompany(true);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete item");
        }
    };

    const handleDeleteCompany = async () => {
        try {
            await deleteCompany(company._id);
            toast.success("Company moved to archive");
            setIsDeleteModalOpen(false);
            navigate(`${basePath}/companies`);
        } catch (error) {
            toast.error("Failed to delete company");
        }
    };

    const canEdit = (() => {
        if (!currentUser || !company) return false;
        const role = currentUser.role;
        const ownerId = company.ownerId?._id || company.ownerId;
        const currentUserId = currentUser._id || currentUser.id;
        if (role === "admin" || role === "sales_manager") return true;
        if (role === "sales_rep") {
            return ownerId === currentUserId;
        }
        return false;
    })();

    const getInitials = (name) => {
        if (!name) return "C";
        const parts = name.trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts[parts.length - 1] || "";
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-red-500" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-semibold">Company not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-red-500 hover:text-red-600 font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft size={18} /> Go Back
                </button>
            </div>
        );
    }

    const basePath = window.location.pathname.startsWith('/rep') ? '/rep' :
        window.location.pathname.startsWith('/manager') ? '/manager' : '/dashboard';

    return (
        <div id="exportable-company-details" className="min-h-screen bg-gray-50/50 p-3 sm:p-6 lg:p-8 space-y-6 relative">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 border-4 border-white shadow-md flex items-center justify-center text-white text-xl sm:text-2xl font-black ring-1 ring-red-100 uppercase flex-shrink-0">
                        {getInitials(company.name)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 leading-none">{company.name}</h1>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Layers size={14} className="text-gray-300" />
                                <span>{company.industry || "General Industry"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                <MapPin size={12} className="text-red-400" />
                                <span>{company.address || "Main global headquarters"}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 no-print lg:border-l lg:border-gray-100 lg:pl-8">
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => exportToPDF('company', company, `${company.name}_Details.pdf`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Download size={16} className="text-gray-500" /> Export PDF
                        </button>
                    )}
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit Company"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-100 transition-all active:scale-[0.97]"
                            >
                                <Edit2 size={13} /> Edit
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                title="Delete Company"
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
                    {/* Company Information */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-sm font-bold">Operational Identity</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Users size={10} className="text-red-400" /> Company Size
                                </label>
                                <p className="text-sm font-bold text-gray-900">{company.size || "1-10"} Employees</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Globe size={10} className="text-red-400" /> Website
                                </label>
                                {company.website ? (
                                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-red-600 hover:underline flex items-center gap-1">
                                        {company.website} <ExternalLink size={10} />
                                    </a>
                                ) : (
                                    <p className="text-sm font-bold text-gray-300 italic">No website</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign size={10} className="text-green-500" /> Revenue Range
                                </label>
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(company.revenueRange)}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail size={10} className="text-red-400" /> Email Address
                                </label>
                                {company.email ? (
                                    <a href={`mailto:${company.email}`} className="text-sm font-bold text-red-600 hover:underline">
                                        {company.email}
                                    </a>
                                ) : (
                                    <p className="text-sm font-bold text-gray-300 italic">No email on file</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone size={10} className="text-red-400" /> Phone
                                </label>
                                <p className="text-sm font-bold text-gray-900">{company.phone || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <MapPin size={10} className="text-red-400" /> Headquarters
                                </label>
                                <p className="text-sm font-bold text-gray-900 leading-relaxed">{company.address || "No address on file"}</p>
                            </div>
                            
                            {/* Operational Notes */}
                            <div className="space-y-1 pt-2 border-t border-gray-50">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                    <FileText size={10} className="text-gray-400" /> Operational Notes
                                </label>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner max-h-[300px] overflow-y-auto">
                                    {company.notes ? company.notes : <span className="text-gray-400 italic">No notes yet. Add a remark from the right panel.</span>}
                                </div>
                            </div>

                            {/* Digital Assets moved here */}
                            {company.attachments && company.attachments.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-gray-50">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={10} className="text-red-500" /> Digital Assets
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {company.attachments.map((file, idx) => (
                                            <div key={`main-${idx}`} className="group flex items-center gap-2">
                                                <button
                                                    onClick={() => viewFile(formatFileUrl(file.url, file.fileType))}
                                                    className="min-w-0 flex-1 flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-xl hover:border-red-400 hover:shadow-sm transition-all duration-300 cursor-pointer"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                        <FileText size={14} />
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className="text-[11px] font-bold text-gray-900 truncate">{file.fileName}</p>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => downloadFile(file.url, file.fileName)}
                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all cursor-pointer"
                                                    title="Download to system"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                {(currentUser?.role === 'admin' || (currentUser?._id || currentUser?.id) === file.uploadedBy) && (
                                                    <button
                                                        onClick={() => prepareDeleteAttachment(file._id, file.fileName)}
                                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all"
                                                        title="Delete attachment"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-center">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-center">
                            <h3 className="text-sm font-bold uppercase tracking-wider">OWNER</h3>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-col items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm ring-1 ring-red-100">
                                    {company.ownerId?.firstName?.[0]}{company.ownerId?.lastName?.[0]}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-gray-900 leading-none">{company.ownerId?.firstName} {company.ownerId?.lastName || ""}</p>
                                    <p className="text-[11px] text-gray-400 font-bold mt-2 uppercase tracking-widest">
                                        {company.ownerId?.role === 'admin' ? 'Admin' : 
                                         company.ownerId?.role === 'sales_manager' ? 'Sales Manager' : 
                                         company.ownerId?.role === 'sales_rep' ? 'Sales Representative' : 'Sales Representative'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Status & Interactions */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Target size={14} className="text-gray-400" /> Account Lifecycle Status
                        </h3>
                        <div className="flex items-center">
                            <div className={`
                                px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide border-2 flex items-center gap-2 shadow-sm
                                ${company.status === "Active" ? "bg-green-50 text-green-700 border-green-200" : 
                                  company.status === "Inactive" ? "bg-red-50 text-red-700 border-red-200" : 
                                  "bg-blue-50 text-blue-700 border-blue-200"}
                            `}>
                                <div className={`w-2 h-2 rounded-full ${company.status === "Active" ? "bg-green-500 animate-pulse" : company.status === "Inactive" ? "bg-red-500" : "bg-blue-500 animate-pulse"}`}></div>
                                {company.status || "Prospect"}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 h-14 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Remarks</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchCompany(true)}
                                    disabled={isRefreshing}
                                    className={`text-gray-300 hover:text-red-500 transition-all ${isRefreshing ? "animate-spin text-red-500" : ""}`}
                                    title="Refresh Details"
                                >
                                    <RotateCw size={12} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {Array.isArray(company.remarks) && company.remarks.length > 0 ? (
                                    company.remarks.map((remark, idx) => (
                                        <div key={idx} className="group p-4 bg-gray-50/30 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white border border-red-500 overflow-hidden">
                                                        {remark.author?.profilePicture ? (
                                                            <img src={remark.author.profilePicture} alt="Author" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <>{remark.author?.firstName?.[0] || remark.authorName?.[0]}{remark.author?.lastName?.[0]}</> || 'U'
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-gray-500">
                                                        {remark.authorName || "Unknown"} <span className="text-gray-300 mx-1">•</span> {formatDate(remark.createdAt || new Date(), true)}
                                                    </span>
                                                </div>
                                                {(currentUser?.role === 'admin' || String(currentUser?._id || currentUser?.id) === String(remark.author?._id || remark.author?.id || remark.author)) && (
                                                    <button
                                                        onClick={() => prepareDeleteRemark(remark._id || idx)}
                                                        className="p-1.5 text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete remark"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-[13px] text-gray-700 leading-relaxed font-medium">
                                                {remark.text}
                                            </div>
                                            {remark.files && remark.files.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {remark.files.map((file, fIdx) => (
                                                        <div key={fIdx} className="group flex items-center gap-1">
                                                             <button
                                                                 onClick={() => viewFile(formatFileUrl(file.url, file.fileType))}
                                                                 className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-100 rounded-lg text-[9px] font-bold text-gray-500 hover:border-red-400 hover:text-red-600 transition-all shadow-sm cursor-pointer"
                                                             >
                                                                 <Paperclip size={10} />
                                                                 <span className="max-w-[80px] truncate">{file.fileName}</span>
                                                             </button>
                                                             <button
                                                                onClick={() => downloadFile(file.url, file.fileName)}
                                                                className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                                                title="Download to system"
                                                            >
                                                                <Download size={12} />
                                                            </button>
                                                            {(currentUser?.role === 'admin' || String(currentUser?._id || currentUser?.id) === String(remark.author?._id || remark.author?.id || remark.author)) && (
                                                                <button
                                                                    onClick={() => prepareDeleteRemarkFile(remark._id || idx, file._id, file.fileName)}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="Delete file"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            )}
                                                        </div>
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
                            <div className="mt-4 pt-4 border-t border-gray-100 no-print">
                                <div className="relative">
                                    <textarea
                                        value={newRemark}
                                        onChange={(e) => setNewRemark(e.target.value)}
                                        placeholder="Add a remark..."
                                        className="w-full min-h-[45px] p-3 text-[13px] bg-gray-50/50 border border-red-500 rounded-xl focus:ring-4 focus:ring-red-50 focus:border-red-300 focus:bg-white transition-all resize-none font-medium text-gray-700 shadow-inner"
                                    />
                                    
                                    {/* Attachment Preview in Remark Input */}
                                    {remarkFiles.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 px-1">
                                            {remarkFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg border border-red-100 text-[9px] font-bold text-red-600 animate-in fade-in zoom-in duration-200">
                                                    <Paperclip size={10} />
                                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                                    <button 
                                                        onClick={() => setRemarkFiles(prev => prev.filter((_, i) => i !== idx))}
                                                        className="hover:text-red-800 transition-colors"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="mt-2 flex items-center justify-between">
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
                                                    // Reset value so duplicate files can be selected again
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                        
                                        <button
                                            onClick={handleAddRemark}
                                            disabled={savingRemark || (!newRemark.trim() && remarkFiles.length === 0)}
                                            className="px-5 py-2 text-[11px] font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md shadow-red-100 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                                        >
                                            {savingRemark ? (
                                                <Loader2 size={12} className="animate-spin" />
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

            {/* Modals */}
            <CompanyModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                company={company}
                onSave={handleSaveCompany}
                userRole={currentUser?.role}
                potentialOwners={users}
            />
            {/* Delete Confirmation Modal for Full Item */}
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteCompany}
                itemName={company?.name}
            />

            {/* Specialized Asset Delete Modal */}
            <FileDeleteModal
                isOpen={isFileDeleteModalOpen}
                onClose={() => {
                    setIsFileDeleteModalOpen(false);
                    setAssetToDelete(null);
                }}
                onConfirm={handleConfirmAssetDelete}
                message={
                    assetToDelete?.type === 'remark' 
                        ? "Are you sure you want to delete this remark? This will permanently remove all linked files."
                        : assetToDelete?.type === 'remarkFile'
                        ? `Are you sure you want to delete "${assetToDelete?.fileName}"?`
                        : "Are you sure you want to delete this attachment?"
                }
                title={assetToDelete?.type === 'remark' ? "Delete Remark" : "Delete Attachment"}
            />
        </div>
    );
}
