import API from "../Interceptor";

export const getContacts = async (params = {}) => {
    return API.get("/contacts", { params });
};

export const createContact = (data) => API.post("/contacts/create", data);
export const updateContact = (id, data) => API.put(`/contacts/update/${id}`, data);
export const addRemark = (id, data) => API.post(`/contacts/${id}/add-remark`, data);

export const deleteContact = async (id) => {
    return API.delete(`/contacts/delete/${id}`);
};

export const getContactById = async (id) => {
    return API.get(`/contacts/${id}`);
};

export const getArchivedContacts = async () => {
    return API.get("/contacts/archived");
};

export const restoreContact = async (id) => {
    return API.patch(`/contacts/restore/${id}`);
};
