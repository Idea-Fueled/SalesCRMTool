import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getContactById, updateContact, deleteContact } from "../../../API/services/contactService";
import { getTeamUsers } from "../../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import ContactModal from "../../components/modals/ContactModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import {
    User, Mail, Phone, Smartphone, Linkedin,
    Building2, Briefcase, Calendar, Clock,
    ArrowLeft, ChevronRight, Download, RotateCw,
    Maximize2, Star, Shield, List, History,
    MessageSquare, FileText, Paperclip, Loader2,
    MapPin, Globe, ExternalLink, MoreHorizontal, Edit2, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { exportToPDF } from "../../utils/pdfExport";

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
    const [newRemark, setNewRemark] = useState("");
    const [savingRemark, setSavingRemark] = useState(false);
    const [users, setUsers] = useState([]);

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
        if (!newRemark.trim()) return;
        setSavingRemark(true);
        try {
            const timestamp = formatDate(new Date(), true);
            const author = `${currentUser?.firstName || "Unknown"} ${currentUser?.lastName || ""}`.trim();
            const remarkEntry = `\n\n[${timestamp}] Added by ${author}\n${newRemark.trim()}`;
            
            const updatedRemarks = (contact.remarks || "").trim() + remarkEntry;
            
            await updateContact(contact._id, { remarks: updatedRemarks });
            
            setContact(prev => ({ ...prev, remarks: updatedRemarks }));
            setNewRemark("");
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
        if (role === "admin") return true;
        if (role === "sales_manager") {
            const ownerManagerId = contact.ownerId?.managerId?._id || contact.ownerId?.managerId;
            return ownerId === currentUserId || ownerManagerId === currentUserId;
        }
        if (role === "sales_rep") {
            return ownerId === currentUserId;
        }
        return false;
    })();

    const getInitials = (firstName, lastName) => {
        return (
            (firstName?.[0] || "") + (lastName?.[0] || "")
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
        <div id="exportable-contact-details" className="min-h-screen bg-gray-50/50 p-6 space-y-6 relative">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-red-600 border-4 border-white shadow-md flex items-center justify-center text-white text-2xl font-black ring-1 ring-red-100 uppercase">
                        {getInitials(contact.firstName, contact.lastName)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 leading-none">{contact.firstName} {contact.lastName}</h1>
                            <Star size={18} className="text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Briefcase size={14} className="text-gray-300" />
                                <span>{contact.jobTitle}</span>
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
                <div className="flex items-center gap-3 no-print">
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => exportToPDF('exportable-contact-details', `${contact.firstName}_${contact.lastName}_Details.pdf`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Download size={16} className="text-gray-500" /> Export PDF
                        </button>
                    )}
                    {canEdit && (
                        <div className="flex items-center gap-2 ml-2">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit Contact"
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-100 transition-all active:scale-[0.97]"
                            >
                                <Edit2 size={13} /> Edit
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                title="Delete Contact"
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all active:scale-[0.97]"
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
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Contact Channels</h3>
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
                            
                            {/* Notes displayed in Contact Channels */}
                            <div className="space-y-1 pt-2 border-t border-gray-50">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                    <FileText size={10} className="text-gray-400" /> Interaction Notes
                                </label>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner max-h-[300px] overflow-y-auto">
                                    {contact.notes ? contact.notes : <span className="text-gray-400 italic">No notes yet. Add a remark from the right panel.</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Relationship Owner */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Relationship Owner</h3>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold border-2 border-white shadow-sm ring-1 ring-red-50">
                                    {contact.ownerId?.firstName?.[0]}{contact.ownerId?.lastName?.[0]}
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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="px-6 h-14 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Remarks & Intel</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => fetchContact(true)}
                                    disabled={isRefreshing}
                                    className={`text-gray-300 hover:text-red-500 transition-all ${isRefreshing ? "animate-spin text-red-500" : ""}`}
                                    title="Refresh Details"
                                >
                                    <RotateCw size={12} />
                                </button>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full">
                                    <Clock size={12} className="text-red-400" /> Latest Update
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Narratives/Notes */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                                    <MessageSquare size={10} /> Add New Remark
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner max-h-[300px] overflow-y-auto">
                                    {contact.remarks ? (
                                        contact.remarks.split('\n').map((line, i) => {
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

                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Meta Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5"><History size={12} className="text-gray-300" /> Registry: {formatDate(contact.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-300" /> Synchronization: {formatDate(contact.updatedAt)}</span>
                </div>
                <span>Ref: {contact._id}</span>
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
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteContact}
                itemName={`${contact.firstName} ${contact.lastName}`}
            />
        </div>
    );
}
