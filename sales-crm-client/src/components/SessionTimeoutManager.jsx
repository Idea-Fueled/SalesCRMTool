import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import SessionExpiredModal from "./modals/SessionExpiredModal";

// How long after login to ignore session_expired events (ms).
// Prevents false triggers from API calls that race with the auth cookie.
const LOGIN_GRACE_PERIOD = 10_000; // 10 seconds

const SessionTimeoutManager = ({ children }) => {
    const { user, fetchProfile } = useAuth();
    const [isExpired, setIsExpired] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // 15 minutes inactivity limit
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    // Refresh backend cookie every 30 seconds while active
    const REFRESH_INTERVAL = 30 * 1000;

    // Reset expired flag whenever a new user session starts
    useEffect(() => {
        if (user) {
            setIsExpired(false);
            lastActivityRef.current = Date.now();
        }
    }, [user?._id, user?.id]);

    // Main inactivity + server-expiry logic
    useEffect(() => {
        if (!user || isExpired) return;

        lastActivityRef.current = Date.now();

        const checkInterval = setInterval(() => {
            const idleTime = Date.now() - lastActivityRef.current;
            if (idleTime >= INACTIVITY_LIMIT) {
                console.warn("SESSION: Inactivity limit reached.");
                setIsExpired(true);
            }
        }, 1000);

        const resetTimer = () => { lastActivityRef.current = Date.now(); };
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        events.forEach(e => document.addEventListener(e, resetTimer));

        // server-side 401 handler — respects login grace period
        const handleServerExpired = () => {
            const loginTs = parseInt(sessionStorage.getItem("loginTimestamp") || "0", 10);
            const elapsed = Date.now() - loginTs;
            if (elapsed < LOGIN_GRACE_PERIOD) {
                console.warn(`SESSION: session_expired suppressed — only ${Math.round(elapsed / 1000)}s since login.`);
                return;
            }
            console.warn("SESSION: session_expired received from server.");
            setIsExpired(true);
        };
        window.addEventListener("session_expired", handleServerExpired);

        // Periodically refresh profile to keep backend session alive
        const refreshTimer = setInterval(() => {
            fetchProfile();
        }, REFRESH_INTERVAL);

        return () => {
            clearInterval(checkInterval);
            clearInterval(refreshTimer);
            events.forEach(e => document.removeEventListener(e, resetTimer));
            window.removeEventListener("session_expired", handleServerExpired);
        };
    }, [user?._id, user?.id, isExpired]);

    return (
        <>
            {children}
            <SessionExpiredModal isOpen={isExpired} onClose={() => setIsExpired(false)} />
        </>
    );
};

export default SessionTimeoutManager;



