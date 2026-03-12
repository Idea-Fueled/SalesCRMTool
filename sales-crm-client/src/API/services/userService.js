import API from "../Interceptor";

// Get all users (admin: all, manager: team, rep: self)
export const getTeamUsers = async () => {
    return API.get("/auth/team");
};

// Create a new user (admin only)
export const createUser = async (userData) => {
    return API.post("/auth/register", userData);
};

// Update user details (admin can also change role/managerId)
export const updateUser = async (id, userData) => {
    return API.put(`/auth/${id}`, userData);
};

// Deactivate a user
export const deactivateUser = async (id, data) => {
    return API.patch(`/auth/${id}/deactivate`, data);
};

// Activate (reactivate) a user
export const activateUser = async (id) => {
    return API.patch(`/auth/${id}/activate`);
};

// Change password
export const changePassword = async (id, passwords) => {
    return API.patch(`/auth/${id}/change-password`, passwords);
};

// Admin reset password for another user
export const adminResetPassword = async (id, newPassword) => {
    return API.patch(`/auth/${id}/admin-reset-password`, { newPassword });
};

// Bulk reassign records from one user to another
export const bulkReassignRecords = async (id, newOwnerId) => {
    return API.patch(`/auth/${id}/reassign`, { newOwnerId });
};

// Soft-delete a user (moves to trash, keeps in DB)
export const softDeleteUser = async (id, data) => {
    return API.patch(`/auth/${id}/soft-delete`, data);
};

// Get all soft-deleted users (trash)
export const getDeletedUsers = async () => {
    return API.get("/auth/trash");
};

// Restore a soft-deleted user from trash
export const restoreUser = async (id) => {
    return API.patch(`/auth/${id}/restore`);
};

// Forgot Password
export const forgotPassword = async (email) => {
    return API.post("/auth/forgot-password", { email });
};

// Reset Password
export const resetPassword = async (data) => {
    return API.post("/auth/reset-password", data);
};

// Setup Account Password (Invitation Flow)
export const setupPassword = async (data) => {
    return API.post("/auth/setup-password", data);
};

// Resend Setup Invitation
export const resendInvitation = async (id) => {
    return API.post(`/auth/${id}/resend-invitation`);
};
