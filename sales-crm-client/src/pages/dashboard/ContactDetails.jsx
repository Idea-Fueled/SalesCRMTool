import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getContactById, updateContact, addRemark as addContactRemark, deleteContact, getArchivedContacts, restoreContact, deleteRemarkFile, deleteAttachment, deleteRemark } from "../../API/services/contactService";
import { getTeamUsers } from "../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import ContactModal from "../../components/modals/ContactModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import FileDeleteModal from "../../components/modals/FileDeleteModal";
import {
    User, Mail, Phone, Smartphone, Linkedin,
    Building2, Briefcase, Calendar, Clock,
    ArrowLeft, ChevronRight, Download, RotateCw,
    Maximize2, Shield, List, History,
    MessageSquare, FileText, Paperclip, Loader2, Layers,
    MapPin, Globe, ExternalLink, MoreHorizontal, Edit2, Trash2, X, DollarSign
} from "lucide-react";
import toast from "react-hot-toast";
import { exportToPDF } from "../../utils/pdfExport";
import ContactDealsModal from "../../components/modals/ContactDealsModal";

const lifecycleStages = [
    { id: "Added", label: "Added" },
    { id: "Interested", label: "Interested" },
    { id: "Contacted", label: "Contacted" },
    { id: "Qualified", label: "Qualified" },
    { id: "Active", label: "Active" }
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

const getDownloadUrl = (url, fileName) => {
    if (!url || !url.includes("cloudinary.com")) return url || "#";
    
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
    
    const isPdf = url.toLowerCase().endsWith('.pdf') || fileType === "application/pdf";
    const isOfficeDoc = url.toLowerCase().endsWith('.doc') || 
                       url.toLowerCase().endsWith('.docx') || 
                       url.toLowerCase().endsWith('.xls') || 
                       url.toLowerCase().endsWith('.xlsx');

    // Always remove force-download/format flags for viewing
    let openingUrl = url.replace(/\/fl_attachment[^/]*\//, '/').replace(/\/f_pdf[^/]*\//, '/');

    if (isPdf) {
        // New tab opening logic for PDFs
        return openingUrl;
    }

    if (isOfficeDoc) {
        // Use Google Docs Viewer for Office documents
        return `https://docs.google.com/viewer?url=${encodeURIComponent(openingUrl)}&embedded=true`;
    }
    
    return openingUrl;
};

export default function ContactDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [contact, setContact] = useState(null);
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
    const [isDealsModalOpen, setIsDealsModalOpen] = useState(false);

    const fetchContact = async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            const [contactRes, usersRes] = await Promise.all([
                getContactById(id),
                getTeamUsers()
            ]);
            setContact(contactRes.data.data);
            setUsers(usersRes.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch contact details");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchContact();
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

            const res = await addContactRemark(contact._id, formData);
            
            setContact(prev => ({
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

    const handleSaveContact = async (formData) => {
        try {
            await updateContact(contact._id, formData);
            toast.success("Contact updated successfully");
            setIsEditModalOpen(false);
            fetchContact(true);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update contact");
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
                await deleteRemarkFile(contact._id, assetToDelete.remarkId, assetToDelete.fileId);
                toast.success("File deleted successfully");
            } else if (assetToDelete.type === 'remark') {
                await deleteRemark(contact._id, assetToDelete.remarkId);
                toast.success("Remark deleted successfully");
            } else {
                await deleteAttachment(contact._id, assetToDelete.fileId);
                toast.success("Attachment deleted successfully");
            }
            setIsFileDeleteModalOpen(false);
            setAssetToDelete(null);
            fetchContact(true);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete item");
        }
    };

    const handleDeleteContact = async () => {
        try {
            await deleteContact(contact._id);
            toast.success("Contact moved to archive");
            setIsDeleteModalOpen(false);
            navigate(`${basePath}/contacts`);
        } catch (error) {
            toast.error("Failed to delete contact");
        }
    };

    const canEdit = (() => {
        if (!currentUser || !contact) return false;
        const role = currentUser.role;
        const ownerId = contact.ownerId?._id || contact.ownerId;
        const currentUserId = currentUser._id || currentUser.id;
        if (role === "admin" || role === "sales_manager") return true;
        if (role === "sales_rep") {
            return ownerId === currentUserId;
        }
        return false;
    })();

    const getInitials = (firstName, lastName) => {
        return (
            (firstName?.[0] || "") + (lastName?.slice(-1) || "")
        ).toUpperCase() || "C";
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-red-500" />
            </div>
        );
    }

    if (!contact) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-semibold">Contact not found</p>
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
        <div id="exportable-contact-details" className="min-h-screen bg-gray-50/50 p-3 sm:p-6 lg:p-8 space-y-6 relative">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 border-4 border-white shadow-md flex items-center justify-center text-white text-xl sm:text-2xl font-black ring-1 ring-red-100 uppercase flex-shrink-0">
                        {getInitials(contact.firstName, contact.lastName)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 leading-none">{contact.firstName} {contact.lastName}</h1>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                    <Briefcase size={14} className="text-gray-300" />
                                    <span>{contact.jobTitle}</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                <button
                                    onClick={() => setIsDealsModalOpen(true)}
                                    className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-tight border border-green-100 hover:bg-green-100 transition-colors"
                                >
                                    <DollarSign size={10} />
                                    Deals: {contact.dealCount || 0}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-red-500">
                                <Building2 size={12} className="text-red-400" />
                                <button
                                    onClick={() => contact.companyId?._id && navigate(`/dashboard/companies/${contact.companyId._id}`)}
                                    className="hover:underline font-bold"
                                >
                                    {contact.companyId?.name || contact.companyName || "No Company"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 no-print lg:border-l lg:border-gray-100 lg:pl-8">
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => exportToPDF('exportable-contact-details', `${contact.firstName}_${contact.lastName}_Details.pdf`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Download size={16} className="text-gray-500" /> Export PDF
                        </button>
                    )}
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit Contact"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-100 transition-all active:scale-[0.97]"
                            >
                                <Edit2 size={13} /> Edit
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                title="Delete Contact"
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
                    {/* Contact Information */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Contact Channels</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail size={10} className="text-red-400" /> Email
                                </label>
                                <p className="text-sm font-bold text-gray-900 truncate">{contact.email}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone size={10} className="text-red-400" /> Phone
                                </label>
                                <p className="text-sm font-bold text-gray-900">{contact.phone || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Smartphone size={10} className="text-red-400" /> Mobile
                                </label>
                                <p className="text-sm font-bold text-gray-900">{contact.mobile || "—"}</p>
                            </div>
                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Linkedin size={10} className="text-blue-500" /> LinkedIn
                                </label>
                                {contact.linkedin ? (
                                    <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                        View Profile <ExternalLink size={10} />
                                    </a>
                                ) : (
                                    <p className="text-sm font-bold text-gray-300 italic">Not available</p>
                                )}
                            </div>
                            
                            {/* Interaction Notes displayed in Primary Info */}
                            <div className="space-y-1 pt-2 border-t border-gray-50">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                    <FileText size={10} className="text-gray-400" /> Interaction Notes
                                </label>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner max-h-[300px] overflow-y-auto">
                                    {contact.notes ? contact.notes : <span className="text-gray-400 italic">No notes yet. Add a remark from the right panel.</span>}
                                </div>
                            </div>

                            {/* Digital Assets moved here */}
                            {contact.attachments && contact.attachments.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-gray-50">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={10} className="text-red-500" /> Digital Assets
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {contact.attachments.map((file, idx) => (
                                            <div key={`main-${idx}`} className="group flex items-center gap-2">
                                                <a
                                                    href={formatFileUrl(file.url, file.fileType)}
                                                    download={(file.url?.toLowerCase().endsWith('.pdf') || file.fileType === "application/pdf") ? undefined : file.fileName}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-xl hover:border-red-400 hover:shadow-sm transition-all duration-300"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                        <FileText size={14} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-bold text-gray-900 truncate">{file.fileName}</p>
                                                    </div>
                                                </a>
                                                 <a
                                                    href={getDownloadUrl(file.url, file.fileName)}
                                                    download={file.fileName}
                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all"
                                                    title="Download to system"
                                                >
                                                    <Download size={14} />
                                                </a>
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

                    {/* Relationship Owner */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Relationship Owner</h3>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm ring-1 ring-red-50">
                                    {contact.ownerId?.firstName?.[0]}{contact.ownerId?.lastName?.slice(-1)}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800 leading-none">{contact.ownerId?.firstName} {contact.ownerId?.lastName || ""}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1">Relationship Manager</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Activities & Notes */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 h-14 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Remarks</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => fetchContact(true)}
                                    disabled={isRefreshing}
                                    className={`text-gray-300 hover:text-red-500 transition-all ${isRefreshing ? "animate-spin text-red-500" : ""}`}
                                    title="Refresh Details"
                                >
                                    <RotateCw size={12} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Narratives/Intel */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    <MessageSquare size={10} /> Remarks
                                </div>
                                
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Array.isArray(contact.remarks) && contact.remarks.length > 0 ? (
                                        contact.remarks.map((remark, idx) => (
                                            <div key={idx} className="group p-4 bg-gray-50/30 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white border border-red-100">
                                                            {remark.authorName?.[0] || 'U'}
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-gray-500">
                                                            {remark.authorName || "Unknown"} <span className="text-gray-300 mx-1">•</span> {formatDate(remark.createdAt || new Date(), true)}
                                                        </span>
                                                    </div>
                                                    {(currentUser?.role === 'admin' || (currentUser?._id || currentUser?.id) === remark.author) && (
                                                        <button
                                                            onClick={() => prepareDeleteRemark(remark._id || idx)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                                                                <a
                                                                    href={formatFileUrl(file.url, file.fileType)}
                                                                    download={(file.url?.toLowerCase().endsWith('.pdf') || file.fileType === "application/pdf") ? undefined : file.fileName}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-medium text-gray-500 hover:border-red-400 hover:text-red-600 transition-all shadow-sm"
                                                                >
                                                                    <Paperclip size={10} className="text-gray-400" />
                                                                    <span className="max-w-[150px] truncate">{file.fileName}</span>
                                                                </a>
                                                                 <a
                                                                    href={getDownloadUrl(file.url, file.fileName)}
                                                                    download={file.fileName}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="Download to system"
                                                                >
                                                                    <Download size={12} />
                                                                </a>
                                                                {(currentUser?.role === 'admin' || String(currentUser?._id || currentUser?.id) === String(remark.author?._id || remark.author?.id || remark.author)) && (
                                                                    <button
                                                                        onClick={() => prepareDeleteRemarkFile(remark._id || idx, file._id, file.fileName)}
                                                                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                        title="Delete file"
                                                                    >
                                                                        <Trash2 size={12} />
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
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 no-print">
                                    <textarea
                                        value={newRemark}
                                        onChange={(e) => setNewRemark(e.target.value)}
                                        placeholder="Add a remark..."
                                        className="w-full min-h-[45px] p-3 text-[13px] bg-gray-50/50 border border-red-500 rounded-xl focus:ring-4 focus:ring-red-50 focus:border-red-300 focus:bg-white transition-all resize-none font-medium text-gray-700 shadow-inner"
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
                                                        // Reset value so duplicate files can be selected again
                                                        e.target.value = "";
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
            <ContactModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                contact={contact}
                onSave={handleSaveContact}
                userRole={currentUser?.role}
                potentialOwners={users}
            />
            {/* Delete Confirmation Modal for Full Item */}
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteContact}
                itemName={`${contact?.firstName} ${contact?.lastName}`}
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
                        ? "Are you sure you want to delete this remark? All associated files will also be removed."
                        : assetToDelete?.type === 'remarkFile'
                        ? `Are you sure you want to delete "${assetToDelete?.fileName}"?`
                        : "Are you sure you want to delete this attachment?"
                }
                title={assetToDelete?.type === 'remark' ? "Delete Remark" : "Delete Attachment"}
            />
            <ContactDealsModal
                isOpen={isDealsModalOpen}
                onClose={() => setIsDealsModalOpen(false)}
                contact={contact}
            />
        </div>
    );
}
