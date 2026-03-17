import React from "react";
import { ShieldCheck, Briefcase, UserCheck, Edit2, Trash2, Eye, Mail, Clock, ChevronRight, FolderSync } from "lucide-react";

const roleBadge = {
    admin: "bg-red-100 text-red-700",
    sales_manager: "bg-red-50 text-red-600 border border-red-100",
    sales_rep: "bg-red-50 text-red-600 border border-red-100",
};

const roleIcon = {
    admin: ShieldCheck,
    sales_manager: Briefcase,
    sales_rep: UserCheck,
};

const formatRole = (r) => ({ admin: "ADMIN", sales_manager: "SALES MANAGER", sales_rep: "SALES REPRESENTATIVE" }[r] || r?.toUpperCase());

const Avatar = ({ name, profilePicture }) => {
    if (!name) return null;
    const parts = name.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const initials = `${firstName?.[0] || ""}${lastName?.slice(-1) || ""}`.toUpperCase();
    
    if (profilePicture) {
        return (
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm flex-shrink-0 border-2 border-white">
                <img src={profilePicture} alt={name} className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
            {initials}
        </div>
    );
};

const UserCard = ({ user, onEdit, onDeactivate, onActivate, onReassign, onDelete, onView, onResendInvite }) => {
    const RoleIcon = roleIcon[user.role] || UserCheck;

    return (
        <div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full cursor-pointer hover:border-red-200"
            onClick={() => onView(user)}
        >
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <Avatar name={`${user.firstName} ${user.lastName}`} profilePicture={user.profilePicture} />
                        <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase text-xs tracking-wide">
                                {user.firstName} {user.lastName}
                            </h3>
                            <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge[user.role] || "bg-gray-100 text-gray-600"}`}>
                                <RoleIcon size={12} />
                                {formatRole(user.role)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2.5 text-gray-500">
                        <Mail size={14} className="text-gray-300" />
                        <span className="text-xs truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-500">
                        <Clock size={14} className="text-gray-300" />
                        <span className="text-[11px] font-medium">
                            Joined: {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                    </div>
                    {user.managerId && (
                        <div className="flex items-center gap-2 text-gray-500">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Reports To:</span>
                            <span className="text-[11px] font-bold text-gray-700">{user.managerId.firstName} {user.managerId.lastName}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${!user.isActive
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : !user.isSetupComplete
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-green-50 text-green-700 border border-green-100"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${!user.isActive ? "bg-red-500 animate-pulse" : !user.isSetupComplete ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                        {!user.isActive ? "DEACTIVATED" : !user.isSetupComplete ? "PENDING INVITE" : "ACTIVE"}
                    </span>
                    {user.isActive && (!user.isSetupComplete || !user.lastLogin) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onResendInvite(user); }}
                            className="text-[10px] font-bold text-amber-600 hover:underline uppercase"
                            title="Resend invitation link or credential reminder"
                        >
                            Resend
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit user"
                    >
                        <Edit2 size={16} />
                    </button>
                    {user.role !== "admin" && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReassign(user); }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Reassign records"
                        >
                            <FolderSync size={16} />
                        </button>
                    )}
                    {user.role !== "admin" && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(user); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete user"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    {user.role !== "admin" && user.isActive && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeactivate(user); }}
                            className="text-[10px] font-bold text-red-600 hover:bg-red-100 px-2 py-1 rounded transition border border-red-200"
                        >
                            DEACTIVATE
                        </button>
                    )}
                    {user.role !== "admin" && !user.isActive && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onActivate(user); }}
                            className="text-[10px] font-bold text-green-700 hover:bg-green-100 px-2 py-1 rounded transition border border-green-200"
                        >
                            ACTIVATE
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserCard;
