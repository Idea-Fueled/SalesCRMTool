import AuditLog from "../models/auditLogSchema.js";

/**
 * Log an action to the AuditLog collection
 * 
 * @param {Object} params
 * @param {string} params.entityType - "User", "Company", "Contact", "Deal"
 * @param {string} params.entityId - ID of the entity being acted upon
 * @param {string} params.action - "CREATE", "UPDATE", "DELETE", "DEACTIVATE", "REASSIGN", etc.
 * @param {string} params.performedBy - User ID of the performer
 * @param {Object} [params.details] - { oldValues, newValues, message }
 * @param {Object} [params.req] - Express request object to capture IP and User Agent
 */
export const logAction = async ({
    entityType,
    entityId,
    action,
    performedBy,
    details = {},
    req = null
}) => {
    try {
        const logData = {
            entityType,
            entityId,
            action,
            performedBy,
            details,
        };

        if (req) {
            logData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            logData.userAgent = req.headers['user-agent'];
        }

        const log = new AuditLog(logData);
        await log.save();
        return log;
    } catch (error) {
        // We don't want to crash the main request if logging fails, but we should know about it
        console.error("Audit Logging Error:", error);
        return null;
    }
};
