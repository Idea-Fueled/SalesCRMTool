import API from "../Interceptor";

export const getContacts = async (params = {}, signal) => {
    return API.get("/contacts", { params, signal });
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

export const deleteRemarkFile = async (id, remarkId, fileId) => {
    return API.delete(`/contacts/${id}/remarks/${remarkId}/files/${fileId}`);
};

export const deleteAttachment = async (id, fileId) => {
    return API.delete(`/contacts/${id}/attachments/${fileId}`);
};

export const deleteRemark = async (id, remarkId) => {
    return API.delete(`/contacts/${id}/remarks/${remarkId}`);
};
