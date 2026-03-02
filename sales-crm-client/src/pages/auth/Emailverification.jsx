import React from "react";
import Logo from "../../components/Logo";
import { Link, useLocation } from "react-router-dom";
import emailVerificationBg from "../../assets/email-verification-bg.jpg";

const Emailverification = () => {
    const location = useLocation();
    const email = location.state?.email || "your email";
    return (
        <section className="h-screen bg-gray-100 grid grid-cols-1 lg:grid-cols-2">

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
                            <span className="text-red-600 font-semibold cursor-pointer hover:underline">
                                Resend Link
                            </span>
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