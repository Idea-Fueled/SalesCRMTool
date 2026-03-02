import API from "../Interceptor";

export const getDeals = async (params = {}) => {
    return API.get("/deals", { params });
};

export const createDeal = async (dealData) => {
    return API.post("/deals/create", dealData);
};

export const updateDeal = async (id, dealData) => {
    return API.put(`/deals/${id}/update`, dealData);
};

export const deleteDeal = async (id) => {
    return API.delete(`/deals/${id}/delete`);
};

export const updateDealStage = async (id, newStage) => {
    return API.patch(`/deals/${id}/update-stage`, { newStage });
};

export const markDealResult = async (id, result) => {
    return API.patch(`/deals/${id}/result`, { result });
};

export const getDealById = async (id) => {
    return API.get(`/deals/${id}`);
};
