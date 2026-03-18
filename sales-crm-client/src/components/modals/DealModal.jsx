import React, { useState, useEffect } from "react";
import { Paperclip, X } from "lucide-react";
import Modal from "./Modal";

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const STAGE_COLORS = {
    "Lead": "bg-blue-600",
    "Qualified": "bg-amber-400",
    "Proposal": "bg-orange-600",
    "Negotiation": "bg-pink-600",
    "Closed Won": "bg-green-600",
    "Closed Lost": "bg-red-600"
};
const CURRENCIES = [{ value: "USD", label: "USD ($)" }];
const SOURCE_OPTIONS = ["Inbound", "Referral", "Outbound"];

export default function DealModal({ isOpen, onClose, deal, onSave, companies, contacts, freeText = false, userRole, potentialOwners = [], currentUserId }) {
    const emptyForm = {
        name: "", companyId: "", contactId: "",
        companyName: "", contactName: "",
        value: "", currency: "USD", stage: "Lead",
        expectedCloseDate: "", probability: 10, source: "", notes: "", ownerId: "",
        files: []
    };

    const options = potentialOwners.filter(u => u._id !== currentUserId);

    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showCompanySuggest, setShowCompanySuggest] = useState(false);
    const [showContactSuggest, setShowContactSuggest] = useState(false);
    const [showStageDropdown, setShowStageDropdown] = useState(false);

    // Derived: Filtered contacts based on selected company
    const filteredContacts = React.useMemo(() => {
        if (!formData.companyId) return contacts || [];
        return (contacts || []).filter(c => {
            const contactCompanyId = c.companyId?._id || c.companyId;
            return contactCompanyId === formData.companyId;
        });
    }, [formData.companyId, contacts]);

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
                ownerId: deal.ownerId?._id || deal.ownerId || "",
                files: []
            });
        } else {
            setFormData(emptyForm);
        }
        setErrors({});
    }, [deal, isOpen]);

    const set = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            
            // If company changes, validate and potentially clear contact
            if (field === "companyId") {
                const currentContactId = prev.contactId;
                if (currentContactId && value) {
                    const contactObj = contacts.find(c => c._id === currentContactId);
                    const contactCompanyId = contactObj?.companyId?._id || contactObj?.companyId;
                    if (contactCompanyId !== value) {
                        newData.contactId = "";
                        newData.contactName = "";
                    }
                }
            }
            return newData;
        });
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
            const dataToSave = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'files') {
                    formData.files.forEach(file => dataToSave.append('files', file));
                } else if (formData[key] !== null && formData[key] !== "") {
                    dataToSave.append(key, formData[key]);
                }
            });
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
                    <div className="space-y-1 relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Company *</label>
                        <select
                            className={inputClass("companyId")}
                            value={formData.companyId}
                            onChange={e => {
                                const selectedId = e.target.value;
                                const comp = companies.find(c => c._id === selectedId);
                                set("companyId", selectedId);
                                set("companyName", comp?.name || "");
                            }}
                        >
                            <option value="">— Select Company —</option>
                            {(companies || []).map(comp => (
                                <option key={comp._id} value={comp._id}>
                                    {comp.name}
                                </option>
                            ))}
                        </select>
                        {errors.companyName && <p className="text-red-500 text-xs">{errors.companyName}</p>}
                    </div>
                    <div className="space-y-1 relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Contact *</label>
                        <select
                            className={inputClass("contactId")}
                            value={formData.contactId}
                            disabled={!formData.companyId}
                            onChange={e => {
                                const selectedId = e.target.value;
                                const cont = filteredContacts.find(c => c._id === selectedId);
                                set("contactId", selectedId);
                                set("contactName", cont ? `${cont.firstName} ${cont.lastName}`.trim() : "");
                            }}
                        >
                            {!formData.companyId ? (
                                <option value="">Select company first</option>
                            ) : filteredContacts.length === 0 ? (
                                <option value="">No contacts found</option>
                            ) : (
                                <>
                                    <option value="">— Select Contact —</option>
                                    {filteredContacts.map(cont => (
                                        <option key={cont._id} value={cont._id}>
                                            {cont.firstName} {cont.lastName}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
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
                        <label className="text-xs font-semibold text-gray-500 uppercase">Currency</label>
                        <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-medium">
                            USD ($)
                        </div>
                    </div>
                </div>

                {/* Stage + Expected Close */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Pipeline Stage *</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowStageDropdown(!showStageDropdown)}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white transition-all shadow-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[formData.stage] || "bg-gray-300"}`} />
                                    <span className="font-semibold text-gray-700">{formData.stage}</span>
                                </div>
                                <div className={`transition-transform duration-200 ${showStageDropdown ? "rotate-180" : ""}`}>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {showStageDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowStageDropdown(false)} />
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
                                        {STAGES.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                    set("stage", s);
                                                    setShowStageDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold transition-colors hover:bg-gray-50 group ${formData.stage === s ? "bg-red-50 text-red-600" : "text-gray-600"}`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${STAGE_COLORS[s] || "bg-gray-300"}`} />
                                                <span className="uppercase tracking-wider">{s}</span>
                                                {formData.stage === s && (
                                                    <svg className="ml-auto w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Expected Close *</label>
                        <input
                            type="date"
                            className={inputClass("expectedCloseDate") + " cursor-pointer"}
                            value={formData.expectedCloseDate}
                            onChange={e => set("expectedCloseDate", e.target.value)}
                            onKeyDown={(e) => e.preventDefault()}
                            onClick={(e) => e.target.showPicker?.()}
                            min={new Date().toISOString().split("T")[0]}
                        />
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
                            <option value="">Default (Myself)</option>
                            {options.map(u => (
                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role === "admin" ? "ADMIN" : u.role === "sales_manager" ? "SALES MANAGER" : u.role === "sales_rep" ? "SALES REPRESENTATIVE" : u.role.replace(/_/g, " ").toUpperCase()})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 italic">Only Admins and Managers can reassign records.</p>
                    </div>
                )}

                {/* File Attachments */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                        <Paperclip size={12} className="text-gray-400" /> Attachments
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {formData.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-[11px] text-gray-600">
                                <span className="max-w-[150px] truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => set("files", formData.files.filter((_, i) => i !== idx))}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-gray-300 rounded-lg text-[11px] font-bold text-gray-500 hover:border-red-400 hover:text-red-600 cursor-pointer transition-all">
                            <Paperclip size={12} /> Add Files
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const newFiles = Array.from(e.target.files);
                                    set("files", [...formData.files, ...newFiles]);
                                }}
                            />
                        </label>
                    </div>
                </div>

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
