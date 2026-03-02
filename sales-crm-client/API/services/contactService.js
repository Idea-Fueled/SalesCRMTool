import API from "../Interceptor";

export const getContacts = async (params = {}) => {
    return API.get("/contacts", { params });
};

export const createContact = async (contactData) => {
    return API.post("/contacts/create", contactData);
};

export const updateContact = async (id, contactData) => {
    return API.put(`/contacts/update/${id}`, contactData);
};

export const deleteContact = async (id) => {
    return API.delete(`/contacts/delete/${id}`);
};

export const getContactById = async (id) => {
    return API.get(`/contacts/${id}`);
};
