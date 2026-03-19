import API from "../Interceptor";

export const getCompanies = async (params = {}, signal) => {
    return API.get("/companies", { params, signal });
};

export const createCompany = (data) => API.post("/companies/create", data);
export const updateCompany = (id, data) => API.put(`/companies/${id}`, data);
export const addRemark = (id, data) => API.post(`/companies/${id}/add-remark`, data);

export const deleteCompany = async (id) => {
    return API.delete(`/companies/${id}`);
};

export const changeCompanyOwnership = async (id, newOwnerId) => {
    return API.patch(`/companies/${id}/change-owner`, { newOwnerId });
};

export const getCompanyById = async (id) => {
    return API.get(`/companies/${id}`);
};

export const getArchivedCompanies = async () => {
    return API.get("/companies/archived");
};

export const restoreCompany = async (id) => {
    return API.patch(`/companies/${id}/restore`);
};

export const deleteRemarkFile = async (id, remarkId, fileId) => {
    return API.delete(`/companies/${id}/remarks/${remarkId}/files/${fileId}`);
};

export const deleteAttachment = async (id, fileId) => {
    return API.delete(`/companies/${id}/attachments/${fileId}`);
};

export const deleteRemark = async (id, remarkId) => {
    return API.delete(`/companies/${id}/remarks/${remarkId}`);
};
