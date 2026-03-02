import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { setupPassword } from "../../../API/services/userService";
import { toast } from "react-hot-toast";
import { Lock, CheckCircle, ArrowRight, ShieldCheck, Mail } from "lucide-react";

export default function SetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error("Invalid or missing setup token.");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await setupPassword({ token, password });
            toast.success("Account setup successful!");
            setSuccess(true);
            setTimeout(() => navigate("/login"), 3000);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to set up account.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Your account has been successfully activated. You're being redirected to the login page...
                    </p>
                    <Link to="/login" className="inline-flex items-center gap-2 text-red-600 font-bold hover:underline">
                        Log in now <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-red-600 p-8 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Set Up Your Account</h1>
                        <p className="text-red-100/80 text-sm mt-1">Define your secure access password</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {!token ? (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex gap-3">
                                <Mail size={18} className="flex-shrink-0" />
                                <p>This setup link appears to be invalid or expired. Please check your email or contact your administrator.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium px-2">
                                        * Password must be at least 6 characters long.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-red-600 text-white font-bold rounded-xl p-4 hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100 disabled:opacity-70 disabled:scale-100 active:scale-95"
                                >
                                    {loading ? "Activating account..." : "Complete Account Setup"}
                                </button>
                            </>
                        )}

                        <div className="text-center pt-2">
                            <Link to="/login" className="text-xs text-gray-400 hover:text-red-600 transition font-bold">
                                BACK TO LOGIN
                            </Link>
                        </div>
                    </form>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8">
                    &copy; {new Date().getFullYear()} mbdConsulting. All rights reserved.
                </p>
            </div>
        </div>
    );
}
