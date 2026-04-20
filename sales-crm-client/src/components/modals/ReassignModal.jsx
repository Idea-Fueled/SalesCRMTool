import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { bulkReassignRecords } from "../../API/services/userService";
import { toast } from "react-hot-toast";

const ModalOverlay = ({ children, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
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

export default function ReassignModal({ isOpen, onClose, fromUser, activeUsers, onSaved }) {
    const [newOwnerId, setNewOwnerId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (isOpen) setNewOwnerId(""); }, [isOpen]);

    const formatRole = (r) => ({ admin: "Admin", sales_manager: "Sales Manager", sales_rep: "Sales Representative" }[r] || r?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newOwnerId) { toast.error("Please select a new owner"); return; }
        setSaving(true);
        try {
            await bulkReassignRecords(fromUser._id, newOwnerId);
            toast.success("All records reassigned successfully");
            if (onSaved) onSaved();
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
            <ModalHeader title="Reassign Records" onClose={onClose} />
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800">
                    <p className="font-semibold mb-1">⚠️ Reassigning records</p>
                    <p>This will transfer <span className="font-bold">all companies, contacts & deals</span> owned by <span className="font-bold">{fromUser.firstName} {fromUser.lastName}</span> to the selected user.</p>
                </div>
                <Field label="Assign all records to *">
                    <select 
                        value={newOwnerId} 
                        onChange={e => setNewOwnerId(e.target.value)} 
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white transition"
                        required
                    >
                        <option value="">— Select a user —</option>
                        {opts.map(u => (
                            <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({formatRole(u.role)})</option>
                        ))}
                    </select>
                </Field>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 shadow-md shadow-red-100 disabled:opacity-60 transition">
                        {saving ? "Reassigning..." : "Reassign All Records"}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
}


