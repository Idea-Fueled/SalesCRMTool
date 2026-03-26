import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import SessionExpiredModal from "./modals/SessionExpiredModal";

const SessionTimeoutManager = ({ children }) => {
    const { user, logout, fetchProfile } = useAuth();
    const [isExpired, setIsExpired] = useState(false);
    
    console.log("DEBUG: SessionTimeoutManager Rendered. User:", user ? "YES" : "NO", "isExpired:", isExpired);

    // 1 minute = 60,000 ms (for testing)
    const INACTIVITY_LIMIT = 60 * 1000;
    // Refresh backend cookie every 30 seconds if active (for testing)
    const REFRESH_INTERVAL = 30 * 1000;

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
        console.warn("Session Expired: User inactive for 1 minute.");
        setIsExpired(true);
    };

    const handleActualLogout = async () => {
        setIsExpired(false);
        localStorage.removeItem("crm_last_activity");
        await logout();
        window.location.href = "/login";
    };

    useEffect(() => {
        console.log("DEBUG: Inactivity useEffect running. User:", !!user, "isExpired:", isExpired);
        if (!user || isExpired) return;

        console.log("Inactivity monitor started. Limit: 1 minute (60 seconds).");

        const checkInactivity = setInterval(() => {
            const lastActivity = getStoredLastActivity();
            const now = Date.now();
            const idleTime = now - lastActivity;

            // log heartbeat every 10 seconds
            if (Math.floor(idleTime / 1000) % 10 === 0) {
                console.log(`Inactivity check: Idle for ${Math.floor(idleTime / 1000)} seconds...`);
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

        const handleExpired = () => {
            setIsExpired(true);
        };

        window.addEventListener("session_expired", handleExpired);

        return () => {
            clearInterval(refreshInterval);
            window.removeEventListener("session_expired", handleExpired);
        };
    }, [user?._id, isExpired]);

    return (
        <>
            {children}
            <SessionExpiredModal isOpen={isExpired} />
        </>
    );
};

export default SessionTimeoutManager;
