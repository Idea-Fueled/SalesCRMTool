import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users, Link2, Linkedin, CalendarPlus, ChevronDown, Plus, Edit2, Trash2, Search, ExternalLink, Filter, MoreHorizontal, Download, Eye, ArrowLeft, ChevronRight,
    LayoutGrid, LayoutList
} from "lucide-react";
import { Link } from "react-router-dom";
import { getContacts, createContact, updateContact, deleteContact } from "../../API/services/contactService";
import { getCompanies } from "../../API/services/companyService";
import { getTeamUsers } from "../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import ContactModal from "../../components/modals/ContactModal";
import ContactDetailsModal from "../../components/modals/ContactDetailsModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import ContactCard from "../../components/cards/ContactCard";
import ContactDealsModal from "../../components/modals/ContactDealsModal";
import { toast } from "react-hot-toast";

const Select = ({ options, value, onChange }) => (
    <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
            className="appearance-none text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 hover:border-gray-300 transition">
            {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
);

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ title, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const StatCard = ({ label, value, sub, color, icon: IconComp }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <IconComp size={20} />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
            {sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>}
        </div>
    </div>
);

const Avatar = ({ name }) => {
    if (!name) return null;
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["bg-red-500", "bg-orange-500", "bg-red-400", "bg-rose-500", "bg-red-600", "bg-pink-500"];
    return (
        <div className={`w-9 h-9 rounded-full ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
        </div>
    );
};

export default function ContactsDashboard() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [viewMode, setViewMode] = useState("list"); // "list" | "card"
    const { currentUser } = useAuth();

    // Modal states
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDealsModalOpen, setIsDealsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contactsRes, companiesRes, usersRes] = await Promise.all([
                getContacts({ name: search || undefined, limit: 100 }),
                getCompanies({ limit: 1000 }),
                getTeamUsers()
            ]);
            setContacts(contactsRes.data.data);
            setCompanies(companiesRes.data.data);
            setUsers(usersRes.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load contacts dashboard");
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
            toast.success("Contact moved to archive");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete contact");
        }
    };

    // Aggregate data for stats
    const withLinkedIn = contacts.filter(c => c.linkedin).length;
    const withCompany = contacts.filter(c => c.companyId).length;

    // Aggregate job titles
    const titlesCount = {};
    contacts.forEach(c => {
        const t = c.jobTitle || "Other";
        titlesCount[t] = (titlesCount[t] || 0) + 1;
    });
    const jobTitles = Object.entries(titlesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, count]) => ({ title, count }));

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Contacts Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Global oversight of all professional connections</p>
                </div>
                <button
                    onClick={() => { setSelectedContact(null); setIsContactModalOpen(true); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>New Contact</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Contacts" value={String(contacts.length)} color="bg-red-50 text-red-600" icon={Users} />
                <StatCard label="With Company" value={String(withCompany)} color="bg-green-50 text-green-600" icon={Link2} />
                <StatCard label="On LinkedIn" value={String(withLinkedIn)} color="bg-orange-50 text-orange-600" icon={Linkedin} />
                <StatCard label="Records Loaded" value={String(contacts.length)} color="bg-red-50 text-red-500" icon={CalendarPlus} />
            </div>

            <div className="grid grid-cols-1 lg:col-span-5 gap-4">
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
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
                            <input type="text" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-red-400 bg-gray-50/50 focus:outline-none transition-all" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-4">
                            {viewMode === "list" ? (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {["Contact", "Company", "Deals", "Owner", "LinkedIn", "Actions"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading && contacts.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading contacts...</td></tr>
                                        ) : contacts.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-medium italic">no contacts found</td></tr>
                                        ) : (
                                            contacts.map((c) => (
                                                <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-3 cursor-pointer group/item"
                                                            onClick={() => navigate(`/dashboard/contacts/${c._id}`)}>
                                                            <Avatar name={`${c.firstName} ${c.lastName}`} />
                                                            <div>
                                                                <p className="font-medium text-gray-800 leading-none group-hover/item:text-red-600 transition-colors uppercase text-[11px] font-bold">{c.firstName} {c.lastName}</p>
                                                                <p className="text-xs text-gray-400 mt-1">{c.jobTitle}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 font-medium">
                                                        {(c.companies && c.companies.length > 0)
                                                            ? c.companies.map((comp, i) => (
                                                                <span key={i}>
                                                                    {comp.companyId ? (
                                                                        <button onClick={() => navigate(`/dashboard/companies/${comp.companyId?._id || comp.companyId}`)} className="hover:text-red-600 hover:underline whitespace-nowrap">
                                                                            {comp.companyName}
                                                                        </button>
                                                                    ) : <span className="whitespace-nowrap">{comp.companyName}</span>}
                                                                    {i < c.companies.length - 1 && <span className="text-gray-300 mx-1">,</span>}
                                                                </span>
                                                            ))
                                                            : c.companyId?._id ? (
                                                                <button onClick={() => navigate(`/dashboard/companies/${c.companyId._id}`)} className="hover:text-red-600 hover:underline whitespace-nowrap">
                                                                    {c.companyId.name}
                                                                </button>
                                                            ) : (c.companyName || "—")}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <button 
                                                            onClick={() => { setSelectedContact(c); setIsDealsModalOpen(true); }}
                                                            className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-100 hover:border-red-200 transition-all text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            Deals: {c.dealCount || 0}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{c.ownerId?.firstName || "System"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {c.linkedin ? (
                                                            <a href={c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium">
                                                                <Linkedin size={13} /><ExternalLink size={11} />
                                                            </a>
                                                        ) : <span className="text-gray-300 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => navigate(`/dashboard/contacts/${c._id}`)}
                                                                title="View details"
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                                <Eye size={16} />
                                                            </button>
                                                            <button onClick={() => { setSelectedContact(c); setIsContactModalOpen(true); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => { setSelectedContact(c); setIsDeleteModalOpen(true); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {loading && contacts.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-gray-400">Loading contacts...</div>
                                    ) : contacts.length === 0 ? (
                                        <div className="col-span-full text-center py-20 text-gray-400 font-medium uppercase tracking-widest text-xs">no contacts found</div>
                                    ) : (
                                        contacts.map((c) => (
                                            <ContactCard
                                                key={c._id}
                                                contact={c}
                                                basePath="/dashboard"
                                                onEdit={(contact) => { setSelectedContact(contact); setIsContactModalOpen(true); }}
                                                onDelete={(contact) => { setSelectedContact(contact); setIsDeleteModalOpen(true); }}
                                                onView={(contact) => navigate(`/dashboard/contacts/${contact._id}`)}
                                                onDealsClick={(contact) => { setSelectedContact(contact); setIsDealsModalOpen(true); }}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-full flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-4">Top Job Titles</h3>
                    <div className="space-y-4">
                        {jobTitles.length > 0 ? jobTitles.map((j, i) => {
                            const total = contacts.length || 1;
                            const pct = Math.round((j.count / total) * 100);
                            const colors = ["bg-red-500", "bg-orange-500", "bg-red-400", "bg-rose-400", "bg-red-300"];
                            return (
                                <div key={j.title}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 font-medium">{j.title}</span>
                                        <span className="text-gray-500">{pct}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        }) : <p className="text-center py-10 text-gray-400 text-sm">No data available</p>}
                    </div>
                </div>
            </div>

            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                contact={selectedContact}
                onSave={handleSaveContact}
                companies={companies}
                userRole={currentUser?.role}
                potentialOwners={users}
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
            <DeleteConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteContact} itemName={`${selectedContact?.firstName} ${selectedContact?.lastName}`} />
        </div>
    );
}
