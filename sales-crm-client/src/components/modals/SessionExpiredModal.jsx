import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, LogOut } from 'lucide-react';

const SessionExpiredModal = ({ isOpen }) => {
    const { logout } = useAuth();

    const handleLoginAgain = async () => {
        await logout();
        window.location.href = "/login";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-red-600 ring-8 ring-red-50/50 animate-pulse">
                        <Clock size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Session Expired</h2>
                    <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
                        Your session has expired due to 1 minute of inactivity. Please log in again to continue.
                    </p>
                    <button
                        onClick={handleLoginAgain}
                        className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-4 px-8 rounded-2xl font-black text-sm hover:bg-red-700 transition-all active:scale-[0.97] shadow-xl shadow-red-200"
                    >
                        <LogOut size={20} />
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionExpiredModal;
