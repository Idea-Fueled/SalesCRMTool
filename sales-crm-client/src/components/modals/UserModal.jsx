import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createUser, updateUser, adminResetPassword } from "../../../API/services/userService";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const ModalOverlay = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
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

const baseInput = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white transition";
const inputClass = (err) => err
    ? `${baseInput} border-red-400 focus:ring-red-200 bg-red-50`
    : `${baseInput} border-gray-200 focus:ring-red-400`;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserModal({ isOpen, onClose, user, managers = [], onSaved, restrictedRole, fixedManagerId }) {
    const { user: currentUser } = useAuth();
    const isEdit = !!user;
    const isAdmin = currentUser?.role === "admin";

    const [form, setForm] = useState({
        firstName: "", lastName: "", email: "", password: "",
        role: "sales_rep", managerId: ""
    });
    const [adminNewPassword, setAdminNewPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isEdit) {
                setForm({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    password: "",
                    role: user.role,
                    managerId: user.managerId?._id || user.managerId || ""
                });
            } else {
                setForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    role: restrictedRole || "sales_rep",
                    managerId: fixedManagerId || ""
                });
            }
            setErrors({});
            setAdminNewPassword("");
        }
    }, [isOpen, user, isEdit, restrictedRole, fixedManagerId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validate = () => {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = "First name is required";
        if (!form.lastName.trim()) errs.lastName = "Last name is required";
        if (!form.email.trim()) errs.email = "Email is required";
        else if (!emailRegex.test(form.email.trim())) errs.email = "Enter a valid email address";
        if (!isEdit) {
            if (form.password && form.password.length < 6) {
                errs.password = "Password must be at least 6 characters";
            }
        }
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSaving(true);
        try {
            const payload = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                role: form.role,
                managerId: form.role === "sales_rep" ? form.managerId || null : null,
                ...(!isEdit && { password: form.password })
            };
            if (isEdit) {
                await updateUser(user._id, payload);
                toast.success("User updated successfully");
            } else {
                await createUser(payload);
                toast.success("User created successfully");
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save user");
        } finally {
            setSaving(false);
        }
    };

    const handleAdminResetPassword = async () => {
        if (!adminNewPassword || adminNewPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        setSaving(true);
        try {
            await adminResetPassword(user._id, adminNewPassword);
            toast.success("Password reset successfully");
            setAdminNewPassword("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reset password");
        } finally {
            setSaving(false);
        }
    };

    const getTitle = () => {
        if (isEdit) return "Edit User";
        if (restrictedRole === "sales_rep") return "Add New Sales Representative";
        return "Add New User";
    };

    if (!isOpen) return null;

    return (
        <ModalOverlay onClose={onClose}>
            <ModalHeader title={getTitle()} onClose={onClose} />
            <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                        <input name="firstName" value={form.firstName} onChange={handleChange}
                            className={inputClass(errors.firstName)} placeholder="Jane" />
                        {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name *</label>
                        <input name="lastName" value={form.lastName} onChange={handleChange}
                            className={inputClass(errors.lastName)} placeholder="Smith" />
                        {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange}
                        className={inputClass(errors.email)} placeholder="jane@company.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                {!isEdit && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Password (Optional)</label>
                        <input type="password" name="password" value={form.password} onChange={handleChange}
                            className={inputClass(errors.password)} placeholder="Leave blank to send invitation email" />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        <p className="text-[10px] text-gray-400 mt-1 italic">
                            If omitted, the user will receive a link via email to set their own password.
                        </p>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
                    {restrictedRole ? (
                        <div className="text-sm font-medium text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            {restrictedRole === "sales_rep" ? "SALES REPRESENTATIVE" : restrictedRole.replace(/_/g, " ").toUpperCase()}
                        </div>
                    ) : (
                        <select name="role" value={form.role} onChange={handleChange} className={inputClass(false)}>
                            <option value="admin">ADMIN</option>
                            <option value="sales_manager">SALES MANAGER</option>
                            <option value="sales_rep">SALES REPRESENTATIVE</option>
                        </select>
                    )}
                </div>
                {form.role === "sales_rep" && !fixedManagerId && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Reports To (Manager)</label>
                        <select name="managerId" value={form.managerId} onChange={handleChange} className={inputClass(false)}>
                            <option value="">— No Manager —</option>
                            {managers.map(m => (
                                <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>
                )}
                {isEdit && isAdmin && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 uppercase">Reset User Password</label>
                            <span className="text-[10px] text-gray-400 font-medium">ADMIN ONLY</span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={adminNewPassword}
                                onChange={e => setAdminNewPassword(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-400 bg-white"
                                placeholder="Enter temporary password"
                            />
                            <button
                                type="button"
                                onClick={handleAdminResetPassword}
                                disabled={saving}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 shadow-sm shadow-red-100"
                            >
                                Reset
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 italic">User will not be notified; please share it with them.</p>
                    </div>
                )}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 transition">
                        {saving ? "Saving..." : isEdit ? "Save Changes" : (restrictedRole === "sales_rep" ? "Create Representative" : "Create User")}
                    </button>
                </div>
            </form>
        </ModalOverlay >
    );
}
