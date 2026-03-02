import React, { useState } from "react";
import Logo from "../../components/Logo";
import resetBg from "../../assets/reset-password-bg.webp";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../../API/services/userService";

const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
const EyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);
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

const Resetpassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [show, setShow] = useState({ password: false, confirm: false });
    const [form, setForm] = useState({ password: "", confirm: "" });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
        // Clear confirm error when either field changes
        if (name === "password" && errors.confirm === "Passwords do not match") {
            setErrors(prev => ({ ...prev, confirm: "" }));
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.password) {
            errs.password = "New password is required";
        } else if (form.password.length < 6) {
            errs.password = "Password must be at least 6 characters";
        }
        if (!form.confirm) {
            errs.confirm = "Please confirm your password";
        } else if (form.password && form.confirm !== form.password) {
            errs.confirm = "Passwords do not match";
        }
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        if (!token) {
            toast.error("Invalid or missing reset token");
            return;
        }

        setSubmitting(true);
        try {
            await resetPassword({ token, password: form.password });
            toast.success("Password reset successfully!");
            navigate("/success");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to reset password");
        } finally {
            setSubmitting(false);
        }
    };

    const fieldClass = (name) =>
        `w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 shadow-sm transition ${errors[name]
            ? "border-red-400 focus:ring-red-300 bg-red-50"
            : "border-gray-300 focus:ring-red-500"
        }`;

    return (
        <section className="h-screen bg-gray-100 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

            <div className="h-full bg-white px-8 py-6 flex flex-col overflow-hidden">
                <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
                    <div className="py-4">
                        <Logo />
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-8">
                        <h2 className="text-2xl font-bold mb-1 text-gray-800">Reset Password</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Choose a strong new password for your account
                        </p>

                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label className="block mb-1 font-semibold text-gray-800 text-sm">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={show.password ? "text" : "password"}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        className={fieldClass("password")}
                                        placeholder="Min 6 characters"
                                    />
                                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2"
                                        onClick={() => setShow(s => ({ ...s, password: !s.password }))}>
                                        {show.password ? <EyeOpen /> : <EyeOff />}
                                    </button>
                                </div>
                                <ErrorTag message={errors.password} />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block mb-1 font-semibold text-gray-800 text-sm">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={show.confirm ? "text" : "password"}
                                        name="confirm"
                                        value={form.confirm}
                                        onChange={handleChange}
                                        className={fieldClass("confirm")}
                                        placeholder="Re-enter your new password"
                                    />
                                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2"
                                        onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}>
                                        {show.confirm ? <EyeOpen /> : <EyeOff />}
                                    </button>
                                </div>
                                <ErrorTag message={errors.confirm} />
                                {form.confirm && form.password === form.confirm && (
                                    <p className="text-green-600 text-xs mt-1">✓ Passwords match</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition duration-300 cursor-pointer mt-2 ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {submitting ? "Resetting..." : "Change Password"}
                            </button>
                        </form>

                        <p className="text-center text-gray-500 text-sm mt-4">
                            Return to{" "}
                            <Link to="/login" className="text-red-600 font-bold hover:underline hover:text-red-700">
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
                <img src={resetBg} alt="reset-password-img" className="w-full h-full object-cover rounded-xl" />
            </div>

        </section>
    );
};

export default Resetpassword;