import React, { useState, useEffect } from "react";
import { Users2, Search, Plus, Eye, LayoutList, LayoutGrid, CheckCircle2, XCircle, UserCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getTeamUsers, deactivateUser, activateUser } from "../../API/services/userService";
import { getDeals } from "../../API/services/dealService";
import UserModal from "../../components/modals/UserModal";
import UserDetailsModal from "../../components/modals/UserDetailsModal";
import DeactivateModal from "../../components/modals/DeactivateModal";
import ReassignModal from "../../components/modals/ReassignModal";
import { useAuth } from "../../context/AuthContext";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import UserCard from "../../components/cards/UserCard";
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

const Avatar = ({ name }) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts[parts.length - 1] || "";
    const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    return (
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
        </div>
    );
};

const roleBadge = {
    sales_manager: "bg-red-100 text-red-700",
    sales_rep: "bg-red-50 text-red-600 border border-red-50",
};
const formatRole = (r) => ({ admin: "Admin", sales_manager: "Sales Manager", sales_rep: "Sales Representative" }[r] || r?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

export default function ManagerTeam() {
    const { user: currentUser } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [userDeals, setUserDeals] = useState([]);
    const [viewMode, setViewMode] = useState("list"); // "list" | "card"
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [allDeals, setAllDeals] = useState([]);
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", confirmLabel: "", confirmColor: "", onConfirm: null });
    const openConfirm = (opts) => setConfirmState({ isOpen: true, ...opts });
    const closeConfirm = () => setConfirmState(s => ({ ...s, isOpen: false }));

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const [usersRes, dealsRes] = await Promise.all([
                getTeamUsers(),
                getDeals()
            ]);
            setMembers(usersRes.data);
            setAllDeals(dealsRes.data.data || dealsRes.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load team data");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (member) => {
        const memberDeals = allDeals.filter(d => d.ownerId?._id === member._id || d.ownerId === member._id);
        const won = memberDeals.filter(d => d.stage === "Closed Won").length;
        const lost = memberDeals.filter(d => d.stage === "Closed Lost").length;
        const totalValue = memberDeals.reduce((sum, d) => sum + (d.value || 0), 0);

        setSelectedMember(member);
        setUserStats({
            deals: memberDeals.length,
            won,
            lost,
            pipeline: `$${totalValue.toLocaleString()}`
        });
        setUserDeals(memberDeals.slice(0, 5));
        setIsDetailsModalOpen(true);
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const handleToggleActive = (member) => {
        if (!member.isActive) {
            handleActivate(member);
            return;
        }
        setSelectedMember(member);
        setIsDeactivateModalOpen(true);
    };

    const handleActivate = (member) => {
        openConfirm({
            title: "Activate Member?",
            message: `Are you sure you want to reactivate ${member.firstName} ${member.lastName}? They will be able to log in again.`,
            confirmLabel: "Activate",
            confirmColor: "bg-red-600 hover:bg-red-700",
            onConfirm: async () => {
                try {
                    await activateUser(member._id);
                    toast.success(`${member.firstName} reactivated`);
                    fetchTeam();
                } catch (error) {
                    console.error(error);
                    toast.error(error.response?.data?.message || "Failed to activate user");
                }
            }
        });
    };

    const confirmDeactivate = async (newOwnerId) => {
        try {
            const body = newOwnerId ? { newOwnerId } : {};
            await deactivateUser(selectedMember._id, body);
            const msg = newOwnerId
                ? `${selectedMember.firstName} deactivated and records reassigned`
                : `${selectedMember.firstName} deactivated (data kept with user)`;
            toast.success(msg);
            fetchTeam();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to deactivate user");
            throw error;
        }
    };

    const filtered = members.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
    );

    const repsOnly = members.filter(m => m.role === "sales_rep");
    const activeCount = members.filter(m => m.isActive).length;
    const inactiveCount = members.filter(m => !m.isActive).length;

    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Team Management</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage your sales representatives</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>Add Member</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Total Members", value: loading ? "..." : String(members.length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: Users2 },
                    { label: "Active", value: loading ? "..." : String(activeCount), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: CheckCircle2 },
                    { label: "Inactive", value: loading ? "..." : String(inactiveCount), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: XCircle },
                    { label: "SALES REPRESENTATIVES", value: loading ? "..." : String(repsOnly.length), color: "bg-red-600 text-white shadow-md shadow-red-100", icon: UserCheck },
                ].map(s => (
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
                    <h2 className="font-bold text-gray-800">Team Members</h2>
                    <div className="flex items-center gap-3">
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
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search member..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50/50" />
                        </div>
                    </div>
                </div>
                {viewMode === "list" ? (
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["Member", "Role", "Reports To", "Status", "Last Login", "Action"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading team...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No members found.</td></tr>
                                ) : (
                                    filtered.map((m) => (
                                        <tr
                                            key={m._id}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => handleViewDetails(m)}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={`${m.firstName} ${m.lastName}`} />
                                                    <div>
                                                        <p className="font-bold text-gray-800 leading-none group-hover:text-red-600 transition-colors uppercase">{m.firstName} {m.lastName}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleBadge[m.role] || "bg-red-100 text-red-700"}`}>
                                                    {formatRole(m.role)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                                                {m.managerId ? `${m.managerId.firstName || "Manager"} ${m.managerId.lastName || ""}`.trim() : "—"}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${m.isActive
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700 border border-red-200"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                                                    {m.isActive ? "Active" : "Deactivated"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                {m.lastLogin ? new Date(m.lastLogin).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleViewDetails(m)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="View profile details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    {m.role === "sales_rep" ? (
                                                        <button
                                                            onClick={() => handleToggleActive(m)}
                                                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition ${m.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                                                        >
                                                            {m.isActive ? "Deactivate" : "Activate"}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? (
                            <div className="col-span-full text-center py-10 text-gray-400">Loading team cards...</div>
                        ) : filtered.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-gray-400">No members found.</div>
                        ) : (
                                    filtered.map(m => (
                                        <UserCard
                                            key={m._id}
                                            user={m}
                                            onView={handleViewDetails}
                                            onEdit={null}
                                            onDeactivate={(u) => { setSelectedMember(u); setIsDeactivateModalOpen(true); }}
                                            onActivate={handleActivate}
                                            onReassign={(u) => { setSelectedMember(u); setIsReassignModalOpen(true); }}
                                            onDelete={null}
                                        />
                                    ))
                        )}
                    </div>
                )}
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchTeam}
                restrictedRole="sales_rep"
                fixedManagerId={currentUser?.id}
            />

            <DeactivateModal
                isOpen={isDeactivateModalOpen}
                onClose={() => setIsDeactivateModalOpen(false)}
                user={selectedMember}
                activeUsers={members}
                onConfirm={confirmDeactivate}
            />
            <UserDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                user={selectedMember}
                stats={userStats}
                recentDeals={userDeals}
            />
            <ReassignModal
                isOpen={isReassignModalOpen}
                onClose={() => setIsReassignModalOpen(false)}
                fromUser={selectedMember}
                activeUsers={members}
                onSaved={fetchTeam}
            />
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel={confirmState.confirmLabel}
                confirmColor={confirmState.confirmColor}
            />
        </div>
    );
}
