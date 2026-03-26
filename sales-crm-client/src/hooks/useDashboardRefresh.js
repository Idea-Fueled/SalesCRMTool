import { useEffect, useRef } from "react";

/**
 * Custom hook to handle automatic dashboard data refreshing.
 * @param {Function} fetchData - The function to call to refresh data.
 * @param {number} intervalMs - The polling interval in milliseconds (default 1 minute).
 */
const useDashboardRefresh = (fetchData, intervalMs = 30000) => {
    const fetchRef = useRef(fetchData);

    useEffect(() => {
        fetchRef.current = fetchData;
    }, [fetchData]);

    useEffect(() => {
        // Initial fetch is usually handled by the component's own useEffect,
        // but this hook ensures periodic updates.
        
        const intervalId = setInterval(() => {
            console.log("Dashboard auto-refresh: polling for updates...");
            fetchRef.current();
        }, intervalMs);

        // Visibility and Focus Refreshes
        const handleVisibilityAndFocus = () => {
            if (document.visibilityState === "visible") {
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
