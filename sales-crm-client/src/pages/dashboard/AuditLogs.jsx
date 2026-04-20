import React, { useState, useEffect } from "react";
import { History, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, User, Briefcase, Building2, ContactRound, Shield, ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAuditLogs } from "../../API/services/auditLogService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const EntityIcon = ({ type }) => {
    switch (type) {
        case "User": return <User size={14} className="text-blue-500" />;
        case "Deal": return <Briefcase size={14} className="text-indigo-500" />;
        case "Company": return <Building2 size={14} className="text-orange-500" />;
        case "Contact": return <ContactRound size={14} className="text-green-500" />;
        default: return <Shield size={14} className="text-gray-400" />;
    }
};

const ActionBadge = ({ action }) => {
    const map = {
        CREATE: "bg-green-100 text-green-700",
        UPDATE: "bg-blue-100 text-blue-700",
        DELETE: "bg-red-100 text-red-700",
        REASSIGN: "bg-amber-100 text-amber-700",
        DEACTIVATE: "bg-gray-100 text-gray-700",
        ACTIVATE: "bg-emerald-100 text-emerald-700",
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${map[action] || "bg-gray-100 text-gray-600"}`}>
            {action}
        </span>
    );
};

export default function AuditLogs() {
    const { user: currentUser } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        entityType: "",
        action: "",
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs({ ...filters, search: searchQuery, page, limit: 20 });
            setLogs(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, filters, searchQuery]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const renderPerformer = (log) => {
        const isCurrent = currentUser?.id === log.performedBy?._id;
        const name = log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName || ""}` : "Deleted User";
        
        return (
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-sm border-2 ${isCurrent ? 'border-red-400' : 'border-white'}`}>
                    {log.performedBy?.profilePicture ? (
                        <img src={log.performedBy.profilePicture} alt="Performer" className="w-full h-full object-cover" />
                    ) : log.performedBy ? (
                        <span className="text-white">
                            {log.performedBy.firstName?.[0]}{log.performedBy.lastName?.[0]}
                        </span>
                    ) : (
                        <User size={16} className="text-gray-400" />
                    )}
                </div>
                <div>
                    <p className={`font-semibold text-gray-800 leading-none ${isCurrent ? 'text-red-600' : ''}`}>
                        {isCurrent ? "You" : name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                        {log.performedBy?.email || "System/Unknown"}
                    </p>
                </div>
            </div>
        );
    };

    const formatLogMessage = (log) => {
        const isPerformer = currentUser?.id === log.performedBy?._id;
        const isTarget = currentUser?.id === log.targetUserId?._id;
        
        let message = log.details?.message || (log.action === "CREATE" ? `Created new ${log.entityType.toLowerCase()}` : `Modified ${log.entityType.toLowerCase()}`);
        
        // Contextual replacements
        if (isPerformer) {
            message = message.replace(new RegExp(`^${log.performedBy?.firstName} ${log.performedBy?.lastName}`, 'i'), "You");
            message = message.replace(/by You/i, "by You"); // redundant but safe
        }

        if (isTarget) {
            if (log.targetUserId) {
                const targetName = `${log.targetUserId.firstName} ${log.targetUserId.lastName || ""}`.trim();
                message = message.replace(new RegExp(targetName, 'i'), "you");
            }
        }

        return message;
    };

    return (
        <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <History className="text-red-500" size={24} />
                        Audit History
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Track every critical action and ownership change across the system</p>
                </div>
            </div>

            <Card>
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50/50 transition-all font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            name="entityType"
                            value={filters.entityType}
                            onChange={handleFilterChange}
                            className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white font-medium"
                        >
                            <option value="">All Entities</option>
                            <option value="Deal">Deals</option>
                            <option value="Company">Companies</option>
                            <option value="Contact">Contacts</option>
                            <option value="User">Users</option>
                        </select>
                        <select
                            name="action"
                            value={filters.action}
                            onChange={handleFilterChange}
                            className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white font-medium"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="REASSIGN">Reassign</option>
                            <option value="DELETE">Delete</option>
                            <option value="DEACTIVATE">Deactivate</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Performer</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Action</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider min-w-[150px] w-36">Entity</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider min-w-[250px]">Details</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Recipient</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && logs.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading audit history...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No logs found</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <p className="text-gray-800 font-medium">
                                                {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </p>
                                            <p className="text-[10px] text-gray-400 uppercase">
                                                {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {renderPerformer(log)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <ActionBadge action={log.action} />
                                        </td>
                                        <td className="px-4 py-4 min-w-[150px] w-36 max-w-[160px]">
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <EntityIcon type={log.entityType} />
                                                <span className="font-semibold text-xs truncate">
                                                    {log.details?.entityName || log.entityId?.name ||
                                                        (log.entityId?.firstName ? `${log.entityId.firstName} ${log.entityId.lastName || ""}` :
                                                            `Deleted ${log.entityType}`)}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-mono text-gray-400 mt-0.5 truncate">{log.entityId?._id || log.entityId || "—"}</p>
                                        </td>
                                        <td className="px-4 py-4 min-w-[250px] max-w-sm">
                                            <p
                                                className="text-xs text-gray-600 font-medium leading-relaxed line-clamp-2"
                                                title={formatLogMessage(log)}
                                            >
                                                {formatLogMessage(log)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {log.targetUserId ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-sm border-2 border-white">
                                                        {log.targetUserId.profilePicture ? (
                                                            <img src={log.targetUserId.profilePicture} alt="Target" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-white">
                                                                {log.targetUserId.firstName?.[0]}{log.targetUserId.lastName?.[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-semibold leading-none ${currentUser?.id === log.targetUserId._id ? 'text-red-600' : 'text-gray-800'}`}>
                                                            {currentUser?.id === log.targetUserId._id ? "You" : `${log.targetUserId.firstName} ${log.targetUserId.lastName || ""}`}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                            {log.targetUserId.email || ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to <span className="font-medium">{Math.min(page * 20, total)}</span> of <span className="font-medium">{total}</span> logs
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}


