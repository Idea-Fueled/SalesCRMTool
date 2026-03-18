import React, { useRef, useState } from "react";
import Modal from "./Modal";
import { Mail, Shield, User as UserIcon, Calendar, Clock, CheckCircle, XCircle, Camera, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import API from "../../API/Interceptor";
import { toast } from "react-hot-toast";

export default function MyProfileModal({ isOpen, onClose }) {
    const { user, fetchProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!user) return null;

    const initials = `${user.firstName?.[0] || ""}${user.lastName?.slice(-1) || ""}`.toUpperCase();
    
    // Instead of random colors, we'll keep a consistent gradient or fallback color
    const avatarColor = "bg-red-600";

    const formatRole = (r) => ({
        admin: "ADMIN",
        sales_manager: "SALES MANAGER",
        sales_rep: "SALES REPRESENTATIVE"
    }[r] || r?.toUpperCase());

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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Profile">
            <div className="space-y-6">
                
                {/* Header Information with Upload */}
                <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    
                    <div className="relative group flex-shrink-0">
                        <button 
                            onClick={handleAvatarClick}
                            disabled={uploading}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-sm overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'} ${!user.profilePicture ? avatarColor : 'bg-gray-100'}`}
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
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold text-gray-900 truncate">{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</h2>
                        <div className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold border ${roleBadge[user.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {formatRole(user.role)}
                        </div>
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
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-gray-700 break-all">{user.email}</span>
                                <span className="text-[11px] text-gray-400 italic">Primary Business Email</span>
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
                                <span className="text-[10px] text-gray-400 italic mt-0.5">Assigned Supervisor</span>
                            </div>
                        </section>

                        <section>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <Clock size={12} className="text-gray-400" />
                                Last Activity
                            </h4>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700">{formatDate(user.lastLogin)}</span>
                                <span className="text-[11px] text-gray-400 italic">Your last successful session</span>
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

                <div className="flex pt-2">
                    <button onClick={onClose} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 active:scale-[0.98]">
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
