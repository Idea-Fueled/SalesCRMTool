import React, { useState, useEffect } from "react";
import Modal from "./Modal";

const SIZES = ["", "1-10", "11-50", "51-200", "201-500", "500+"];
const STATUSES = ["Lead", "Prospect", "Customer", "Churned"];

export default function CompanyModal({ isOpen, onClose, company, onSave, userRole, potentialOwners = [] }) {
    const phoneRegex = /^[+\d\s\-()]{7,15}$/;
    const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;

    const [formData, setFormData] = useState({
        name: "", industry: "", size: "", website: "", primaryContact: "",
        status: "Lead", address: "", phone: "", revenueRange: "", notes: "", ownerId: ""
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || "",
                industry: company.industry || "",
                size: company.size || "",
                website: company.website || "",
                primaryContact: company.primaryContact || "",
                status: company.status || "Lead",
                address: company.address || "",
                phone: company.phone || "",
                revenueRange: company.revenueRange || "",
                notes: company.notes || "",
                ownerId: company.ownerId?._id || company.ownerId || ""
            });
        } else {
            setFormData({ name: "", industry: "", size: "", website: "", primaryContact: "", status: "Lead", address: "", phone: "", revenueRange: "", notes: "", ownerId: "" });
        }
        setErrors({});
    }, [company, isOpen]);

    const set = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const errs = {};
        if (!formData.name.trim()) errs.name = "Company name is required";
        else if (formData.name.trim().length < 2) errs.name = "Name must be at least 2 characters";
        if (formData.website && !urlRegex.test(formData.website)) errs.website = "Enter a valid website URL";
        if (formData.phone && !phoneRegex.test(formData.phone)) errs.phone = "Enter a valid phone number";
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setLoading(true);
        try {
            const dataToSave = { ...formData };
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
        <Modal isOpen={isOpen} onClose={onClose} title={company ? "Edit Company" : "Create New Company"}>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Company Name *</label>
                    <input type="text" className={inputClass("name")} value={formData.name}
                        onChange={e => set("name", e.target.value)} placeholder="Acme Corp" />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Industry</label>
                        <input type="text" className={inputClass("industry")} value={formData.industry}
                            onChange={e => set("industry", e.target.value)} placeholder="Software, Finance..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Company Size</label>
                        <select className={inputClass("size") + " bg-white"} value={formData.size}
                            onChange={e => set("size", e.target.value)}>
                            <option value="">Select Size</option>
                            {SIZES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Website</label>
                        <input type="text" className={inputClass("website")} value={formData.website}
                            onChange={e => set("website", e.target.value)} placeholder="https://acme.com" />
                        {errors.website && <p className="text-red-500 text-xs">{errors.website}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                        <select className={inputClass("status") + " bg-white"} value={formData.status}
                            onChange={e => set("status", e.target.value)}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Revenue Range</label>
                        <input type="text" className={inputClass("revenueRange")} value={formData.revenueRange}
                            onChange={e => set("revenueRange", e.target.value)} placeholder="$1M – $5M" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                        <input type="text" className={inputClass("phone")} value={formData.phone}
                            onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                        {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
                    <input type="text" className={inputClass("address")} value={formData.address}
                        onChange={e => set("address", e.target.value)} placeholder="123 MG Road, Bangalore" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                    <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 h-20"
                        value={formData.notes} onChange={e => set("notes", e.target.value)}
                        placeholder="Additional details..." />
                </div>

                {/* Owner field - visible to Admin/Manager */}
                {(userRole === "admin" || userRole === "sales_manager") && (
                    <div className="space-y-1 pt-2 border-t border-gray-100 mt-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Strategic Owner</label>
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
                        {loading ? "Saving..." : company ? "Update Company" : "Create Company"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
