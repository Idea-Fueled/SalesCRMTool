import API from "../Interceptor";

export const getAuditLogs = (params) => {
    return API.get("/activity-history", { params });
};
