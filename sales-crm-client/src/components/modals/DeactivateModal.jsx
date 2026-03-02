import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { UserX, UserCheck, AlertTriangle } from "lucide-react";

const baseInput = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white transition";
const inputClass = (err) => err
    ? `${baseInput} border-red-400 focus:ring-red-200 bg-red-50`
    : `${baseInput} border-gray-200 focus:ring-red-400`;

export default function DeactivateModal({ isOpen, onClose, user, activeUsers, onConfirm, title = "Deactivate User", actionLabel = "Deactivate User", actionColor = "bg-red-600 hover:bg-red-700" }) {
    const [reassignMode, setReassignMode] = useState("reassign"); // "reassign" | "keep"
    const [newOwnerId, setNewOwnerId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReassignMode("reassign");
            setNewOwnerId("");
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (reassignMode === "reassign" && !newOwnerId) {
            return; // handled by HTML required
        }
        setSaving(true);
        try {
            // Pass newOwnerId only when reassigning, otherwise pass null/undefined
            await onConfirm(reassignMode === "reassign" ? newOwnerId : null);
            onClose();
        } catch (err) {
            // Error typically handled by onConfirm or toast
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !user) return null;

    const opts = activeUsers.filter(u => u._id !== user._id && u.isActive);

    const fmtRole = (r) => ({ admin: "ADMIN", sales_manager: "SALES MANAGER", sales_rep: "SALES REPRESENTATIVE" }[r] || r?.toUpperCase());

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* User info banner */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <UserX size={16} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                </div>

                {/* Reassignment option selector */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What should happen to their records?</p>

                    {/* Option 1: Reassign */}
                    <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reassignMode === "reassign"
                            ? "border-red-400 bg-red-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                    >
                        <input
                            type="radio"
                            name="reassignMode"
                            value="reassign"
                            checked={reassignMode === "reassign"}
                            onChange={() => setReassignMode("reassign")}
                            className="mt-0.5 accent-red-600"
                        />
                        <div>
                            <p className={`text-sm font-semibold ${reassignMode === "reassign" ? "text-red-700" : "text-gray-700"}`}>
                                Reassign to another user
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">All companies, contacts and deals will be transferred to the selected person.</p>
                        </div>
                    </label>

                    {/* Option 2: Keep */}
                    <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reassignMode === "keep"
                            ? "border-orange-400 bg-orange-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                    >
                        <input
                            type="radio"
                            name="reassignMode"
                            value="keep"
                            checked={reassignMode === "keep"}
                            onChange={() => { setReassignMode("keep"); setNewOwnerId(""); }}
                            className="mt-0.5 accent-orange-600"
                        />
                        <div>
                            <p className={`text-sm font-semibold ${reassignMode === "keep" ? "text-orange-700" : "text-gray-700"}`}>
                                Don't reassign — keep data with this user
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">Records stay under their ownership. Data will be fully accessible again when the user is reactivated.</p>
                        </div>
                    </label>
                </div>

                {/* Reassign dropdown — only visible when reassigning */}
                {reassignMode === "reassign" && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select new owner *</label>
                        <select
                            value={newOwnerId}
                            onChange={e => setNewOwnerId(e.target.value)}
                            className={inputClass(false)}
                            required
                        >
                            <option value="">— Select a user —</option>
                            {opts.map(u => (
                                <option key={u._id} value={u._id}>
                                    {u.firstName} {u.lastName} ({fmtRole(u.role)})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* "Keep" mode info note */}
                {reassignMode === "keep" && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
                        <p>The user's companies, contacts, and deals will remain assigned to them. They won't be visible to others but will be fully restored when the user is reactivated.</p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || (reassignMode === "reassign" && !newOwnerId)}
                        className={`flex-1 px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition flex items-center justify-center gap-2 ${actionColor}`}
                    >
                        <UserX size={14} />
                        {saving ? "Processing..." : actionLabel}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
