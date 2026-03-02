import React, { useState, useEffect } from "react";
import Modal from "./Modal";

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const CURRENCIES = [{ value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }, { value: "INR", label: "INR (₹)" }];
const SOURCE_OPTIONS = ["Inbound", "Outbound", "Referral", "Website", "Cold Call", "Event", "Partner", "Other"];

export default function DealModal({ isOpen, onClose, deal, onSave, companies, contacts, freeText = false, userRole, potentialOwners = [] }) {
    const emptyForm = {
        name: "", companyId: "", contactId: "",
        companyName: "", contactName: "",
        value: "", currency: "USD", stage: "Lead",
        expectedCloseDate: "", probability: 10, source: "", notes: "", ownerId: ""
    };

    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (deal) {
            setFormData({
                name: deal.name || "",
                companyId: deal.companyId?._id || deal.companyId || "",
                contactId: deal.contactId?._id || deal.contactId || "",
                companyName: deal.companyName || deal.companyId?.name || "",
                contactName: deal.contactName || (deal.contactId ? `${deal.contactId.firstName || ""} ${deal.contactId.lastName || ""} `.trim() : ""),
                value: deal.value || "",
                currency: deal.currency || "USD",
                stage: deal.stage || "Lead",
                expectedCloseDate: deal.expectedCloseDate
                    ? new Date(deal.expectedCloseDate).toISOString().split("T")[0] : "",
                probability: deal.probability || 10,
                source: deal.source || "",
                notes: deal.notes || "",
                ownerId: deal.ownerId?._id || deal.ownerId || ""
            });
        } else {
            setFormData(emptyForm);
        }
        setErrors({});
    }, [deal, isOpen]);

    const set = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const errs = {};
        if (!formData.name.trim()) errs.name = "Deal name is required";
        if (!formData.companyName.trim()) errs.companyName = "Company name is required";
        if (!formData.contactName.trim()) errs.contactName = "Contact name is required";

        if (!formData.value || Number(formData.value) <= 0) errs.value = "Enter a valid deal value greater than 0";
        if (!formData.expectedCloseDate) errs.expectedCloseDate = "Expected close date is required";
        if (formData.probability < 0 || formData.probability > 100) errs.probability = "Probability must be between 0 and 100";
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setLoading(true);
        try {
            const dataToSave = { ...formData };
            if (dataToSave.companyId === "") dataToSave.companyId = null;
            if (dataToSave.contactId === "") dataToSave.contactId = null;
            if (dataToSave.ownerId === "") dataToSave.ownerId = null;
            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) =>
        `w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 transition ${errors[field]
            ? "border-red-400 focus:ring-red-200 bg-red-50"
            : "border-gray-200 focus:ring-red-400"
        }`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={deal ? "Edit Deal" : "Create New Deal"}>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* Deal Name */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Deal Name *</label>
                    <input type="text" className={inputClass("name")} value={formData.name}
                        onChange={e => set("name", e.target.value)} placeholder="Enterprise License" />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                </div>

                {/* Company + Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Company Name *</label>
                        <input type="text" className={inputClass("companyName")}
                            value={formData.companyName}
                            onChange={e => set("companyName", e.target.value)}
                            placeholder="e.g. Acme Corp" />
                        {errors.companyName && <p className="text-red-500 text-xs">{errors.companyName}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Contact Name *</label>
                        <input type="text" className={inputClass("contactName")}
                            value={formData.contactName}
                            onChange={e => set("contactName", e.target.value)}
                            placeholder="e.g. Jane Smith" />
                        {errors.contactName && <p className="text-red-500 text-xs">{errors.contactName}</p>}
                    </div>
                </div>

                {/* Value + Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Value *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input type="number" min="1"
                                className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:ring-2 transition ${errors.value ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-red-400"}`}
                                value={formData.value}
                                onChange={e => set("value", e.target.value)} placeholder="0" />
                        </div>
                        {errors.value && <p className="text-red-500 text-xs">{errors.value}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Currency *</label>
                        <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                            value={formData.currency} onChange={e => set("currency", e.target.value)}>
                            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Stage + Expected Close */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Pipeline Stage *</label>
                        <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                            value={formData.stage} onChange={e => set("stage", e.target.value)}>
                            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Expected Close *</label>
                        <input type="date" className={inputClass("expectedCloseDate")}
                            value={formData.expectedCloseDate}
                            onChange={e => set("expectedCloseDate", e.target.value)} />
                        {errors.expectedCloseDate && <p className="text-red-500 text-xs">{errors.expectedCloseDate}</p>}
                    </div>
                </div>

                {/* Probability + Source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Probability (%)</label>
                        <input type="number" min="0" max="100"
                            className={inputClass("probability")}
                            value={formData.probability}
                            onChange={e => set("probability", e.target.value)} />
                        {errors.probability && <p className="text-red-500 text-xs">{errors.probability}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Deal Source</label>
                        <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                            value={formData.source} onChange={e => set("source", e.target.value)}>
                            <option value="">— Select Source —</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                    <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 h-20"
                        value={formData.notes} onChange={e => set("notes", e.target.value)}
                        placeholder="Next steps, requirements..." />
                </div>

                {/* Owner field - visible to Admin/Manager */}
                {(userRole === "admin" || userRole === "sales_manager") && (
                    <div className="space-y-1 pt-2 border-t border-gray-100 mt-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Deal Owner</label>
                        <select
                            className={inputClass("ownerId") + " bg-slate-50 border-slate-200"}
                            value={formData.ownerId}
                            onChange={e => set("ownerId", e.target.value)}
                        >
                            <option value="">Select Owner</option>
                            {potentialOwners.map(u => (
                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role === "admin" ? "ADMIN" : u.role === "sales_manager" ? "SALES MANAGER" : u.role === "sales_rep" ? "SALES REPRESENTATIVE" : u.role.replace(/_/g, " ").toUpperCase()})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 italic">Only Admins and Managers can reassign records.</p>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md shadow-red-200 transition disabled:opacity-50">
                        {loading ? "Saving..." : deal ? "Update Deal" : "Create Deal"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
