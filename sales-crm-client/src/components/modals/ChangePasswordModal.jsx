import React, { useState } from "react";
import Modal from "./Modal";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { changePassword } from "../../API/services/userService";
import { toast } from "react-hot-toast";

export default function ChangePasswordModal({ isOpen, onClose, userId }) {
    const [loading, setLoading] = useState(false);
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [formData, setFormData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.oldPassword) newErrors.oldPassword = "Old password is required";
        if (!formData.newPassword) {
            newErrors.newPassword = "New password is required";
        } else if (formData.newPassword.length < 6) {
            newErrors.newPassword = "Password must be at least 6 characters";
        }
        if (formData.confirmPassword !== formData.newPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await changePassword(userId, {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            });
            toast.success("Password changed successfully!");
            setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-2">
                    <p className="text-xs text-red-700 font-medium leading-relaxed">
                        For security reasons, you must provide your current password to set a new one. Your new password must be at least 6 characters long.
                    </p>
                </div>

                {/* Old Password */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                            <Lock size={16} />
                        </div>
                        <input
                            type={showOld ? "text" : "password"}
                            name="oldPassword"
                            value={formData.oldPassword}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-12 py-2.5 bg-gray-50 border rounded-xl text-sm transition-all focus:ring-2 focus:ring-red-100 outline-none ${errors.oldPassword ? "border-red-300 ring-red-50" : "border-gray-200 focus:border-red-400"}`}
                            placeholder="Enter current password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowOld(!showOld)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.oldPassword && <p className="text-[10px] text-red-500 font-bold ml-1 mt-1 uppercase tracking-tight">{errors.oldPassword}</p>}
                </div>

                {/* New Password */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                            <Lock size={16} />
                        </div>
                        <input
                            type={showNew ? "text" : "password"}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-12 py-2.5 bg-gray-50 border rounded-xl text-sm transition-all focus:ring-2 focus:ring-red-100 outline-none ${errors.newPassword ? "border-red-300 ring-red-50" : "border-gray-200 focus:border-red-400"}`}
                            placeholder="Min. 6 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.newPassword && <p className="text-[10px] text-red-500 font-bold ml-1 mt-1 uppercase tracking-tight">{errors.newPassword}</p>}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm New Password</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                            <Lock size={16} />
                        </div>
                        <input
                            type={showConfirm ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-12 py-2.5 bg-gray-50 border rounded-xl text-sm transition-all focus:ring-2 focus:ring-red-100 outline-none ${errors.confirmPassword ? "border-red-300 ring-red-50" : "border-gray-200 focus:border-red-400"}`}
                            placeholder="Min. 6 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold ml-1 mt-1 uppercase tracking-tight">{errors.confirmPassword}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
