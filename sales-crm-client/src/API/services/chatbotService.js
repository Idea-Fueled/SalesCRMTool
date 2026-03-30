import API from "../Interceptor";

export const sendChatMessage = async (message) => {
    return API.post("/chatbot", { message });
};
