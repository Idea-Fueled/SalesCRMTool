import React from "react";
import Modal from "./Modal";
import {
    User, Mail, Briefcase, Building2,
    Phone, Smartphone, Linkedin, ExternalLink,
    Calendar, Clock, FileText, Share2
} from "lucide-react";

export default function ContactDetailsModal({ isOpen, onClose, contact }) {
    if (!contact) return null;

    const initials = `${contact.firstName?.[0] || ""}${contact.lastName?.[0] || ""}`.toUpperCase();
    const colors = ["bg-red-500", "bg-orange-500", "bg-red-600", "bg-rose-500", "bg-red-400"];
    const avatarColor = colors[(contact.firstName?.charCodeAt(0) || 0) % colors.length];

    const formatDate = (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Contact Information">
            <div className="space-y-6">
                {/* Header Profile Section */}
                <div className="flex items-center gap-6 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className={`w-20 h-20 rounded-full ${avatarColor} flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md flex-shrink-0`}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold text-gray-900 truncate">
                            {`${contact.firstName || ""} ${contact.lastName || ""}`.trim()}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 uppercase tracking-wider">
                                {contact.jobTitle || "Contact"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                <Building2 size={12} className="text-gray-400" />
                                {contact.companyId?.name || contact.companyName || "No Company"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Contact Channels */}
                    <div className="space-y-6">
                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Mail size={12} className="text-red-400" />
                                Digital Reach
                            </h4>
                            <div className="space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700">{contact.email}</span>
                                    <span className="text-[10px] text-gray-400 italic font-medium">Primary Business Email</span>
                                </div>
                                {contact.linkedin && (
                                    <div className="flex flex-col">
                                        <a
                                            href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1.5"
                                        >
                                            View LinkedIn Profile
                                            <ExternalLink size={10} />
                                        </a>
                                        <span className="text-[10px] text-gray-400 italic font-medium uppercase tracking-tighter">Professional Social</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <Phone size={12} className="text-red-400" />
                                Voice & Mobile
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700">{contact.phone || "—"}</span>
                                    <span className="text-[10px] text-gray-400 italic">Office extension</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700">{contact.mobile || "—"}</span>
                                    <span className="text-[10px] text-gray-400 italic">Direct mobile line</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Internal Details & Context */}
                    <div className="space-y-6">
                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <User size={12} className="text-red-400" />
                                Relationship Owner
                            </h4>
                            <div className="flex flex-col p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter mb-1">Assigned Manager</span>
                                <span className="text-sm font-bold text-red-700">
                                    {`${contact.ownerId?.firstName || ""} ${contact.ownerId?.lastName || ""}`.trim() || "Not Assigned"}
                                </span>
                                <span className="text-[10px] text-red-400/80 italic mt-0.5">{contact.ownerId?.email}</span>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                <FileText size={12} className="text-red-400" />
                                Strategic Notes
                            </h4>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed italic max-h-32 overflow-y-auto custom-scrollbar">
                                {contact.notes || "No interaction notes recorded for this contact."}
                            </div>
                        </section>

                        <div className="pt-2">
                            <div className="flex items-center gap-5 text-[10px] text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={10} className="text-gray-300" />
                                    <span>Created: <span className="font-semibold text-gray-500">{formatDate(contact.createdAt)}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="text-gray-300" />
                                    <span>Sync: <span className="font-semibold text-gray-500">{formatDate(contact.updatedAt)}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-100 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                        Return to Contacts
                    </button>
                </div>
            </div>
        </Modal>
    );
}
