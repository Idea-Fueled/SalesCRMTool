import React from 'react';
import { Mail, Phone, Linkedin, ExternalLink, Eye, Edit2, Trash2, Building2, MoreVertical, MapPin, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Avatar = ({ name }) => {
    if (!name) return null;
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["bg-red-500", "bg-orange-500", "bg-red-400", "bg-rose-500", "bg-red-600", "bg-pink-500"];
    return (
        <div className={`w-12 h-12 rounded-xl ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 border-2 border-white shadow-sm ring-1 ring-gray-100`}>
            {initials}
        </div>
    );
};

export default function ContactCard({ contact, onEdit, onDelete, onView, basePath }) {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => onView(contact)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full cursor-pointer hover:border-red-200"
        >
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <Avatar name={`${contact.firstName} ${contact.lastName}`} />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase text-xs tracking-wide truncate">
                                {contact.firstName} {contact.lastName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                                <Briefcase size={12} className="text-gray-300" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{contact.jobTitle || "No Title"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group/menu">
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        >
                            <MoreVertical size={18} />
                        </button>
                        <div className="absolute right-0 top-full pt-1 hidden group-hover/menu:block z-10 w-32">
                            <div className="bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onView(contact); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                    <Eye size={14} /> View
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onEdit(contact); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(contact); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2.5 text-gray-500">
                        <Building2 size={14} className="text-gray-300 flex-shrink-0" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (contact.companyId?._id) navigate(`${basePath}/companies/${contact.companyId._id}`);
                            }}
                            className="text-[11px] font-medium hover:text-red-600 hover:underline underline-offset-2 transition-colors truncate"
                        >
                            {contact.companyId?.name || contact.companyName || "No Company"}
                        </button>
                    </div>
                    {contact.email && (
                        <div className="flex items-center gap-2.5 text-gray-500 hover:text-red-500 transition-colors">
                            <Mail size={14} className="text-gray-300 flex-shrink-0" />
                            <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="text-[11px] truncate">{contact.email}</a>
                        </div>
                    )}
                    {(contact.phone || contact.mobile) && (
                        <div className="flex items-center gap-2.5 text-gray-500">
                            <Phone size={14} className="text-gray-300 flex-shrink-0" />
                            <span className="text-[11px]">{contact.phone || contact.mobile}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                    {contact.linkedin && (
                        <a
                            href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                        >
                            <Linkedin size={10} /> LinkedIn
                        </a>
                    )}
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100">
                        {contact.ownerId?.firstName || "System"}
                    </span>
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Active Contact</span>
                </div>
                <div className="flex items-center gap-3">
                    <Mail size={12} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" />
                    <Phone size={12} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" />
                    <ExternalLink size={12} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" />
                </div>
            </div>
        </div>
    );
}
