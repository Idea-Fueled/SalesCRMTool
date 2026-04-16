import { useEffect, useRef } from "react";

// Must match the LOGIN_GRACE_PERIOD in SessionTimeoutManager
const LOGIN_GRACE_PERIOD = 10_000; // 10 seconds

/**
 * Custom hook to handle automatic dashboard data refreshing.
 * @param {Function} fetchData - The function to call to refresh data.
 * @param {number} intervalMs - The polling interval in milliseconds (default 30s).
 */
const useDashboardRefresh = (fetchData, intervalMs = 30000) => {
    const fetchRef = useRef(fetchData);

    useEffect(() => {
        fetchRef.current = fetchData;
    }, [fetchData]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            // Don't poll within the login grace period to avoid 401 race conditions
            const loginTs = parseInt(sessionStorage.getItem("loginTimestamp") || "0", 10);
            if (Date.now() - loginTs < LOGIN_GRACE_PERIOD) return;
            console.log("Dashboard auto-refresh: polling for updates...");
            fetchRef.current();
        }, intervalMs);

        // Visibility and Focus Refreshes
        const handleVisibilityAndFocus = () => {
            if (document.visibilityState === "visible") {
                // Skip refresh within LOGIN_GRACE_PERIOD of login.
                // Prevents 401-induced session_expired modal when switching
                // tabs or DevTools immediately after logging in.
                const loginTs = parseInt(sessionStorage.getItem("loginTimestamp") || "0", 10);
                if (Date.now() - loginTs < LOGIN_GRACE_PERIOD) {
                    console.log("Dashboard auto-refresh: skipped — within login grace period.");
                    return;
                }
                console.log("Dashboard auto-refresh: window focused/visible, refreshing data...");
                fetchRef.current();
            }
        };

        window.addEventListener("focus", handleVisibilityAndFocus);
        document.addEventListener("visibilitychange", handleVisibilityAndFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", handleVisibilityAndFocus);
            document.removeEventListener("visibilitychange", handleVisibilityAndFocus);
        };
    }, [intervalMs]);
};

export default useDashboardRefresh;

