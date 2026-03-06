import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import API from "../../API/Interceptor";
import { toast } from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const handlingDeactivation = useRef(false);

    // Fallback: listen for account_deactivated event fired by Interceptor or socket
    useEffect(() => {
        const handleDeactivated = (e) => {
            if (handlingDeactivation.current) return; // deduplicate
            handlingDeactivation.current = true;
            toast.error(e.detail?.message || "Your account has been deactivated. Please contact your administrator.", {
                id: "account-deactivated", // fixed ID prevents duplicate toasts
                duration: 6000,
                icon: "🔒"
            });
            setUser(null);
        };
        window.addEventListener("account_deactivated", handleDeactivated);
        return () => window.removeEventListener("account_deactivated", handleDeactivated);
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await API.post("/auth/logout");
        } catch (error) {
            // Even if the call fails, clear state and redirect
            console.error("Logout error:", error.message);
        } finally {
            setUser(null);
            toast.success("Logged out successfully");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, fetchProfile }}>
            {children}
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
