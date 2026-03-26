import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import SessionExpiredModal from "./modals/SessionExpiredModal";

const SessionTimeoutManager = ({ children }) => {
    const { user, logout, fetchProfile } = useAuth();
    const [isExpired, setIsExpired] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // 1 minute = 60,000 ms (for testing)
    const INACTIVITY_LIMIT = 60 * 1000;
    // Refresh backend cookie every 30 seconds if active (for testing)
    const REFRESH_INTERVAL = 30 * 1000;

    const handleLoggedOutMode = async () => {
        setIsExpired(true);
    };

    // Main Inactivity Logic
    useEffect(() => {
        if (!user || isExpired) return;

        console.log("DEBUG: Inactivity monitor STARTED (1 minute limit)");
        lastActivityRef.current = Date.now();

        const checkInterval = setInterval(() => {
            const now = Date.now();
            const idleTime = now - lastActivityRef.current;
            const idleSeconds = Math.floor(idleTime / 1000);

            if (idleSeconds > 0 && idleSeconds % 10 === 0) {
                console.log(`DEBUG: Still idle... ${idleSeconds}s / 60s`);
            }

            if (idleTime >= INACTIVITY_LIMIT) {
                console.warn("DEBUG: INACTIVITY LIMIT REACHED!");
                handleLoggedOutMode();
            }
        }, 1000);

        const resetTimer = () => {
            lastActivityRef.current = Date.now();
        };

        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        events.forEach(event => document.addEventListener(event, resetTimer));

        // Listen for server-side expiration (401s)
        const handleServerExpired = () => {
            console.warn("DEBUG: SESSION_EXPIRED EVENT RECEIVED FROM SERVER!");
            setIsExpired(true);
        };
        window.addEventListener("session_expired", handleServerExpired);

        // Periodically refresh profile to keep backend session alive if active
        const refreshTimer = setInterval(() => {
            console.log("DEBUG: Periodic session refresh (fetchProfile)");
            fetchProfile();
        }, REFRESH_INTERVAL);

        return () => {
            clearInterval(checkInterval);
            clearInterval(refreshTimer);
            events.forEach(event => document.removeEventListener(event, resetTimer));
            window.removeEventListener("session_expired", handleServerExpired);
        };
    }, [user, isExpired]);

    return (
        <>
            {children}
            <SessionExpiredModal isOpen={isExpired} />
        </>
    );
};

export default SessionTimeoutManager;
