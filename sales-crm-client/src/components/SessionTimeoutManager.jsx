import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

const SessionTimeoutManager = ({ children }) => {
    const { user, logout, fetchProfile } = useAuth();
    const timeoutRef = useRef(null);
    const refreshIntervalRef = useRef(null);

    // 15 minutes = 900,000 ms
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    // Refresh backend cookie every 5 minutes if active
    const REFRESH_INTERVAL = 5 * 60 * 1000;

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (user) {
            timeoutRef.current = setTimeout(() => {
                handleLogout();
            }, INACTIVITY_LIMIT);
        }
    };

    const handleLogout = () => {
        console.warn("User inactive for 15 minutes. Logging out.");
        logout();
        toast("Session expired due to inactivity", {
            icon: '⏰',
            duration: 6000
        });
    };

    const handleActivity = () => {
        resetTimer();
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
        // This ensures the cookie stays alive even if the user is just browsing/reading
        // and not triggering other API calls.
        refreshIntervalRef.current = setInterval(() => {
            console.log("Activity check: refreshing session...");
            fetchProfile();
        }, REFRESH_INTERVAL);

        // Event listeners for user activity
        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
        events.forEach(event => document.addEventListener(event, handleActivity));

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            events.forEach(event => document.removeEventListener(event, handleActivity));
        };
    }, [user]);

    return children;
};

export default SessionTimeoutManager;
