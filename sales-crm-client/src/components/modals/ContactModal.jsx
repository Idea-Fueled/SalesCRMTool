import React, { useState, useEffect } from "react";
import Modal from "./Modal";

export default function ContactModal({ isOpen, onClose, contact, onSave, companies, userRole, potentialOwners = [] }) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+\d\s\-()]{7,15}$/;

    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", jobTitle: "",
        companyId: "", companyName: "", phone: "", mobile: "", linkedin: "", notes: "", ownerId: ""
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (contact) {
            setFormData({
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                email: contact.email || "",
                jobTitle: contact.jobTitle || "",
                companyId: contact.companyId?._id || contact.companyId || "",
                companyName: contact.companyName || contact.companyId?.name || "",
                phone: contact.phone || "",
                mobile: contact.mobile || "",
                linkedin: contact.linkedin || "",
                notes: contact.notes || "",
                ownerId: contact.ownerId?._id || contact.ownerId || ""
            });
        } else {
            setFormData({ firstName: "", lastName: "", email: "", jobTitle: "", companyId: "", companyName: "", phone: "", mobile: "", linkedin: "", notes: "", ownerId: "" });
        }
        setErrors({});
    }, [contact, isOpen]);

    const set = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const errs = {};
        if (!formData.firstName.trim()) errs.firstName = "First name is required";
        else if (formData.firstName.trim().length < 2) errs.firstName = "First name must be at least 2 characters";
        if (!formData.lastName.trim()) errs.lastName = "Last name is required";
        else if (formData.lastName.trim().length < 2) errs.lastName = "Last name must be at least 2 characters";
        if (!formData.email.trim()) errs.email = "Email is required";
        else if (!emailRegex.test(formData.email.trim())) errs.email = "Enter a valid email address";
        if (!formData.companyName.trim()) errs.companyName = "Company name is required";
        if (formData.phone && !phoneRegex.test(formData.phone)) errs.phone = "Enter a valid phone number";
        if (formData.mobile && !phoneRegex.test(formData.mobile)) errs.mobile = "Enter a valid mobile number";
        if (formData.linkedin && !formData.linkedin.includes("linkedin.com")) errs.linkedin = "Enter a valid LinkedIn URL";
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
        <Modal isOpen={isOpen} onClose={onClose} title={contact ? "Edit Contact" : "Create New Contact"}>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">First Name *</label>
                        <input type="text" className={inputClass("firstName")} value={formData.firstName}
                            onChange={e => set("firstName", e.target.value)} placeholder="John" />
                        {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Last Name *</label>
                        <input type="text" className={inputClass("lastName")} value={formData.lastName}
                            onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
                        {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Email Address *</label>
                    <input type="email" className={inputClass("email")} value={formData.email}
                        onChange={e => set("email", e.target.value)} placeholder="john.doe@company.com" />
                    {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Job Title</label>
                        <input type="text" className={inputClass("jobTitle")} value={formData.jobTitle}
                            onChange={e => set("jobTitle", e.target.value)} placeholder="Sales Director" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Company Name *</label>
                        <input type="text" className={inputClass("companyName")}
                            value={formData.companyName}
                            onChange={e => set("companyName", e.target.value)}
                            placeholder="e.g. Acme Corp" />
                        {errors.companyName && <p className="text-red-500 text-xs">{errors.companyName}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                        <input type="text" className={inputClass("phone")} value={formData.phone}
                            onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                        {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Mobile</label>
                        <input type="text" className={inputClass("mobile")} value={formData.mobile}
                            onChange={e => set("mobile", e.target.value)} placeholder="+91 98765 43210" />
                        {errors.mobile && <p className="text-red-500 text-xs">{errors.mobile}</p>}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">LinkedIn URL</label>
                    <input type="text" className={inputClass("linkedin")} value={formData.linkedin}
                        onChange={e => set("linkedin", e.target.value)} placeholder="linkedin.com/in/johndoe" />
                    {errors.linkedin && <p className="text-red-500 text-xs">{errors.linkedin}</p>}
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
                        <label className="text-xs font-semibold text-gray-500 uppercase">Contact Owner</label>
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
                        {loading ? "Saving..." : contact ? "Update Contact" : "Create Contact"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
