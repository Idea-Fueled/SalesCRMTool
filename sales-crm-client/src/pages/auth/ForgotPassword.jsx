import React, { useState } from "react";
import Logo from "../../components/Logo";
import { Link, useNavigate } from "react-router-dom";
import forgotBg from "../../assets/forgot-bg.jpg";
import toast from "react-hot-toast";
import { forgotPassword } from "../../../API/services/userService";

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const ErrorTag = ({ message }) => {
    if (!message) return null;
    return (
        <div className="flex items-center text-red-600 text-xs mt-1.5 font-semibold animate-fade-in">
            <AlertIcon />
            {message}
        </div>
    );
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Email is required");
            return;
        }
        if (!emailRegex.test(email.trim())) {
            setError("Enter a valid email address");
            return;
        }
        setError("");
        setSubmitting(true);
        try {
            await forgotPassword(email.trim());
            toast.success("Reset instructions sent to your email!");
            navigate("/email-verification", { state: { email: email.trim() } });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to send reset link");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="h-screen bg-gray-100 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

            <div className="h-full bg-white px-8 py-6 flex flex-col overflow-hidden">
                <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
                    <div className="py-4">
                        <Logo />
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-8">
                        <h2 className="text-3xl font-bold mb-2 text-gray-800">Forgot Password?</h2>
                        <p className="text-gray-500 mb-6">
                            If you forgot your password, well, then we'll email you instructions
                            to reset your password.
                        </p>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="mb-6">
                                <label className="block mb-2 font-medium text-gray-700">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError("");
                                        }}
                                        className={`w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 shadow-sm transition ${error
                                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                                            : "border-gray-300 focus:ring-red-500"
                                            }`}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✉</span>
                                </div>
                                <ErrorTag message={error} />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition duration-300 cursor-pointer ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {submitting ? "Sending..." : "Submit"}
                            </button>
                        </form>

                        <p className="text-center mt-6 text-gray-600 text-sm">
                            Return to{" "}
                            <Link to="/login" className="text-red-600 font-bold cursor-pointer hover:text-red-700 hover:underline">
                                Login
                            </Link>
                        </p>
                    </div>

                    <div className="text-center py-4 border-t border-gray-50 mt-auto">
                        <p className="text-gray-500 text-sm mb-0">Copyright &copy; mbdConsulting</p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block h-screen p-3">
                <img src={forgotBg} alt="forgot-password-img" className="w-full h-full object-cover rounded-xl" />
            </div>

        </section>
    );
};

export default ForgotPassword;