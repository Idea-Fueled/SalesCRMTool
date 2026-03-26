import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Briefcase, Zap, CheckCircle2, DollarSign,
    MoreHorizontal, Plus, Edit2, Trash2,
    LayoutDashboard, Users, Building2, LayoutList, LayoutGrid, Kanban, Eye, ChevronRight, ChevronDown, Search
} from "lucide-react";
import { Link } from "react-router-dom";
import KanbanBoard from "../../components/KanbanBoard";
import DealCard from "../../components/cards/DealCard";
import { getDeals, createDeal, updateDeal, deleteDeal, updateDealStage } from "../../API/services/dealService";
import { getCompanies } from "../../API/services/companyService";
import { getContacts } from "../../API/services/contactService";
import { getTeamUsers } from "../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import DealModal from "../../components/modals/DealModal";
import DealDetailsModal from "../../components/modals/DealDetailsModal";
import ContactDetailsModal from "../../components/modals/ContactDetailsModal";
import DeleteConfirmModal from "../../components/modals/DeleteConfirmModal";
import CollapsibleDealName from "../../components/CollapsibleDealName";
import { toast } from "react-hot-toast";
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

const StatCard = ({ label, value, sub, icon: IconComp }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-600 text-white shadow-md shadow-red-100">
            <IconComp size={20} />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-xs text-green-500 font-medium mt-0.5">{sub}</p>
        </div>
    </div>
);

const stageBadge = {
    Lead: "bg-blue-100 text-blue-700 border border-blue-200",
    Qualified: "bg-purple-100 text-purple-700 border border-purple-200",
    Proposal: "bg-amber-100 text-amber-700 border border-amber-200",
    Negotiation: "bg-orange-100 text-orange-700 border border-orange-200",
    "Closed Won": "bg-green-100 text-green-700 border border-green-200",
    "Closed Lost": "bg-red-100 text-red-700 border border-red-200",
};

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const stageOptions = ["All Stages", "Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export default function DealsDashboard() {
    const navigate = useNavigate();
    const [deals, setDeals] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const { user: currentUser } = useAuth();

    // Modal states
    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isContactDetailsModalOpen, setIsContactDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [viewMode, setViewMode] = useState("list"); // "list" | "card" | "kanban"
    const [stageFilter, setStageFilter] = useState("All Stages");

    const fetchData = async (options = {}) => {
        const { isSilent = false } = options;
        if (!isSilent) setLoading(true);
        try {
            const [dealsRes, companiesRes, contactsRes, usersRes] = await Promise.all([
                getDeals({ limit: 100, name: search || undefined }),
                getCompanies({ limit: 1000 }),
                getContacts({ limit: 1000 }),
                getTeamUsers()
            ]);
            setDeals(dealsRes.data.data);
            setCompanies(companiesRes.data.data);
            setContacts(contactsRes.data.data);
            setUsers(usersRes.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load dashboard data");
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

    const handleSaveDeal = async (formData) => {
        try {
            if (selectedDeal) {
                await updateDeal(selectedDeal._id, formData);
                toast.success("Deal updated successfully");
            } else {
                await createDeal(formData);
                toast.success("Deal created successfully");
            }
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save deal");
            throw error;
        }
    };

    const handleDeleteDeal = async () => {
        if (!selectedDeal) return;
        try {
            await deleteDeal(selectedDeal._id);
            toast.success("Deal moved to archive");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete deal");
        }
    };

    const handleMoveStage = async (id, newStage) => {
        try {
            await updateDealStage(id, newStage);
            toast.success(`Moved to ${newStage}`);
            fetchData({ isSilent: true });
        } catch (error) {
            console.error(error);
            toast.error("Failed to move stage");
        }
    };

    const totalValue = deals.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const wonCount = deals.filter(d => d.stage === "Closed Won").length;
    const lostCount = deals.filter(d => d.stage === "Closed Lost").length;
    const activeCount = deals.filter(d => !d.stage.startsWith("Closed")).length;
    const winRate = Math.round((wonCount / (wonCount + lostCount || 1)) * 100);

    // Chart data simulation from real data
    const stageData = STAGES.map(s => {
        const darkColors = {
            Lead: "bg-blue-600",
            Qualified: "bg-purple-600",
            Proposal: "bg-amber-500",
            Negotiation: "bg-orange-500",
            "Closed Won": "bg-green-600",
            "Closed Lost": "bg-red-600",
        };
        return {
            stage: s,
            count: deals.filter(d => d.stage === s).length,
            color: darkColors[s]
        };
    });

    // (FoldText removed - restored original behavior)

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Deals Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Global overview of all sales opportunities</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("list")}
                            title="List View"
                            className={`p-1.5 rounded-md transition text-sm flex items-center justify-center font-medium ${viewMode === "list"
                                ? "bg-white text-red-600 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <LayoutList size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode("card")}
                            title="Card View"
                            className={`p-1.5 rounded-md transition text-sm flex items-center justify-center font-medium ${viewMode === "card"
                                ? "bg-white text-red-600 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            title="Kanban View"
                            className={`p-1.5 rounded-md transition text-sm flex items-center justify-center font-medium ${viewMode === "kanban"
                                ? "bg-white text-red-600 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <Kanban size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setSelectedDeal(null); setIsDealModalOpen(true); }}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                    >
                        <Plus size={18} />
                        <span>Add Deal</span>
                    </button>
                </div>
            </div>
        </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Deal Value" value={`$${totalValue >= 1000000 ? `${(totalValue / 1000000).toFixed(2)}M` : `${(totalValue / 1000).toFixed(1)}K`}`} icon={DollarSign} />
                <StatCard label="Active Deals" value={String(activeCount)} icon={Zap} />
                <StatCard label="Won Deals" value={String(wonCount)} icon={CheckCircle2} />
                <StatCard label="New Deals" value={String(deals.length)} icon={Briefcase} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Briefcase} label="Total Deals" value={deals.length} />
                <StatCard icon={LayoutDashboard} label="Pipeline Value" value={`$${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}`} />
                <StatCard icon={Users} label="Active Owners" value={new Set(deals.map(d => d.ownerId?._id)).size} />
                <StatCard icon={Building2} label="Companies" value={new Set(deals.map(d => d.companyId?._id)).size} />
            </div>

            {/* Kanban Board View */}
            {viewMode === "kanban" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="font-bold text-gray-800">Pipeline Board</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{deals.length} deals across all stages</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading pipeline...</div>
                    ) : (
                        <KanbanBoard
                            deals={deals}
                            onEdit={(d) => { setSelectedDeal(d); setIsDealModalOpen(true); }}
                            onDelete={(d) => { setSelectedDeal(d); setIsDeleteModalOpen(true); }}
                            onMove={handleMoveStage}
                        />
                    )}
                </div>
            )}

            {/* Card Grid View */}
            {viewMode === "card" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <h2 className="font-bold text-gray-800">All Deals Grid</h2>
                        <div className="flex flex-wrap items-stretch sm:items-center gap-2">
                            <div className="flex-1 sm:flex-none">
                                <select
                                    value={stageFilter}
                                    onChange={e => setStageFilter(e.target.value)}
                                    className="appearance-none text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 hover:border-gray-300 transition"
                                >
                                    {stageOptions.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {loading && deals.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-gray-400">Loading deals...</div>
                        ) : (
                            (stageFilter === "All Stages" ? deals : deals.filter(d => d.stage === stageFilter)).length === 0 ? (
                                <div className="col-span-full text-center py-20 text-gray-400 font-medium italic">no deals found</div>
                            ) : (
                                (stageFilter === "All Stages" ? deals : deals.filter(d => d.stage === stageFilter)).map((d) => (
                                    <DealCard
                                        key={d._id}
                                        deal={d}
                                        onEdit={(deal) => { setSelectedDeal(deal); setIsDealModalOpen(true); }}
                                        onDelete={(deal) => { setSelectedDeal(deal); setIsDeleteModalOpen(true); }}
                                        onView={(deal) => navigate(`/dashboard/deals/${deal._id}`)}
                                    />
                                ))
                            )
                        )}
                    </div>
                </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <Card className="lg:col-span-4 overflow-hidden h-full flex flex-col">
                        <CardHeader title="All Recent Deals">
                            <div className="flex items-center gap-3">
                                <div className="relative w-48 sm:w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search deals..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full text-sm border border-gray-100 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-red-400 focus:outline-none bg-gray-50/50 transition-all font-normal"
                                    />
                                </div>
                                </div>
                            </CardHeader>
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {["Deal Name", "Owner", "Company", "Contact", "Stage", "Deal Value", "Actions"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading && deals.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading deals...</td></tr>
                                        ) : deals.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-20 text-gray-400 font-medium italic">no deals found</td></tr>
                                        ) : (
                                            deals.slice(0, 10).map((d) => (
                                                <tr key={d._id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-4 py-3 cursor-pointer">
                                                        <CollapsibleDealName 
                                                            name={d.name} 
                                                            onNavigate={() => navigate(`/dashboard/deals/${d._id}`)} 
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-red-700 font-semibold whitespace-nowrap">{d.ownerId?.firstName || "System"}</td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                        {d.companyId?._id ? (
                                                            <button onClick={() => navigate(`/dashboard/companies/${d.companyId._id}`)} className="hover:text-red-600 hover:underline">
                                                                {d.companyId.name}
                                                            </button>
                                                        ) : (d.companyName || "—")}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                        {d.contactId?._id ? (
                                                            <button
                                                                onClick={() => { if (d.contactId?._id || d.contactId) navigate(`/dashboard/contacts/${d.contactId?._id || d.contactId}`); }}
                                                                className="hover:text-red-600 hover:underline"
                                                            >
                                                                {`${d.contactId.firstName} ${d.contactId.lastName}`.trim()}
                                                            </button>
                                                        ) : (d.contactName || "—")}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="relative inline-flex items-center">
                                                            <select
                                                                value={d.stage}
                                                                onChange={e => handleMoveStage(d._id, e.target.value)}
                                                                className={`appearance-none text-[11px] pl-2.5 pr-8 py-1 rounded-full font-bold border-none cursor-pointer focus:ring-0 whitespace-nowrap ${stageBadge[d.stage]}`}
                                                            >
                                                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                            <ChevronDown size={10} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 opacity-60" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">${d.value?.toLocaleString()}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => navigate(`/dashboard/deals/${d._id}`)}
                                                                title="View details"
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedDeal(d); setIsDealModalOpen(true); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedDeal(d); setIsDeleteModalOpen(true); }}
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
                        </div>
                    </Card>

                    <Card className="lg:col-span-1 h-full flex flex-col">
                        <CardHeader title="Deals by Stage" />
                        <div className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            {stageData.map(s => {
                                const total = deals.length || 1;
                                const pct = Math.round((s.count / total) * 100);
                                return (
                                    <div key={s.stage}>
                                        <div className="flex justify-between text-[11px] mb-1.5">
                                            <span className="text-gray-600 font-semibold truncate flex-1 mr-2">{s.stage}</span>
                                            <span className="text-gray-400 font-bold">{pct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                            <div className={`h-full ${s.color.replace(' text-', ' bg-')} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-5 border-t border-gray-50 mt-auto bg-gray-50/30">
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                                <span className="font-semibold uppercase tracking-wider">Win Probability</span>
                                <span className="font-bold text-green-600">{winRate}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                                <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${winRate}%` }} />
                            </div>
                        </div>
                    </Card>
                </div>)}


            {/* Modals */}
            <DealModal
                isOpen={isDealModalOpen}
                onClose={() => setIsDealModalOpen(false)}
                deal={selectedDeal}
                onSave={handleSaveDeal}
                companies={companies}
                contacts={contacts}
                userRole={currentUser?.role}
                potentialOwners={users}
                currentUserId={currentUser?._id || currentUser?.id}
            />

            <DealDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                deal={selectedDeal}
            />

            <ContactDetailsModal
                isOpen={isContactDetailsModalOpen}
                onClose={() => setIsContactDetailsModalOpen(false)}
                contact={selectedContact}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteDeal}
                itemName={selectedDeal?.name}
                currentUserId={currentUser?._id || currentUser?.id}
            />
        </div>
    );
}
