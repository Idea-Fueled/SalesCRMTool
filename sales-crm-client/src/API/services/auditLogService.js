import API from "../Interceptor";

export const getAuditLogs = (params) => {
    return API.get("/audit-logs", { params });
};
