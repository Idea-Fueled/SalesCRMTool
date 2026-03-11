import API from "../Interceptor";

export const getDeals = async (params = {}) => {
    return API.get("/deals", { params });
};

export const createDeal = async (dealData) => {
    // Check if dealData is FormData, if not, it will be the original object
    return API.post("/deals/create", dealData);
};

export const updateDeal = async (id, dealData) => {
    return API.put(`/deals/${id}/update`, dealData);
};

export const addRemark = async (id, remarkData) => {
    return API.post(`/deals/${id}/add-remark`, remarkData);
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

export const getArchivedDeals = async () => {
    return API.get("/deals/archived");
};

export const restoreDeal = async (id) => {
    return API.patch(`/deals/${id}/restore`);
};
