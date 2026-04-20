import React, { useState, useEffect } from "react";
import { Users, Building2, Users2, ChevronDown, Plus, Edit2, Trash2, Search, Linkedin, ExternalLink, ChevronRight, LayoutGrid, LayoutList } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getRankedContacts } from "../../API/services/rankService";
import { createContact, updateContact, deleteContact } from "../../API/services/contactService";
import { getCompanies } from "../../API/services/companyService";
import RankBadge from "../../components/RankBadge";
import ContactModal from "../../components/modals/ContactModal";
import ContactDetailsModal from "../../components/modals/ContactDetailsModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import ContactCard from "../../components/cards/ContactCard";
import ContactDealsModal from "../../components/modals/ContactDealsModal";
import { toast } from "react-hot-toast";
import { Eye } from "lucide-react";
import useDashboardRefresh from "../../hooks/useDashboardRefresh";

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ title, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const Select = ({ options, value, onChange }) => (
    <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
            className="appearance-none text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 hover:border-gray-300 transition">
            {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
);

const Avatar = ({ name }) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
    const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    return (
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
        </div>
    );
};

export default function ManagerContacts() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("list"); // "list" | "card"

    // Modal states
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDealsModalOpen, setIsDealsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contactsRes, companiesRes] = await Promise.all([
                getRankedContacts({ name: search || undefined, limit: 100 }),
                getCompanies({ limit: 1000 })
            ]);
            setContacts(contactsRes.data.data);
            setCompanies(companiesRes.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load contacts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useDashboardRefresh(fetchData);

    const handleSaveContact = async (formData) => {
        try {
            if (selectedContact) {
                await updateContact(selectedContact._id, formData);
                toast.success("Contact updated successfully");
            } else {
                await createContact(formData);
                toast.success("Contact created successfully");
            }
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save contact");
            throw error;
        }
    };

    const handleDeleteContact = async () => {
        if (!selectedContact) return;
        try {
            await deleteContact(selectedContact._id);
            toast.success("Contact deleted successfully");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete contact");
        }
    };

    const stats = [
        { label: "Team Contacts", value: String(contacts.length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: Users },
        { label: "Linked to Company", value: String(contacts.filter(c => c.companyId).length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: Building2 },
        { label: "Total Active", value: String(contacts.length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: Users2 },
    ];

    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Contact Network</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage and view contacts across your entire team</p>
                </div>
                <button
                    onClick={() => { setSelectedContact(null); setIsContactModalOpen(true); }}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>Add Contact</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon size={20} />
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-bold text-gray-800 leading-snug">{s.value}</p>
                            <p className="text-xs sm:text-sm text-gray-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Card>
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-800 text-base">All Team Contacts</h3>
                        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode("list")}
                                title="List View"
                                className={`p-1.5 rounded-md transition flex items-center justify-center ${viewMode === "list" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("card")}
                                title="Card View"
                                className={`p-1.5 rounded-md transition flex items-center justify-center ${viewMode === "card" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search contact..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50/50 transition-all font-medium" />
                    </div>
                </div>
                <div className="overflow-x-auto p-4 min-h-[300px]">
                    {viewMode === "list" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["Rank", "Contact", "Job Title", "Company", "Deals", "Owner", "LinkedIn", "Actions"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading && contacts.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading contacts...</td></tr>
                                ) : contacts.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-20 text-gray-400 font-bold  tracking-widest text-[10px] opacity-60 "> 'No ' + $args[0].Groups[1].Value.ToLower() + ' found' </td></tr>
                                ) : (
                                    contacts.map((c) => (
                                        <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <RankBadge score={c.aiScore} tier={c.aiTier} compact />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3 cursor-pointer group/item"
                                                    onClick={() => navigate(`/manager/contacts/${c._id}`)}>
                                                    <Avatar name={`${c.firstName} ${c.lastName}`} />
                                                    <div>
                                                        <p className="font-medium text-gray-800 leading-none group-hover/item:text-red-600 transition-colors uppercase text-[11px] font-bold">{c.firstName} {c.lastName}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{c.jobTitle || "—"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                                    {(c.companies && c.companies.length > 0)
                                                        ? c.companies.map(comp => comp.companyName).join(", ")
                                                        : (c.companyId?.name || c.companyName || "—")}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button 
                                                    onClick={() => { setSelectedContact(c); setIsDealsModalOpen(true); }}
                                                    className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-100 hover:border-red-200 transition-all text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Deals: {c.dealCount || 0}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-red-600 font-bold whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-bold text-white uppercase overflow-hidden border border-red-200">
                                                        {c.ownerId?.profilePicture ? (
                                                            <img src={c.ownerId.profilePicture} alt="Owner" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <>{c.ownerId?.firstName?.[0] || "U"}</>
                                                        )}
                                                    </div>
                                                    <span>{c.ownerId?.firstName || "Unknown"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {c.linkedin ? (
                                                    <a href={c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium">
                                                        <Linkedin size={13} /><ExternalLink size={11} />
                                                    </a>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/manager/contacts/${c._id}`)}
                                                        title="View details"
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedContact(c); setIsContactModalOpen(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedContact(c); setIsDeleteModalOpen(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {loading && contacts.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-gray-400">Loading contacts...</div>
                            ) : contacts.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-gray-400 font-bold  tracking-widest text-[10px] opacity-60 "> 'No ' + $args[0].Groups[1].Value.ToLower() + ' found' </div>
                            ) : (
                                contacts.map((c) => (
                                    <ContactCard
                                        key={c._id}
                                        contact={c}
                                        basePath="/manager"
                                        onEdit={(contact) => { setSelectedContact(contact); setIsContactModalOpen(true); }}
                                        onDelete={(contact) => { setSelectedContact(contact); setIsDeleteModalOpen(true); }}
                                        onView={(contact) => navigate(`/manager/contacts/${contact._id}`)}
                                        onDealsClick={(contact) => { setSelectedContact(contact); setIsDealsModalOpen(true); }}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                contact={selectedContact}
                onSave={handleSaveContact}
                companies={companies}
            />

            <ContactDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                contact={selectedContact}
            />
            <ContactDealsModal
                isOpen={isDealsModalOpen}
                onClose={() => setIsDealsModalOpen(false)}
                contact={selectedContact}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteContact}
                itemName={`${selectedContact?.firstName} ${selectedContact?.lastName}`}
            />
        </div>
    );
}








