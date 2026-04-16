import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, LogOut } from 'lucide-react';

const SessionExpiredModal = ({ isOpen, onClose }) => {
    const { logout } = useAuth();

    const handleLoginAgain = async () => {
        await logout();
        if (onClose) onClose();
        // The AuthContext will set user to null, and ProtectedRoute will handle the react-router navigation to /login automatically.
        // We ensure we fall back to manual redirect if needed.
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden transform animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
                        <Clock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
                    <p className="text-gray-500 text-sm mb-8">
                        Your session has expired due to 15 minutes of inactivity. Please log in again to continue.
                    </p>
                    <button
                        onClick={handleLoginAgain}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-red-700 transition-all active:scale-[0.98]"
                    >
                        <LogOut size={18} />
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionExpiredModal;
