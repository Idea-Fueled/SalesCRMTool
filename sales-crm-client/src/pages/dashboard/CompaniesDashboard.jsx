import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Building2, CheckCircle2, Eye, XCircle, ChevronDown, Plus, Edit2, Trash2, Search, ArrowLeft, ChevronRight,
    LayoutGrid, LayoutList, Mail, Phone, MapPin, Star, MoreVertical, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { getRankedCompanies } from "../../API/services/rankService";
import { getCompanies, createCompany, updateCompany, deleteCompany } from "../../API/services/companyService";
import { getTeamUsers } from "../../API/services/userService";
import RankBadge from "../../components/RankBadge";
import { useAuth } from "../../context/AuthContext";
import CompanyCard from "../../components/cards/CompanyCard";
import CompanyModal from "../../components/modals/CompanyModal";
import CompanyDetailsModal from "../../components/modals/CompanyDetailsModal";
import useDashboardRefresh from "../../hooks/useDashboardRefresh";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import { toast } from "react-hot-toast";

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ title, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const StatCard = ({ label, value, sub, icon: IconComp }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-600 text-white shadow-md shadow-red-100">
            <IconComp size={20} />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
            {sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>}
        </div>
    </div>
);

const statusBg = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-red-100 text-red-600",
    Prospect: "bg-blue-100 text-blue-600",
};

// Internal CompanyCard removed in favor of global component

export default function CompaniesDashboard() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [allCompanies, setAllCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("grid");

    // Modal states
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [users, setUsers] = useState([]);
    const { currentUser } = useAuth();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [companiesRes, allCompaniesRes, usersRes] = await Promise.all([
                getRankedCompanies({ name: search || undefined, limit: 100 }),
                getCompanies({ limit: 1000 }), // Fetch full list for stats
                getTeamUsers()
            ]);
            setCompanies(companiesRes.data.data);
            setAllCompanies(allCompaniesRes.data.data);
            setUsers(usersRes.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load companies dashboard");
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

    const handleSaveCompany = async (formData) => {
        try {
            if (selectedCompany) {
                await updateCompany(selectedCompany._id, formData);
                toast.success("Company updated successfully");
            } else {
                await createCompany(formData);
                toast.success("Company created successfully");
            }
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save company");
            throw error;
        }
    };

    const handleDeleteCompany = async () => {
        if (!selectedCompany) return;
        try {
            await deleteCompany(selectedCompany._id);
            toast.success("Company moved to archive");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete company");
        }
    };

    // Aggregations using allCompanies to keep stats global
    const activeCount = allCompanies.filter(c => c.status === "Active").length;
    const prospectCount = allCompanies.filter(c => c.status === "Prospect").length;
    const inactiveCount = allCompanies.filter(c => c.status === "Inactive").length;
    const totalCount = allCompanies.length;

    // Industries breakdown using allCompanies
    const indCount = {};
    allCompanies.forEach(c => {
        const i = c.industry || "Unknown";
        indCount[i] = (indCount[i] || 0) + 1;
    });
    const industries = Object.entries(indCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Companies Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Global oversight of all corporate entities</p>
                </div>
                <button
                    onClick={() => { setSelectedCompany(null); setIsCompanyModalOpen(true); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>New Company</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Companies" value={String(totalCount)} icon={Building2} />
                <StatCard label="Active Customers" value={String(activeCount)} icon={CheckCircle2} />
                <StatCard label="Prospects" value={String(prospectCount)} icon={Eye} />
                <StatCard label="Inactive" value={String(inactiveCount)} icon={XCircle} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="font-bold text-gray-800">All Companies</h2>
                            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode("list")}
                                    title="List View"
                                    className={`p-1.5 rounded-md transition flex items-center justify-center ${viewMode === "list" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    <LayoutList size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    title="Grid View"
                                    className={`p-1.5 rounded-md transition flex items-center justify-center ${viewMode === "grid" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="w-full sm:w-64 relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-red-400 focus:outline-none bg-gray-50/50" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-4">
                            {viewMode === "list" ? (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {["Rank", "Company", "Industry", "Email", "Owner", "Status", "Actions"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading && companies.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading companies...</td></tr>
                                        ) : companies.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-bold  tracking-widest text-[10px] opacity-60 "> 'No ' + $args[0].Groups[1].Value.ToLower() + ' found' </td></tr>
                                        ) : (
                                            companies.map((c) => (
                                                <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <RankBadge score={c.aiScore} tier={c.aiTier} compact />
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap cursor-pointer hover:text-red-600 transition-colors"
                                                        onClick={() => navigate(`/dashboard/companies/${c._id}`)}>
                                                        {c.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.industry || "—"}</td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                        {c.email ? (
                                                            <a href={`mailto:${c.email}`} className="hover:text-red-600 transition-colors">{c.email}</a>
                                                        ) : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-red-700 font-bold whitespace-nowrap">{c.ownerId?.firstName || "System"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBg[c.status] || "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => navigate(`/dashboard/companies/${c._id}`)}
                                                                title="View details"
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                                <Eye size={16} />
                                                            </button>
                                                            <button onClick={() => { setSelectedCompany(c); setIsCompanyModalOpen(true); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => { setSelectedCompany(c); setIsDeleteModalOpen(true); }}
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
                                    {loading && companies.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-gray-400">Loading companies...</div>
                                    ) : companies.length === 0 ? (
                                        <div className="col-span-full text-center py-20 text-gray-400 font-medium uppercase tracking-widest text-xs"> 'No ' + $args[0].Groups[1].Value.ToLower() + ' found' </div>
                                    ) : (
                                        companies.map((c) => (
                                            <CompanyCard
                                                key={c._id}
                                                company={c}
                                                onEdit={(company) => { setSelectedCompany(company); setIsCompanyModalOpen(true); }}
                                                onDelete={(company) => { setSelectedCompany(company); setIsDeleteModalOpen(true); }}
                                                onView={(company) => navigate(`/dashboard/companies/${company._id}`)}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Industry Mix</h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">{industries.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <div className="space-y-4">
                            {industries.length > 0 ? industries.map((ind, i) => {
                                const total = allCompanies.length || 1;
                                const pct = Math.round((ind.count / total) * 100);
                                const colors = ["bg-red-500", "bg-red-400", "bg-orange-500", "bg-rose-500", "bg-red-300"];
                                return (
                                    <div key={ind.name} className="group">
                                        <div className="flex justify-between text-[11px] mb-1.5">
                                            <span className="text-gray-600 font-semibold truncate flex-1 mr-2">{ind.name}</span>
                                            <span className="text-gray-400 font-bold">{pct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                            <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-center py-10 text-gray-400 text-xs">No industry data</p>}
                        </div>
                    </div>
                </div>
            </div>

            <CompanyModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                company={selectedCompany}
                onSave={handleSaveCompany}
                userRole={currentUser?.role}
                potentialOwners={users}
            />
            <CompanyDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                company={selectedCompany}
            />
            <DeleteConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteCompany} itemName={selectedCompany?.name} />
        </div>
    );
}








