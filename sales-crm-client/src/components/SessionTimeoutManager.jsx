import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Clock, LogOut } from "lucide-react";

const SessionTimeoutManager = ({ children }) => {
    const { user, logout, fetchProfile } = useAuth();
    const [isExpired, setIsExpired] = useState(false);

    // 15 minutes = 900,000 ms
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    // Refresh backend cookie every 5 minutes if active
    const REFRESH_INTERVAL = 5 * 60 * 1000;

    // Persist last activity in localStorage to survive tab sleeps/reloads
    const getStoredLastActivity = () => {
        const stored = localStorage.getItem("crm_last_activity");
        return stored ? parseInt(stored, 10) : Date.now();
    };

    const resetTimer = () => {
        const now = Date.now();
        localStorage.setItem("crm_last_activity", now.toString());
    };

    const handleLogout = () => {
        console.warn("Session Expired: User inactive for 15 minutes.");
        setIsExpired(true);
    };

    const handleActualLogout = async () => {
        localStorage.removeItem("crm_last_activity");
        await logout();
        setIsExpired(false);
        window.location.href = "/login";
    };

    // Inactivity Checker
    useEffect(() => {
        if (!user || isExpired) return;

        console.log("Inactivity monitor started. Limit: 15 minutes.");

        const checkInactivity = setInterval(() => {
            const lastActivity = getStoredLastActivity();
            const now = Date.now();
            const idleTime = now - lastActivity;

            // Optional: log heartbeat every minute
            if (Math.floor(idleTime / 1000) % 60 === 0) {
                console.log(`Inactivity check: Idle for ${Math.floor(idleTime / 1000 / 60)} minutes...`);
            }

            if (idleTime >= INACTIVITY_LIMIT) {
                handleLogout();
            }
        }, 1000); // Check every second

        return () => clearInterval(checkInactivity);
    }, [user?._id, isExpired]);

    // Initial setup and Activity Listeners
    useEffect(() => {
        if (!user || isExpired) return;

        // Sync initial state
        const last = localStorage.getItem("crm_last_activity");
        if (!last) resetTimer();

        // Event listeners for user activity
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        const handleActivityWrapper = () => {
            resetTimer();
        };

        events.forEach(event => document.addEventListener(event, handleActivityWrapper));

        return () => {
            events.forEach(event => document.removeEventListener(event, handleActivityWrapper));
        };
    }, [user?._id, isExpired]);

    // Periodic backend session refresh
    useEffect(() => {
        if (!user || isExpired) return;

        const refreshInterval = setInterval(() => {
            console.log("Activity check: checking session validity...");
            fetchProfile();
        }, REFRESH_INTERVAL);

        return () => clearInterval(refreshInterval);
    }, [user?._id, isExpired]);

    return (
        <>
            {children}
            {isExpired && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-red-600 ring-8 ring-red-50/50 animate-pulse">
                                <Clock size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Session Expired</h2>
                            <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
                                Your session has expired due to **15 minutes** of inactivity. Please log in again to safeguard your data.
                            </p>
                            <button
                                onClick={handleActualLogout}
                                className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-4 px-8 rounded-2xl font-black text-sm hover:bg-red-700 transition-all active:scale-[0.97] shadow-xl shadow-red-200"
                            >
                                <LogOut size={20} />
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
