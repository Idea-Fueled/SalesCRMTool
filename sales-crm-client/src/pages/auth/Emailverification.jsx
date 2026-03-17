import React from "react";
import Logo from "../../components/Logo";
import { Link, useLocation } from "react-router-dom";
import emailVerificationBg from "../../assets/email-verification-bg.jpg";
import { resendVerificationByEmail } from "../../API/services/userService";
import toast, { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";

const Emailverification = () => {
    const location = useLocation();
    const email = location.state?.email || "";
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleResend = async () => {
        if (!email) {
            toast.error("User email not found. Please try logging in.");
            return;
        }
        if (cooldown > 0) return;

        setIsResending(true);
        try {
            await resendVerificationByEmail(email);
            toast.success("Verification link sent!");
            setCooldown(60); // 60 seconds cooldown
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to resend link.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <section className="h-screen bg-gray-100 grid grid-cols-1 lg:grid-cols-2 relative">
            <Toaster position="top-center" />

            <div className="h-screen overflow-y-auto bg-white p-12 flex flex-col">
                <div className="w-full max-w-md mx-auto flex-1 flex flex-col">

                    <Logo />

                    <div className="flex-1 flex flex-col items-center justify-center text-center">

                        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-8 h-8 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold mb-3 text-gray-800">Verify Your Email</h2>

                        <p className="text-gray-500 text-sm mb-4 max-w-xs">
                            We've sent a link to your email <strong>{email}</strong>. Please
                            follow the link inside to continue
                        </p>

                        <p className="text-gray-500 text-sm mb-6">
                            Didn't receive an email?{" "}
                            <button 
                                onClick={handleResend}
                                disabled={isResending || cooldown > 0}
                                className={`font-semibold cursor-pointer hover:underline outline-none bg-transparent border-none p-0 ${cooldown > 0 ? 'text-gray-400' : 'text-red-600'}`}
                            >
                                {isResending ? "Sending..." : cooldown > 0 ? `Resend Link (${cooldown}s)` : "Resend Link"}
                            </button>
                        </p>

                        <Link to="/login" className="w-full">
                            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition duration-300 cursor-pointer">
                                Skip
                            </button>
                        </Link>

                    </div>

                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm mb-0">Copyright &copy; mbdConsulting</p>
                    </div>

                </div>
            </div>

            <div className="hidden lg:block h-screen p-3">
                <img
                    src={emailVerificationBg}
                    alt="email-verification-img"
                    className="w-full h-full object-cover rounded-lg"
                />
            </div>

        </section>
    );
};

export default Emailverification;