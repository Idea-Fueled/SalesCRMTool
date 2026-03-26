import React, { createContext, useState, useEffect, useContext } from "react";
import API from "../API/Interceptor";
import { toast } from "react-hot-toast";
import SessionExpiredModal from "../components/modals/SessionExpiredModal";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    const fetchProfile = async () => {
        try {
            const response = await API.get("/auth/profile");
            setUser(response.data.data);
        } catch (error) {
            console.error("Failed to fetch profile:", error.message);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        const failsafe = setTimeout(() => {
            setLoading(currentLoading => {
                if (currentLoading) {
                    console.warn("Auth check timed out. Defaulting to logged out state.");
                    return false;
                }
                return currentLoading;
            });
        }, 10000);

        return () => clearTimeout(failsafe);
    }, []);

    // Listen for account_deactivated event — toast is already shown by Interceptor,
    // here we just clear the user and stop the loading state.
    useEffect(() => {
        const handleDeactivated = () => {
            setUser(null);
            setLoading(false); // unblock the loading spinner immediately
        };
        window.addEventListener("account_deactivated", handleDeactivated);
        return () => window.removeEventListener("account_deactivated", handleDeactivated);
    }, []);

    // Session Expiry Logic
    useEffect(() => {
        let sessionTimer;
        // 1 minute timeout for testing
        const TIMEOUT_DURATION = 60 * 1000;

        const startTimer = () => {
            clearTimeout(sessionTimer);
            if (user) {
                sessionTimer = setTimeout(() => {
                    setIsSessionExpired(true);
                }, TIMEOUT_DURATION);
            }
        };

        const handleActivity = () => {
            startTimer();
        };

        const handleExpired = () => {
            setIsSessionExpired(true);
        };

        window.addEventListener("session_activity", handleActivity);
        window.addEventListener("session_expired", handleExpired);

        startTimer();

        return () => {
            window.removeEventListener("session_activity", handleActivity);
            window.removeEventListener("session_expired", handleExpired);
            clearTimeout(sessionTimer);
        };
    }, [user]);

    const login = (userData) => {
        setUser(userData);
        setIsSessionExpired(false);
    };

    const logout = async () => {
        try {
            await API.post("/auth/logout");
        } catch (error) {
            // Even if the call fails, clear state and redirect
            console.error("Logout error:", error.message);
        } finally {
            setUser(null);
            setIsSessionExpired(false);
            toast.success("Logged out successfully");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, fetchProfile }}>
            {children}
            <SessionExpiredModal isOpen={isSessionExpired} />
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
