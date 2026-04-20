import React, { useState, useEffect, useRef } from "react";
import { Paperclip, X, Building2, ChevronDown, Check, User, Plus } from "lucide-react";
import { validateFiles, ALLOWED_EXTENSIONS_STRING } from "../../utils/fileUtils";
import Modal from "./Modal";
import CompanyModal from "./CompanyModal";
import { createCompany } from "../../API/services/companyService";
import { toast } from "react-hot-toast";

export default function ContactModal({ isOpen, onClose, contact, onSave, companies = [], userRole, potentialOwners = [] }) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+\d\s\-()]{7,15}$/;
    const dropdownRef = useRef(null);

    // "individual" or "company" — only relevant for create mode
    const [contactType, setContactType] = useState("company");
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [localCompanies, setLocalCompanies] = useState(companies);

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

    // Sync external companies list
    useEffect(() => {
        setLocalCompanies(companies);
    }, [companies]);

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

            // When editing, determine contact type from existing data
            if (selectedCompanies.length > 0) {
                setContactType("company");
            } else {
                setContactType("individual");
            }
        } else {
            setFormData({ firstName: "", lastName: "", email: "", jobTitle: "", selectedCompanies: [], phone: "", mobile: "", linkedin: "", notes: "", ownerId: "", files: [] });
            setContactType("company");
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

    const filteredCompanies = localCompanies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const handleContactTypeChange = (type) => {
        setContactType(type);
        if (type === "individual") {
            // Clear selected companies when switching to individual
            set("selectedCompanies", []);
        }
        // Clear any company-related errors
        if (errors.selectedCompanies) setErrors(prev => ({ ...prev, selectedCompanies: "" }));
    };

    const handleCreateCompany = async (companyFormData) => {
        try {
            const res = await createCompany(companyFormData);
            const newCompany = res.data.data;
            toast.success("Company created successfully!");
            // Add to local companies list
            setLocalCompanies(prev => [...prev, newCompany]);
            // Auto-select the newly created company
            setFormData(prev => ({
                ...prev,
                selectedCompanies: [...prev.selectedCompanies, { companyId: newCompany._id, companyName: newCompany.name }]
            }));
            setIsCompanyModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to create company");
            throw error;
        }
    };

    const validate = () => {
        const errs = {};
        if (!formData.firstName.trim()) errs.firstName = "First name is required";
        else if (formData.firstName.trim().length < 2) errs.firstName = "First name must be at least 2 characters";
        if (!formData.lastName.trim()) errs.lastName = "Last name is required";
        else if (formData.lastName.trim().length < 2) errs.lastName = "Last name must be at least 2 characters";
        if (!formData.email.trim()) errs.email = "Email is required";
        else if (!emailRegex.test(formData.email.trim())) errs.email = "Enter a valid email address";
        if (!formData.jobTitle.trim()) errs.jobTitle = "Job title is required";
        // Only require company for "company" type contacts
        if (contactType === "company" && formData.selectedCompanies.length === 0) {
            errs.selectedCompanies = "At least one company is required";
        }
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

    const isEditMode = !!contact;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contact ? "Edit Contact" : "Create New Contact"}>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* Contact Type Selector — only shown on create */}
                {!isEditMode && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Contact Type</label>
                        <div className="flex gap-3">
                            <label
                                className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    contactType === "company"
                                        ? "border-red-500 bg-red-50/60 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                                onClick={() => handleContactTypeChange("company")}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                    contactType === "company" ? "border-red-500" : "border-gray-300"
                                }`}>
                                    {contactType === "company" && (
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                    )}
                                </div>
                                <Building2 size={14} className={contactType === "company" ? "text-red-500" : "text-gray-400"} />
                                <div>
                                    <p className={`text-xs font-bold ${contactType === "company" ? "text-red-700" : "text-gray-600"}`}>
                                        Company
                                    </p>
                                </div>
                            </label>
                            <label
                                className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    contactType === "individual"
                                        ? "border-red-500 bg-red-50/60 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                                onClick={() => handleContactTypeChange("individual")}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                    contactType === "individual" ? "border-red-500" : "border-gray-300"
                                }`}>
                                    {contactType === "individual" && (
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                    )}
                                </div>
                                <User size={14} className={contactType === "individual" ? "text-red-500" : "text-gray-400"} />
                                <div>
                                    <p className={`text-xs font-bold ${contactType === "individual" ? "text-red-700" : "text-gray-600"}`}>
                                        Individual
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

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

                {/* Company Section — conditional based on contactType */}
                {contactType === "company" ? (
                    /* Multi-Company Picker */
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
                                        {!isEditMode && (
                                            <button type="button" onClick={() => removeCompany(c.companyId)} className="hover:text-red-900 transition">
                                                <X size={10} />
                                            </button>
                                        )}
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
                ) : (
                    /* Individual Contact — show "Add New Company" button */
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                            <Building2 size={12} className="text-gray-400" /> Company (Optional)
                        </label>

                        {/* Show any selected companies from inline creation */}
                        {formData.selectedCompanies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {formData.selectedCompanies.map((c) => (
                                    <span key={c.companyId} className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                        {c.companyName}
                                        <button type="button" onClick={() => removeCompany(c.companyId)} className="hover:text-green-900 transition">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsCompanyModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-2 border-dashed border-gray-300 rounded-xl text-gray-500 bg-gray-50/50 hover:border-red-400 hover:text-red-600 hover:bg-red-50/30 transition-all"
                        >
                            <Plus size={16} />
                            <span>Add New Company</span>
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">
                            You can optionally create and link a new company to this contact.
                        </p>
                    </div>
                )}

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

            {/* Inline Company Creation Modal */}
            <CompanyModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                company={null}
                onSave={handleCreateCompany}
                userRole={userRole}
                potentialOwners={potentialOwners}
            />
        </Modal>
    );
}
