import React, { useState, useEffect } from "react";
import { Users, Building2, MapPin, Mail, Phone, ExternalLink, Plus, Edit2, Trash2, Search, Linkedin, ChevronRight, LayoutGrid, LayoutList } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getContacts, createContact, updateContact, deleteContact } from "../../../API/services/contactService";
import { getCompanies } from "../../../API/services/companyService";
import ContactModal from "../../components/modals/ContactModal";
import ContactDetailsModal from "../../components/modals/ContactDetailsModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import ContactCard from "../../components/cards/ContactCard";
import { toast } from "react-hot-toast";
import { Eye } from "lucide-react";

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ title, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const Avatar = ({ name }) => {
    if (!name) return null;
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["bg-red-500", "bg-orange-500", "bg-red-600", "bg-orange-600", "bg-red-400"];
    return (
        <div className={`w-8 h-8 rounded-full ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
        </div>
    );
};

export default function RepContacts() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("list"); // "list" | "card"

    // Modal states
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contactsRes, companiesRes] = await Promise.all([
                getContacts({ name: search || undefined, limit: 100 }),
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
        { label: "Total Contacts", value: String(contacts.length), color: "bg-red-50 text-red-600", icon: Users },
        { label: "With Email", value: String(contacts.filter(c => c.email).length), color: "bg-orange-50 text-orange-600", icon: Building2 },
        { label: "With LinkedIn", value: String(contacts.filter(c => c.linkedin).length), color: "bg-red-600 text-white shadow-sm shadow-red-100", icon: Linkedin },
        { label: "With Mobile", value: String(contacts.filter(c => c.mobile).length), color: "bg-red-50 text-red-600 border border-red-100", icon: Phone },
    ];

    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Contacts</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage your personal business network</p>
                </div>
                <button
                    onClick={() => { setSelectedContact(null); setIsContactModalOpen(true); }}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>Add Contact</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold text-gray-800">All Contacts</h2>
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
                        <input type="text" placeholder="Search contact, company..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50/50" />
                    </div>
                </div>
                <div className="overflow-x-auto p-4 min-h-[300px]">
                    {viewMode === "list" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["Contact", "Job Title", "Company", "Phone", "LinkedIn", "Actions"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading && contacts.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading contacts...</td></tr>
                                ) : contacts.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No contacts found.</td></tr>
                                ) : (
                                    contacts.map((c) => (
                                        <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-3 cursor-pointer group/item"
                                                    onClick={() => navigate(`/rep/contacts/${c._id}`)}>
                                                    <Avatar name={`${c.firstName} ${c.lastName}`} />
                                                    <div>
                                                        <p className="font-medium text-gray-800 leading-none group-hover/item:text-red-600 transition-colors uppercase text-[11px] font-bold">{c.firstName} {c.lastName}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.jobTitle || "—"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium border border-red-100">
                                                    {c.companyId?.name || c.companyName || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{c.phone || c.mobile || "—"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {c.linkedin ? (
                                                    <span className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                        onClick={() => navigate(`/rep/contacts/${c._id}`)}>
                                                        <Eye size={12} /> View Details
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/rep/contacts/${c._id}`)}
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
                                <div className="col-span-full text-center py-10 text-gray-400">No contacts found.</div>
                            ) : (
                                contacts.map((c) => (
                                    <ContactCard
                                        key={c._id}
                                        contact={c}
                                        basePath="/rep"
                                        onEdit={(contact) => { setSelectedContact(contact); setIsContactModalOpen(true); }}
                                        onDelete={(contact) => { setSelectedContact(contact); setIsDeleteModalOpen(true); }}
                                        onView={(contact) => navigate(`/rep/contacts/${contact._id}`)}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

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

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteContact}
                itemName={`${selectedContact?.firstName} ${selectedContact?.lastName}`}
            />
        </div>
    );
}
