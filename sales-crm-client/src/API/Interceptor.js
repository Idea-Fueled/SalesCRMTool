import axios from "axios";
import toast from "react-hot-toast";

const getBaseURL = () => {
    const isDevelopment = import.meta.env.MODE === "development" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isDevelopment) {
        return `http://${window.location.hostname}:8000/api`;
    } else {
        return (import.meta.env.VITE_BASE_URL || "").trim() + "/api";
    }
};

const API = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true
})

API.interceptors.request.use((config) => {
    // If we're sending FormData, let axios set the Content-Type automatically with the boundary
    if (config.data instanceof FormData) {
        if (config.headers) {
            delete config.headers["Content-Type"];
        }
    } else if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
    }
    console.log("req sent");
    console.log("URL", config.baseURL + config.url);
    console.log("Method", config.method);
    console.log("Headers", config.headers);
    console.log("Data", config.data);

    return config;
}, (error) => {
    console.log("Error while sending request", error.message);
    return Promise.reject(error);
})

// Module-level flag — guaranteed to be true only once per JS session (page lifetime)
let deactivationHandled = false;

API.interceptors.response.use(
    (response) => {
        // Reset the frontend session expiry timer on successful active requests
        window.dispatchEvent(new CustomEvent("session_activity"));

        return response;
    },
    (error) => {
        console.log("Error while recieving response");

        if (error.response) {
            console.log("Status", error.response.status);
            console.log("Message", error.response.data.message || error.message);

            if (error.response.status === 403 && error.response.data?.code === "ACCOUNT_DEACTIVATED") {
                // Login page needs the error to show the blocked screen — let it through
                if (error.config?.url?.includes("/auth/login")) {
                    return Promise.reject(error);
                }
                // For all other protected routes: ONE toast + ONE logout event
                if (!deactivationHandled) {
                    deactivationHandled = true;
                    toast.error(
                        error.response.data.message || "Your account has been deactivated. Please contact your administrator.",
                        { id: "account-deactivated", duration: 6000, icon: "🔒" }
                    );
                    window.dispatchEvent(new CustomEvent("account_deactivated"));
                }
                // Swallow all — prevents page-level catch blocks from showing "Failed to load data"
                return new Promise(() => { });
            } else if (error.response.status === 401) {
                // If a 401 actually occurs (token expired or missing), trigger the session expired modal immediately.
                if (!error.config?.url?.includes("/auth/login") && !error.config?.url?.includes("/auth/profile")) {
                    window.dispatchEvent(new CustomEvent("session_expired"));
                }
            } else if (error.response.status === 500) {
                console.log("Internal server error");
            } else {
                console.log("Network error!", error.message);
            }
        }

        return Promise.reject(error);
    }
)

export default API;
