import React, { createContext, useState, useEffect, useContext } from "react";
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
