import React, { useState, useEffect } from "react";
import { Trash2, RotateCcw, User, ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getDeletedUsers, restoreUser } from "../../../API/services/userService";
import { toast } from "react-hot-toast";

const roleBadge = {
    admin: "bg-red-100 text-red-700",
    sales_manager: "bg-purple-100 text-purple-700",
    sales_rep: "bg-blue-100 text-blue-700",
};
const formatRole = (r) => ({ admin: "ADMIN", sales_manager: "SALES MANAGER", sales_rep: "SALES REPRESENTATIVE" }[r] || r?.toUpperCase());

function Avatar({ name }) {
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
        </div>
    );
}

export default function TrashDashboard() {
    const navigate = useNavigate();
    const [deletedUsers, setDeletedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);

    const fetchDeleted = async () => {
        setLoading(true);
        try {
            const res = await getDeletedUsers();
            setDeletedUsers(res.data?.data || []);
        } catch (err) {
            toast.error("Failed to load deleted users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDeleted(); }, []);

    const handleRestore = async (user) => {
        setRestoringId(user._id);
        try {
            await restoreUser(user._id);
            toast.success(`${user.firstName} ${user.lastName} restored successfully!`);
            fetchDeleted();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to restore user");
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">Trash</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                    <Trash2 size={22} className="text-red-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Trash</h1>
                    <p className="text-sm text-gray-400">Users removed from the system. Their data is preserved and can be restored.</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-base">Deleted Users</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                        {deletedUsers.length} {deletedUsers.length === 1 ? "user" : "users"}
                    </span>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Manager</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deleted On</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                                            <span>Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : deletedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                                                <Trash2 size={26} className="text-gray-300" />
                                            </div>
                                            <p className="font-medium text-gray-500">Trash is empty</p>
                                            <p className="text-xs text-gray-400 max-w-xs text-center">
                                                Users you remove from the system will appear here and can be restored at any time.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                deletedUsers.map((u) => (
                                    <tr key={u._id} className="hover:bg-red-50/30 transition-colors bg-red-50/10">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={`${u.firstName} ${u.lastName}`} />
                                                <div>
                                                    <p className="font-medium text-gray-700 leading-none">
                                                        {u.firstName} {u.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleBadge[u.role] || "bg-gray-100 text-gray-600"}`}>
                                                {formatRole(u.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                                            {u.managerId
                                                ? `${u.managerId.firstName} ${u.managerId.lastName}`
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                            {u.deletedAt
                                                ? new Date(u.deletedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                onClick={() => handleRestore(u)}
                                                disabled={restoringId === u._id}
                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border border-green-200 text-green-700 hover:bg-green-50 transition disabled:opacity-50"
                                            >
                                                <RotateCcw size={13} className={restoringId === u._id ? "animate-spin" : ""} />
                                                {restoringId === u._id ? "Restoring..." : "Restore"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
