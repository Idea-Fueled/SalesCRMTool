import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";

const SessionTimeoutManager = ({ children }) => {
    const { user, logout, fetchProfile } = useAuth();
    const navigate = useNavigate();
    const timeoutRef = useRef(null);
    const refreshIntervalRef = useRef(null);
    const [isExpired, setIsExpired] = useState(false);

    // 15 minutes = 900,000 ms
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    // Refresh backend cookie every 5 minutes if active
    const REFRESH_INTERVAL = 5 * 60 * 1000;

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (user && !isExpired) {
            timeoutRef.current = setTimeout(() => {
                handleLogout();
            }, INACTIVITY_LIMIT);
        }
    };

    const handleLogout = () => {
        console.warn("User inactive for 15 minutes. Logging out.");
        setIsExpired(true);
    };

    const handleActualLogout = async () => {
        await logout();
        setIsExpired(false);
        navigate("/login");
    };

    const handleActivity = () => {
        if (!isExpired) {
            resetTimer();
        }
    };

    useEffect(() => {
        if (!user) {
            // Clear timers if logged out
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            return;
        }

        // Initialize inactivity timer
        resetTimer();

        // Setup periodic backend refresh (sliding session backup)
        refreshIntervalRef.current = setInterval(() => {
            if (!isExpired) {
                console.log("Activity check: refreshing session...");
                fetchProfile();
            }
        }, REFRESH_INTERVAL);

        // Event listeners for user activity
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        events.forEach(event => document.addEventListener(event, handleActivity));

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            events.forEach(event => document.removeEventListener(event, handleActivity));
        };
    }, [user, isExpired]);

    return (
        <>
            {children}
            {isExpired && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600 ring-4 ring-red-50/50">
                                <Clock size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                Your session has expired due to 15 minutes of inactivity. Please log in again to continue.
                            </p>
                            <button
                                onClick={handleActualLogout}
                                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-100"
                            >
                                <LogOut size={18} />
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SessionTimeoutManager;
