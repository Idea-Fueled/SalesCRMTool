import React, { useState, useEffect } from "react";
import { Users2, ShieldCheck, Briefcase, UserCheck, Edit2, Plus, X, Search, Trash2, Eye, ArrowLeft, ChevronRight, LayoutGrid, LayoutList, RefreshCcwDot } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import UserCard from "../../components/cards/UserCard";
import { getTeamUsers, deactivateUser, activateUser, bulkReassignRecords, softDeleteUser, resendInvitation as apiResendInvitation } from "../../../API/services/userService";
import UserModal from "../../components/modals/UserModal";
import UserDetailsModal from "../../components/modals/UserDetailsModal";
import DeactivateModal from "../../components/modals/DeactivateModal";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import { toast } from "react-hot-toast";

// ─── Shared UI ────────────────────────────────────────────────
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
    const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-teal-500"];
    return (
        <div className={`w-9 h-9 rounded-full ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
        </div>
    );
};
const roleBadge = {
    admin: "bg-red-100 text-red-700",
    sales_manager: "bg-red-50 text-red-600 border border-red-100",
    sales_rep: "bg-red-50 text-red-600 border border-red-100",
};
const formatRole = (r) => ({ admin: "ADMIN", sales_manager: "SALES MANAGER", sales_rep: "SALES REPRESENTATIVE" }[r] || r?.toUpperCase());
const ModalOverlay = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: "rgba(15,15,25,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);
const ModalHeader = ({ title, onClose }) => (
    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <X size={18} />
        </button>
    </div>
);
const Field = ({ label, children }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        {children}
    </div>
);
const baseInput = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white transition";
const inputClass = (err) => err
    ? `${baseInput} border-red-400 focus:ring-red-200 bg-red-50`
    : `${baseInput} border-gray-200 focus:ring-red-400`;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



// ─── Reassign Modal ────────────────────────────────────────────
function ReassignModal({ isOpen, onClose, fromUser, activeUsers, onSaved }) {
    const [newOwnerId, setNewOwnerId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (isOpen) setNewOwnerId(""); }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newOwnerId) { toast.error("Please select a new owner"); return; }
        setSaving(true);
        try {
            await bulkReassignRecords(fromUser._id, newOwnerId);
            toast.success("All records reassigned successfully");
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reassign records");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !fromUser) return null;
    const opts = activeUsers.filter(u => u._id !== fromUser._id && u.isActive);

    return (
        <ModalOverlay onClose={onClose}>
            <ModalHeader title="Bulk Reassign Records" onClose={onClose} />
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <p className="font-semibold mb-1">⚠️ Reassigning all records</p>
                    <p>This will transfer <span className="font-bold">all companies, contacts & deals</span> owned by <span className="font-bold">{fromUser.firstName} {fromUser.lastName}</span> to the selected user.</p>
                </div>
                <Field label="Assign all records to *">
                    <select value={newOwnerId} onChange={e => setNewOwnerId(e.target.value)} className={`${inputClass} w-full border rounded-full border-slate-200 px-4 py-2 text-center`} required>
                        <option value="">— Select a user —</option>
                        {opts.map(u => (
                            <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({formatRole(u.role)})</option>
                        ))}
                    </select>
                </Field>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-60 transition">
                        {saving ? "Reassigning..." : "Reassign All Records"}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
}


// ─── Main Dashboard ────────────────────────────────────────────
export default function UsersDashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("list");

    // Modal state
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Confirm dialog state
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", confirmLabel: "", confirmColor: "", onConfirm: null });
    const openConfirm = (opts) => setConfirmState({ isOpen: true, ...opts });
    const closeConfirm = () => setConfirmState(s => ({ ...s, isOpen: false }));

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getTeamUsers();
            setUsers(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDeactivate = (user) => {
        if (!user.isActive) { toast.error("User is already inactive"); return; }
        setSelectedUser(user);
        setIsDeactivateModalOpen(true);
    };

    const confirmDeactivate = async (newOwnerId) => {
        try {
            const body = newOwnerId ? { newOwnerId } : {};
            await deactivateUser(selectedUser._id, body);
            const msg = newOwnerId
                ? `${selectedUser.firstName} deactivated and records reassigned`
                : `${selectedUser.firstName} deactivated (data kept with user)`;
            toast.success(msg);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to deactivate user");
            throw error;
        }
    };

    const handleActivate = (user) => {
        if (user.isActive) { toast.error("User is already active"); return; }
        openConfirm({
            title: "Activate User?",
            message: `Are you sure you want to reactivate ${user.firstName} ${user.lastName}? They will be able to log in again.`,
            confirmLabel: "Activate",
            confirmColor: "bg-green-600 hover:bg-green-700",
            onConfirm: async () => {
                try {
                    await activateUser(user._id);
                    toast.success(`${user.firstName} reactivated`);
                    fetchUsers();
                } catch (error) {
                    toast.error(error.response?.data?.message || "Failed to activate user");
                }
            }
        });
    };

    const handleSoftDelete = (user) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const confirmSoftDelete = async (newOwnerId) => {
        try {
            const body = newOwnerId ? { newOwnerId } : {};
            await softDeleteUser(selectedUser._id, body);
            const msg = newOwnerId
                ? `${selectedUser.firstName} moved to trash and records reassigned`
                : `${selectedUser.firstName} moved to trash (data kept with user)`;
            toast.success(msg);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete user");
            throw error;
        }
    };

    const handleResendInvite = async (user) => {
        try {
            await apiResendInvitation(user._id);
            toast.success(`Invitation link resent to ${user.email}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to resend invitation");
        }
    };

    const potentialManagers = users.filter(u => u.isActive);
    const adminCount = users.filter(u => u.role === "admin").length;
    const managerCount = users.filter(u => u.role === "sales_manager").length;
    const repCount = users.filter(u => u.role === "sales_rep").length;

    const filtered = users.filter(u => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || u.email?.toLowerCase().includes(q) || u.role?.includes(q);
    });

    const roleBreakdown = [
        { role: "Admins", count: adminCount, color: "bg-red-500" },
        { role: "Sales Managers", count: managerCount, color: "bg-purple-500" },
        { role: "Sales Representatives", count: repCount, color: "bg-blue-500" },
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-screen-xl mx-auto">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">User Management</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Users Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage all users and their roles</p>
                </div>
                <button
                    onClick={() => { setSelectedUser(null); setIsUserModalOpen(true); }}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-md shadow-red-100"
                >
                    <Plus size={18} />
                    <span>Add User</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Total Users", value: loading ? "..." : String(users.length), color: "bg-blue-50 text-blue-600", icon: Users2 },
                    { label: "Admins", value: loading ? "..." : String(adminCount), color: "bg-red-50 text-red-600", icon: ShieldCheck },
                    { label: "Sales Managers", value: loading ? "..." : String(managerCount), color: "bg-purple-50 text-purple-600", icon: Briefcase },
                    { label: "Sales Representatives", value: loading ? "..." : String(repCount), color: "bg-green-50 text-green-600", icon: UserCheck },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon size={20} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-800 leading-snug">{s.value}</p>
                            <p className="text-sm text-gray-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <h2 className="font-bold text-gray-800">All Users</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search users..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50/50 transition-all" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg self-end sm:self-auto">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded-md transition-all flex items-center justify-center ${viewMode === "list" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                title="List View"
                            >
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("card")}
                                className={`p-1.5 rounded-md transition-all flex items-center justify-center ${viewMode === "card" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                title="Card View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    {viewMode === "list" ? (
                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        {["User", "Role", "Reports To", "Status", "Last Login", "Actions"].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && users.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading users...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">No users found.</td></tr>
                                    ) : (
                                        filtered.map((u) => (
                                            <tr
                                                key={u._id}
                                                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                                onClick={() => { setSelectedUser(u); setIsDetailsModalOpen(true); }}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={`${u.firstName} ${u.lastName}`} />
                                                        <div>
                                                            <p className="font-bold text-gray-800 leading-none hover:text-red-600 transition-colors uppercase text-[11px] tracking-wider">{u.firstName} {u.lastName}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${roleBadge[u.role] || "bg-gray-100 text-gray-600"}`}>
                                                        {formatRole(u.role)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                                                    {u.managerId
                                                        ? <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tighter">{u.managerId.firstName || ""} {u.managerId.lastName || ""}</span>
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${!u.isActive
                                                            ? "bg-red-50 text-red-700 border border-red-100"
                                                            : !u.isSetupComplete
                                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                : "bg-green-50 text-green-700 border border-green-100"
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${!u.isActive ? "bg-red-500 animate-pulse" : !u.isSetupComplete ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                                                            {!u.isActive ? "DEACTIVATED" : !u.isSetupComplete ? "PENDING INVITE" : "ACTIVE"}
                                                        </span>
                                                        {u.isActive && !u.isSetupComplete && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleResendInvite(u); }}
                                                                className="p-1 px-2 text-[10px] font-bold text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition"
                                                                title="Resend invitation link"
                                                            >
                                                                RESEND
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-[10px] font-medium whitespace-nowrap uppercase tracking-tighter">
                                                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => { setSelectedUser(u); setIsDetailsModalOpen(true); }}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="View profile details"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedUser(u); setIsUserModalOpen(true); }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Edit user"
                                                        >
                                                            <Edit2 size={15} />
                                                        </button>
                                                        {u.role !== "admin" && (
                                                            <button
                                                                onClick={() => { setSelectedUser(u); setIsReassignModalOpen(true); }}
                                                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                                title="Reassign all records"
                                                            >
                                                                <RefreshCcwDot size={15} />
                                                            </button>
                                                        )}
                                                        {u.role !== "admin" && (
                                                            <button
                                                                onClick={() => handleSoftDelete(u)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                title="Move to trash"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                        {u.role !== "admin" && u.isActive && (
                                                            <button
                                                                onClick={() => handleDeactivate(u)}
                                                                className="text-[10px] px-2 py-1 rounded-lg font-bold border border-red-200 text-red-600 hover:bg-red-50 transition uppercase tracking-tighter"
                                                            >
                                                                Deactivate
                                                            </button>
                                                        )}
                                                        {u.role !== "admin" && !u.isActive && (
                                                            <button
                                                                onClick={() => handleActivate(u)}
                                                                className="text-[10px] px-2 py-1 rounded-lg font-bold border border-green-300 text-green-700 hover:bg-green-50 transition uppercase tracking-tighter"
                                                            >
                                                                Activate
                                                            </button>
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
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                            {loading && users.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400">Loading users...</div>
                            ) : filtered.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400 font-medium">No users found.</div>
                            ) : (
                                filtered.map(u => (
                                    <UserCard
                                        key={u._id}
                                        user={u}
                                        onEdit={(user) => { setSelectedUser(user); setIsUserModalOpen(true); }}
                                        onDeactivate={handleDeactivate}
                                        onActivate={handleActivate}
                                        onDelete={handleSoftDelete}
                                        onReassign={(user) => { setSelectedUser(user); setIsReassignModalOpen(true); }}
                                        onView={(user) => { setSelectedUser(user); setIsDetailsModalOpen(true); }}
                                        onResendInvite={handleResendInvite}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Role Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-4">Users by Role</h3>
                <div className="space-y-3">
                    {roleBreakdown.map(r => {
                        const total = users.length || 1;
                        const pct = Math.round((r.count / total) * 100);
                        return (
                            <div key={r.role}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 font-medium">{r.role}</span>
                                    <span className="text-gray-500">{r.count} ({pct}%)</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${r.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals */}
            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                user={selectedUser}
                managers={potentialManagers}
                onSaved={fetchUsers}
            />
            <UserDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                user={selectedUser}
            />
            <ReassignModal
                isOpen={isReassignModalOpen}
                onClose={() => setIsReassignModalOpen(false)}
                fromUser={selectedUser}
                activeUsers={users}
                onSaved={fetchUsers}
            />
            <DeactivateModal
                isOpen={isDeactivateModalOpen}
                onClose={() => setIsDeactivateModalOpen(false)}
                user={selectedUser}
                activeUsers={users}
                onConfirm={confirmDeactivate}
            />
            <DeactivateModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                user={selectedUser}
                activeUsers={users}
                onConfirm={confirmSoftDelete}
                title="Move User to Trash"
                actionLabel="Move to Trash"
                actionColor="bg-gray-800 hover:bg-gray-900"
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
        </div >
    );
}
