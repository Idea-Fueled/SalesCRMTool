import API from "../Interceptor";

export const getCompanies = async (params = {}) => {
    return API.get("/companies", { params });
};

export const createCompany = async (companyData) => {
    return API.post("/companies/create", companyData);
};

export const updateCompany = async (id, companyData) => {
    return API.put(`/companies/${id}`, companyData);
};

export const deleteCompany = async (id) => {
    return API.delete(`/companies/${id}`);
};

export const changeCompanyOwnership = async (id, newOwnerId) => {
    return API.patch(`/companies/${id}/change-owner`, { newOwnerId });
};

export const getCompanyById = async (id) => {
    return API.get(`/companies/${id}`);
};
