import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Eye, XCircle, Plus, Edit2, Trash2, Search, ChevronRight, LayoutGrid, LayoutList } from "lucide-react";
import { Link } from "react-router-dom";
import { getRankedCompanies } from "../../API/services/rankService";
import { getCompanies, createCompany, updateCompany, deleteCompany } from "../../API/services/companyService";
import RankBadge from "../../components/RankBadge";
import CompanyModal from "../../components/modals/CompanyModal";
import CompanyDetailsModal from "../../components/modals/CompanyDetailsModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import CompanyCard from "../../components/cards/CompanyCard";
import useDashboardRefresh from "../../hooks/useDashboardRefresh";
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

const statusBg = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-red-100 text-red-600",
    Prospect: "bg-blue-100 text-blue-600",
};

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "—";
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};

export default function RepCompanies() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("grid");

    // Modal states
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getRankedCompanies({ name: search || undefined, limit: 100 });
            setCompanies(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load companies");
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
            toast.success("Company deleted successfully");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete company");
        }
    };

    const stats = [
        { label: "My Companies", value: String(companies.length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: Building2 },
        { label: "Active", value: String(companies.filter(c => c.status === "Active").length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: CheckCircle2 },
        { label: "Prospects", value: String(companies.filter(c => c.status === "Prospect").length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: Eye },
    ];

    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Companies</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage the companies in your portfolio</p>
                </div>
                <button
                    onClick={() => { setSelectedCompany(null); setIsCompanyModalOpen(true); }}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>Add Company</span>
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
                        <h3 className="font-semibold text-gray-800 text-base">All Companies</h3>
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
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search company..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50/50" />
                    </div>
                </div>
                <div className="p-4 min-h-[300px]">
                    {viewMode === "list" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        {["Rank", "Company", "Industry", "Size", "Status", "Revenue Range", "Actions"].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && companies.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading companies...</td></tr>
                                    ) : companies.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-[10px] opacity-60 ">NO companies FOUND</td></tr>
                                    ) : (
                                        companies.map((c) => (
                                            <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <RankBadge score={c.aiScore} tier={c.aiTier} compact />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800 cursor-pointer hover:text-red-600 transition-colors"
                                                    onClick={() => navigate(`/rep/companies/${c._id}`)}>
                                                    {c.name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{c.industry || "—"}</td>
                                                <td className="px-4 py-3 text-gray-600">{c.size || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${statusBg[c.status] || "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 font-medium">{formatCurrency(c.revenueRange)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => navigate(`/rep/companies/${c._id}`)}
                                                            title="View details"
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedCompany(c); setIsCompanyModalOpen(true); }}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedCompany(c); setIsDeleteModalOpen(true); }}
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
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {loading && companies.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-gray-400">Loading companies...</div>
                            ) : companies.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-gray-400 font-medium  uppercase tracking-widest text-xs">NO companies FOUND</div>
                            ) : (
                                companies.map((c) => (
                                    <CompanyCard
                                        key={c._id}
                                        company={c}
                                        onEdit={(company) => { setSelectedCompany(company); setIsCompanyModalOpen(true); }}
                                        onDelete={(company) => { setSelectedCompany(company); setIsDeleteModalOpen(true); }}
                                        onView={(company) => navigate(`/rep/companies/${company._id}`)}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                    <p className="text-xs text-gray-400">You can only manage companies you own. For ownership changes, contact your manager.</p>
                </div>
            </Card>

            <CompanyModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                company={selectedCompany}
                onSave={handleSaveCompany}
            />

            <CompanyDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                company={selectedCompany}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteCompany}
                itemName={selectedCompany?.name}
            />
        </div>
    );
}


