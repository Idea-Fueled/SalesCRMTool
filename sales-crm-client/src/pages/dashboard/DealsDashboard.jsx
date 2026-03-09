import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Briefcase, Zap, CheckCircle2, DollarSign,
    MoreHorizontal, Plus, Edit2, Trash2,
    LayoutDashboard, Users, Building2, LayoutList, LayoutGrid, Kanban, Eye, ChevronRight, ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import KanbanBoard from "../../components/KanbanBoard";
import DealCard from "../../components/cards/DealCard";
import { getDeals, createDeal, updateDeal, deleteDeal, updateDealStage } from "../../../API/services/dealService";
import { getCompanies } from "../../../API/services/companyService";
import { getContacts } from "../../../API/services/contactService";
import { getTeamUsers } from "../../../API/services/userService";
import { useAuth } from "../../context/AuthContext";
import DealModal from "../../components/modals/DealModal";
import DealDetailsModal from "../../components/modals/DealDetailsModal";
import ContactDetailsModal from "../../components/modals/ContactDetailsModal";
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

const StatCard = ({ label, value, sub, color, icon: IconComp }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dealsRes, companiesRes, contactsRes, usersRes] = await Promise.all([
                getDeals({ limit: 100 }),
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
        fetchData();
    }, []);

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
            toast.success("Deal deleted successfully");
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
            // toast.success(`Moved to ${newStage}`);
            fetchData();
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
    const stageData = STAGES.map(s => ({
        stage: s,
        count: deals.filter(d => d.stage === s).length,
        color: stageBadge[s].split(' ')[0]
    }));

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-screen-xl mx-auto">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">Deals</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Deals Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Global overview of all sales opportunities</p>
                </div>
                <div className="flex items-center gap-3">
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Value" value={`$${totalValue >= 1000000 ? `${(totalValue / 1000000).toFixed(2)}M` : `${(totalValue / 1000).toFixed(1)}K`}`} color="bg-red-50 text-red-600" icon={DollarSign} />
                <StatCard label="Active Deals" value={String(activeCount)} color="bg-orange-50 text-red-500" icon={Zap} />
                <StatCard label="Won Deals" value={String(wonCount)} color="bg-green-50 text-green-600" icon={CheckCircle2} />
                <StatCard label="New Deals" value={String(deals.length)} color="bg-red-100 text-red-700" icon={Briefcase} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Briefcase} label="Total Deals" value={deals.length} color="bg-red-50 text-red-600" />
                <StatCard icon={LayoutDashboard} label="Pipeline Value" value={`$${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}`} color="bg-orange-50 text-red-500" />
                <StatCard icon={Users} label="Active Owners" value={new Set(deals.map(d => d.ownerId?._id)).size} color="bg-red-100 text-red-700" />
                <StatCard icon={Building2} label="Companies" value={new Set(deals.map(d => d.companyId?._id)).size} color="bg-rose-50 text-red-600" />
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
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                        {loading && deals.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-gray-400">Loading deals...</div>
                        ) : (
                            (stageFilter === "All Stages" ? deals : deals.filter(d => d.stage === stageFilter)).length === 0 ? (
                                <div className="col-span-full text-center py-10 text-gray-400">No deals found.</div>
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
                    <Card className="lg:col-span-3 overflow-hidden h-full flex flex-col">
                        <CardHeader title="All Recent Deals">
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                                <MoreHorizontal size={18} />
                            </button>
                        </CardHeader>
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {["Deal Name", "Owner", "Company", "Contact", "Stage", "Value", "Actions"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading && deals.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading deals...</td></tr>
                                        ) : deals.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No deals found in the system.</td></tr>
                                        ) : (
                                            deals.slice(0, 10).map((d) => (
                                                <tr key={d._id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap cursor-pointer hover:text-red-600 transition-colors"
                                                        onClick={() => navigate(`/dashboard/deals/${d._id}`)}>
                                                        {d.name}
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
                                                                onClick={() => { setSelectedContact(d.contactId); setIsContactDetailsModalOpen(true); }}
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

                    <Card className="lg:col-span-2 h-full flex flex-col">
                        <CardHeader title="Deals by Stage" />
                        <div className="p-5 space-y-4">
                            {stageData.map(s => {
                                const total = deals.length || 1;
                                const pct = Math.round((s.count / total) * 100);
                                return (
                                    <div key={s.stage}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 font-medium">{s.stage}</span>
                                            <span className="text-gray-500">{s.count} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${s.color.replace(' text-', ' bg-')} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-5 border-t border-gray-50 mt-auto">
                            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                                <span>Win Probability</span>
                                <span className="font-bold text-green-600">{winRate}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${winRate}%` }} />
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
            />
        </div>
    );
}
