import React, { useRef, useState } from "react";
import Modal from "./Modal";
import { Mail, Shield, User as UserIcon, Calendar, Clock, CheckCircle, XCircle, Camera, Loader2, Trash2, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import API from "../../API/Interceptor";
import { toast } from "react-hot-toast";
import ChangePasswordModal from "./ChangePasswordModal";

export default function MyProfileModal({ isOpen, onClose }) {
    const { user, fetchProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        phoneNumber: user?.phoneNumber || "",
        address: user?.address || ""
    });

    if (!user) return null;

    const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    
    // Instead of random colors, we'll keep a consistent gradient or fallback color
    const avatarColor = "bg-red-600";

    const formatRole = (r) => ({
        admin: "Admin",
        sales_manager: "Sales Manager",
        sales_rep: "Sales Representative"
    }[r] || r?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    const roleBadge = {
        admin: "bg-red-100 text-red-700 border-red-200",
        sales_manager: "bg-orange-100 text-orange-700 border-orange-200",
        sales_rep: "bg-red-50 text-red-600 border-red-100",
    };

    const formatDate = (date) => {
        if (!date) return "Never";
        return new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const handleAvatarClick = () => {
        if (!uploading && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("Image size must be less than 5MB.");
            return;
        }

        const formData = new FormData();
        formData.append("profilePicture", file);

        setUploading(true);
        try {
            const response = await API.put("/auth/profile/picture", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            toast.success(response.data?.message || "Profile picture updated!");
            await fetchProfile(); // Refresh AuthContext to instantly update UI everywhere
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to upload image.");
            console.error("Upload Error:", error);
        } finally {
            setUploading(false);
            // Reset input so the same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemovePicture = async (e) => {
        e.stopPropagation();
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("removeProfilePicture", "true");

            const response = await API.put("/auth/profile/picture", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            toast.success(response.data?.message || "Profile picture removed!");
            await fetchProfile();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove image.");
            console.error("Remove Error:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await API.put("/auth/profile", formData);
            toast.success(response.data?.message || "Profile updated successfully!");
            await fetchProfile();
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile.");
            console.error("Update Profile Error:", error);
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phoneNumber: user.phoneNumber || "",
            address: user.address || ""
        });
        setIsEditing(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Profile">
            <div className="space-y-6">
                
                {/* Header Information with Upload */}
                <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    
                    <div className="relative flex-shrink-0">
                        <button 
                            onClick={handleAvatarClick}
                            disabled={uploading}
                            className={`group w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-sm overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'} ${!user.profilePicture ? avatarColor : 'bg-gray-100'}`}
                            title="Click to change profile picture"
                        >
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{initials}</span>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploading ? (
                                    <Loader2 size={24} className="text-white animate-spin" />
                                ) : (
                                    <>
                                        <Camera size={20} className="text-white mb-1" />
                                        <span className="text-[10px] font-semibold text-white tracking-wider">CHANGE</span>
                                    </>
                                )}
                            </div>
                        </button>
                        {user.profilePicture && !uploading && (
                            <button
                                onClick={handleRemovePicture}
                                className="absolute -top-1 -right-1 bg-white hover:bg-gray-100 text-red-500 rounded-full p-1.5 border border-gray-200 shadow-sm transition-all z-10 hover:scale-110 active:scale-95"
                                title="Remove profile picture"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        {isEditing ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">First Name</label>
                                    <input 
                                        type="text" 
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Name</label>
                                    <input 
                                        type="text" 
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 truncate">{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</h2>
                                <div className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold border ${roleBadge[user.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                    {formatRole(user.role)}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Information Sections */}
                    <div className="space-y-4 min-w-0">
                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Mail size={12} className="text-gray-400" />
                                Contact Details
                            </h4>
                            <div className="flex flex-col min-w-0 space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700 break-all">{user.email}</span>
                                    <span className="text-[11px] text-gray-400 ">Primary Business Email</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handleInputChange}
                                            placeholder="Add phone number"
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none transition-all"
                                        />
                                    ) : (
                                        <span className="text-sm font-semibold text-gray-700">{user.phoneNumber || "Not provided"}</span>
                                    )}
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        <MapPin size={10} />
                                        Location / Address
                                    </label>
                                    {isEditing ? (
                                        <textarea 
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Add address info"
                                            rows={2}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none transition-all resize-none"
                                        />
                                    ) : (
                                        <span className="text-sm font-semibold text-gray-700">{user.address || "Not provided"}</span>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Shield size={12} className="text-gray-400" />
                                Account Status
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {user.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                    {user.isActive ? "ACTIVE" : "DEACTIVATED"}
                                </span>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-4 min-w-0">
                        {user.role !== "admin" && (
                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <UserIcon size={12} className="text-gray-400" />
                                Reporting To
                            </h4>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-gray-700 truncate">
                                    {user.managerId && typeof user.managerId === 'object' ? `${user.managerId.firstName || ""} ${user.managerId.lastName || ""}`.trim() : "No Direct Manager"}
                                </span>
                                {user.managerId && user.managerId.email && (
                                    <span className="text-[11px] font-medium text-gray-500 truncate mt-0.5">{user.managerId.email}</span>
                                )}
                                <span className="text-[10px] text-gray-400  mt-0.5">Assigned Supervisor</span>
                            </div>
                        </section>
                        )}

                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Clock size={12} className="text-gray-400" />
                                Last Activity
                            </h4>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700">{formatDate(user.lastLogin)}</span>
                                <span className="text-[11px] text-gray-400 ">Your last successful session</span>
                            </div>
                        </section>
                    </div>
                </div>

                {/* System Timestamps */}
                <div className="pt-4 mt-2 border-t border-gray-100 flex flex-wrap gap-x-8 gap-y-2">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-300" />
                        <span className="text-[11px] text-gray-400">Created: <span className="font-semibold text-gray-500">{formatDate(user.createdAt)}</span></span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {isEditing ? (
                        <>
                            <button 
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-green-100 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                <span>Save Changes</span>
                            </button>
                            <button 
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                                Edit Profile
                            </button>
                            {user.role === "admin" ? (
                                <button 
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                >
                                    Change Password
                                </button>
                            ) : (
                                <button 
                                    onClick={onClose} 
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                >
                                    Close
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
                userId={user.id || user._id}
            />
        </Modal>
    );
}








