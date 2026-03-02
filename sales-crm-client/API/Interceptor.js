import axios from "axios";
import toast from "react-hot-toast";

const getBaseURL = () => "/api";

const API = axios.create({
    baseURL: getBaseURL(),
    headers: {
        "Content-Type": "application/json"
    },
    withCredentials: true
})

API.interceptors.request.use((config) => {
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

API.interceptors.response.use(
    (response) => {
        console.log("Response recieved!");
        console.log("Status", response.status);
        console.log("Response data", response.data);

        return response;
    },
    (error) => {
        console.log("Error while recieving response");

        if (error.response) {
            console.log("Status", error.response.status);
            console.log("Message", error.response.data.message || error.message);

            if (error.response.status === 401) {
                // Silenced 401 logs to reduce console noise for unauthenticated users
                // console.warn("Unauthorized! Maybe session expired or not logged in!");
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
