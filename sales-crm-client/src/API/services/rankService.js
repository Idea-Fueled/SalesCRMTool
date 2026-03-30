import API from "../Interceptor";

export const getRankedDeals = async (params = {}) => {
    return API.get("/rank/deals", { params });
};

export const getRankedCompanies = async (params = {}) => {
    return API.get("/rank/companies", { params });
};

export const getRankedContacts = async (params = {}) => {
    return API.get("/rank/contacts", { params });
};
