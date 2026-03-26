import React, { useState, useEffect, useRef } from "react";
import { Paperclip, X, Building2, ChevronDown, Check } from "lucide-react";
import { validateFiles, ALLOWED_EXTENSIONS_STRING } from "../../utils/fileUtils";
import Modal from "./Modal";

export default function ContactModal({ isOpen, onClose, contact, onSave, companies = [], userRole, potentialOwners = [] }) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+\d\s\-()]{7,15}$/;
    const dropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", jobTitle: "",
        selectedCompanies: [], // [{companyId, companyName}]
        phone: "", mobile: "", linkedin: "", notes: "", ownerId: "",
        files: []
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
    const [companySearch, setCompanySearch] = useState("");

    useEffect(() => {
        if (contact) {
            // Build selectedCompanies from the contact's companies array or legacy fields
            let selectedCompanies = [];
            if (contact.companies && contact.companies.length > 0) {
                selectedCompanies = contact.companies.map(c => ({
                    companyId: c.companyId?._id || c.companyId || "",
                    companyName: c.companyName || c.companyId?.name || ""
                }));
            } else if (contact.companyId || contact.companyName) {
                selectedCompanies = [{
                    companyId: contact.companyId?._id || contact.companyId || "",
                    companyName: contact.companyName || contact.companyId?.name || ""
                }];
            }

            setFormData({
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                email: contact.email || "",
                jobTitle: contact.jobTitle || "",
                selectedCompanies,
                phone: contact.phone || "",
                mobile: contact.mobile || "",
                linkedin: contact.linkedin || "",
                notes: contact.notes || "",
                ownerId: contact.ownerId?._id || contact.ownerId || "",
                files: []
            });
        } else {
            setFormData({ firstName: "", lastName: "", email: "", jobTitle: "", selectedCompanies: [], phone: "", mobile: "", linkedin: "", notes: "", ownerId: "", files: [] });
        }
        setErrors({});
        setCompanySearch("");
        setCompanyDropdownOpen(false);
    }, [contact, isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setCompanyDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const set = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    };

    const toggleCompany = (comp) => {
        const id = comp._id || comp.id;
        const already = formData.selectedCompanies.find(c => c.companyId === id);
        if (already) {
            set("selectedCompanies", formData.selectedCompanies.filter(c => c.companyId !== id));
        } else {
            set("selectedCompanies", [...formData.selectedCompanies, { companyId: id, companyName: comp.name }]);
        }
        if (errors.selectedCompanies) setErrors(prev => ({ ...prev, selectedCompanies: "" }));
    };

    const removeCompany = (companyId) => {
        set("selectedCompanies", formData.selectedCompanies.filter(c => c.companyId !== companyId));
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const validate = () => {
        const errs = {};
        if (!formData.firstName.trim()) errs.firstName = "First name is required";
        else if (formData.firstName.trim().length < 2) errs.firstName = "First name must be at least 2 characters";
        if (!formData.lastName.trim()) errs.lastName = "Last name is required";
        else if (formData.lastName.trim().length < 2) errs.lastName = "Last name must be at least 2 characters";
        if (!formData.email.trim()) errs.email = "Email is required";
        else if (!emailRegex.test(formData.email.trim())) errs.email = "Enter a valid email address";
        if (!formData.jobTitle.trim()) errs.jobTitle = "Job title is required";
        if (formData.selectedCompanies.length === 0) errs.selectedCompanies = "At least one company is required";
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
            const dataToSave = new FormData();
            // Append standard fields
            ["firstName", "lastName", "email", "jobTitle", "phone", "mobile", "linkedin", "notes", "ownerId"].forEach(key => {
                if (formData[key] !== null && formData[key] !== "") {
                    dataToSave.append(key, formData[key]);
                }
            });
            // Append companies as JSON
            dataToSave.append("companies", JSON.stringify(formData.selectedCompanies));
            // For backward compat: also send primary company
            if (formData.selectedCompanies.length > 0) {
                dataToSave.append("companyId", formData.selectedCompanies[0].companyId || "");
                dataToSave.append("companyName", formData.selectedCompanies[0].companyName || "");
            }
            // Files
            formData.files.forEach(file => dataToSave.append("files", file));
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

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Job Title *</label>
                    <input type="text" className={inputClass("jobTitle")} value={formData.jobTitle}
                        onChange={e => set("jobTitle", e.target.value)} placeholder="Sales Director" />
                    {errors.jobTitle && <p className="text-red-500 text-xs">{errors.jobTitle}</p>}
                </div>

                {/* Multi-Company Picker */}
                <div className="space-y-1" ref={dropdownRef}>
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-400" /> Companies *
                    </label>

                    {/* Selected company tags */}
                    {formData.selectedCompanies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {formData.selectedCompanies.map((c) => (
                                <span key={c.companyId} className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                    {c.companyName}
                                    <button type="button" onClick={() => removeCompany(c.companyId)} className="hover:text-red-900 transition">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Dropdown trigger */}
                    <button
                        type="button"
                        onClick={() => setCompanyDropdownOpen(prev => !prev)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition bg-white ${errors.selectedCompanies ? "border-red-400 focus:ring-red-200" : "border-gray-200 hover:border-gray-300"}`}
                    >
                        <span className="text-gray-400 text-sm">
                            {formData.selectedCompanies.length === 0 ? "— Select Companies —" : `${formData.selectedCompanies.length} selected`}
                        </span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${companyDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown list - inline (no absolute) to stay inside modal */}
                    {companyDropdownOpen && (
                        <div className="w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden max-h-44 flex flex-col">
                            <div className="p-2 border-b border-gray-100">
                                <input
                                    type="text"
                                    placeholder="Search companies..."
                                    value={companySearch}
                                    onChange={e => setCompanySearch(e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300"
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {filteredCompanies.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-4">No companies found</p>
                                ) : filteredCompanies.map(comp => {
                                    const cid = comp._id || comp.id;
                                    const isSelected = formData.selectedCompanies.some(c => c.companyId === cid);
                                    return (
                                        <button
                                            key={cid}
                                            type="button"
                                            onClick={() => toggleCompany(comp)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 ${isSelected ? "text-red-600 bg-red-50" : "text-gray-700"}`}
                                        >
                                            <span>{comp.name}</span>
                                            {isSelected && <Check size={12} className="text-red-500 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {errors.selectedCompanies && <p className="text-red-500 text-xs">{errors.selectedCompanies}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                        <input type="text" className={inputClass("phone")} value={formData.phone}
                            onChange={e => set("phone", e.target.value.replace(/[^\d+\s\-()]/g, ''))} placeholder="+1 (555) 123-4567" />
                        {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Mobile</label>
                        <input type="text" className={inputClass("mobile")} value={formData.mobile}
                            onChange={e => set("mobile", e.target.value.replace(/[^\d+\s\-()]/g, ''))} placeholder="+1 (555) 123-4567" />
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
                                accept={ALLOWED_EXTENSIONS_STRING}
                                className="hidden"
                                onChange={(e) => {
                                    const newFiles = Array.from(e.target.files);
                                    const validFiles = validateFiles(newFiles);
                                    set("files", [...formData.files, ...validFiles]);
                                    e.target.value = null;
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
                        {loading ? "Saving..." : contact ? "Update Contact" : "Create Contact"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
