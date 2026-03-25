import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Clock, LogOut } from "lucide-react";

const SessionTimeoutManager = ({ children }) => {
    const { user, logout, fetchProfile } = useAuth();
    const timeoutRef = useRef(null);
    const refreshIntervalRef = useRef(null);
    const [isExpired, setIsExpired] = useState(false);

    // 1 minute = 60,000 ms
    const INACTIVITY_LIMIT = 1 * 60 * 1000;
    // Refresh backend cookie every 30 seconds if active
    const REFRESH_INTERVAL = 30 * 1000;

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (user && !isExpired) {
            timeoutRef.current = setTimeout(() => {
                handleLogout();
            }, INACTIVITY_LIMIT);
        }
    };

    const handleLogout = () => {
        console.warn("User inactive for 1 minute. Logging out.");
        setIsExpired(true);
    };

    const handleActualLogout = async () => {
        await logout();
        setIsExpired(false);
        window.location.href = "/login";
    };

    const handleActivity = () => {
        if (!isExpired) {
            resetTimer();
        }
    };

    // Initial setup and Activity Listeners
    useEffect(() => {
        if (!user) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        // Initialize timer once on mount/login
        resetTimer();

        // Event listeners for user activity
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        const handleActivityWrapper = () => {
            if (!isExpired) resetTimer();
        };

        events.forEach(event => document.addEventListener(event, handleActivityWrapper));

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach(event => document.removeEventListener(event, handleActivityWrapper));
        };
    }, [user?._id, isExpired]); // Only re-setup if user ID or expiration state changes

    // Periodic backend session refresh (Sliding window on server)
    useEffect(() => {
        if (!user || isExpired) {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            return;
        }

        refreshIntervalRef.current = setInterval(() => {
            console.log("Activity check: checking session validity with backend...");
            fetchProfile();
        }, REFRESH_INTERVAL);

        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [user?._id, isExpired]);

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
                                Your session has expired due to 1 minute of inactivity. Please log in again to continue.
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
