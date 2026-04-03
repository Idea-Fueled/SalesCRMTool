import { Notification } from "../models/notificationSchema.js";
import User from "../models/userSchema.js";
import { emitNotification } from "../utils/socket.js";
import { sendNotificationEmail } from "./emailService.js";

export const notifyReassignment = async ({
    oldOwnerId,
    newOwnerId,
    actorId,
    entityType = "User",
    entityId,
    customMessage
}) => {
    try {
        const [oldOwner, newOwner, actor] = await Promise.all([
            User.findById(oldOwnerId),
            User.findById(newOwnerId),
            User.findById(actorId)
        ]);

        if (!oldOwner || !newOwner) return;

        const actorName = actor ? `${actor.firstName} ${actor.lastName}` : "An administrator";
        const oldOwnerName = `${oldOwner.firstName} ${oldOwner.lastName}`;
        const newOwnerName = `${newOwner.firstName} ${newOwner.lastName}`;

        const recipients = new Set();
        
        // Add direct parties if they are active
        if (oldOwner.isActive) recipients.add(oldOwnerId.toString());
        if (newOwner.isActive) recipients.add(newOwnerId.toString());

        // Add Managers
        if (oldOwner.managerId) recipients.add(oldOwner.managerId.toString());
        if (newOwner.managerId) recipients.add(newOwner.managerId.toString());
        
        // Remove actor from recipients if they are one of the parties (self-notification is redundant)
        recipients.delete(actorId.toString());

        const defaultMessage = `${actorName} reassigned data from ${oldOwnerName} to ${newOwnerName}.`;
        const notificationMessage = customMessage || defaultMessage;

        const notifications = await Promise.all(
            Array.from(recipients).map(async (recipientId) => {
                const notification = await Notification.create({
                    recipientId,
                    senderId: actorId,
                    senderRole: actor?.role,
                    entityId: entityId || oldOwnerId,
                    entityType,
                    message: notificationMessage,
                    type: "deal_reassigned", 
                    teamId: (recipientId === oldOwner.managerId?.toString()) ? oldOwner.managerId : 
                            (recipientId === newOwner.managerId?.toString()) ? newOwner.managerId : null
                });
                
                // Emit via socket
                emitNotification(notification);
                return notification;
            })
        );

        console.log(`[notificationService] Created ${notifications.length} hierarchy notifications for reassignment.`);
        return notifications;

    } catch (error) {
        console.error("❌ Notification Service Error (notifyReassignment):", error);
    }
};

/**
 * Sends tiered notifications (Admin + Owner + Owner's Manager)
 * Also sends email notifications to the same recipients.
 */
export const sendTieredNotification = async ({
    actorId,
    ownerId,
    entityId,
    entityType,
    entityName,
    action, // "CREATE", "UPDATE", "DELETE", "ASSIGN", "STAGE_CHANGE", "REMARK", "DEACTIVATE", "ACTIVATE"
    customMessage,
    type // Optional: override notification type
}) => {
    try {
        const actor = await User.findById(actorId);
        if (!actor) return;

        const actorName = `${actor.firstName} ${actor.lastName}`;
        const recipientIds = new Set();
        const recipientEmails = new Map(); // ID -> Email

        // 1. Add ALL active Admins
        const admins = await User.find({ role: "admin", isActive: true }).select("_id email");
        admins.forEach(admin => {
            recipientIds.add(admin._id.toString());
            recipientEmails.set(admin._id.toString(), admin.email);
        });

        // 2. Add Owner and Owner's Manager
        if (ownerId) {
            const owner = await User.findById(ownerId).select("_id email managerId isActive");
            if (owner && owner.isActive) {
                recipientIds.add(ownerId.toString());
                recipientEmails.set(ownerId.toString(), owner.email);
                
                if (owner.managerId) {
                    const manager = await User.findById(owner.managerId).select("_id email isActive");
                    if (manager && manager.isActive) {
                        recipientIds.add(manager._id.toString());
                        recipientEmails.set(manager._id.toString(), manager.email);
                    }
                }
            }
        }

        // 3. Remove Actor from recipients (prevent self-notification)
        recipientIds.delete(actorId.toString());
        recipientEmails.delete(actorId.toString());

        if (recipientIds.size === 0) return;

        // 4. Format Message
        const actionVerb = action === "CREATE" ? "created" : 
                           action === "UPDATE" ? "updated" : 
                           action === "DELETE" ? "deleted" : 
                           action === "ASSIGN" ? "assigned" : 
                           action === "STAGE_CHANGE" ? "moved stage for" :
                           action === "REMARK" ? "added a remark to" :
                           action === "DEACTIVATE" ? "deactivated" :
                           action === "ACTIVATE" ? "activated" : action.toLowerCase();
        
        const defaultMessage = `${actorName} ${actionVerb} ${entityType} "${entityName || 'record'}".`;
        const notificationMessage = customMessage || defaultMessage;

        // Determine Notification Type
        const typeMap = {
            "Deal": "deal_updated",
            "Company": "system",
            "Contact": "system",
            "User": "system"
        };
        if (action === "CREATE" && entityType === "Deal") typeMap["Deal"] = "deal_created";
        if (action === "ASSIGN") typeMap["Deal"] = "deal_reassigned";

        const notificationType = type || typeMap[entityType] || "system";

        // 5. Create, Emit, and Email
        let emailSubject = `${entityType} Updated`;
        if (action === "CREATE") emailSubject = `New ${entityType} Created`;
        else if (action === "DELETE") emailSubject = `${entityType} Deleted`;
        else if (action === "ASSIGN") emailSubject = `${entityType} Reassigned`;
        else if (action === "STAGE_CHANGE") emailSubject = `${entityType} Stage Updated`;
        else if (action === "REMARK") emailSubject = `New Remark on ${entityType}`;
        else if (action === "DEACTIVATE") emailSubject = `${entityType} Deactivated`;
        else if (action === "ACTIVATE") emailSubject = `${entityType} Activated`;

        await Promise.all(
            Array.from(recipientIds).map(async (recipientId) => {
                // In-app Notification
                const notification = await Notification.create({
                    recipientId,
                    senderId: actorId,
                    senderRole: actor?.role,
                    entityId,
                    entityType,
                    message: notificationMessage,
                    type: notificationType
                });
                emitNotification(notification);

                // Email Notification
                const email = recipientEmails.get(recipientId);
                if (email) {
                    sendNotificationEmail(email, emailSubject, notificationMessage);
                }

                return notification;
            })
        );

        console.log(`[notificationService] Created ${recipientIds.size} tiered notifications and sent emails for ${action} ${entityType}.`);

    } catch (error) {
        console.error("❌ Notification Service Error (sendTieredNotification):", error);
    }
};

/**
 * Sends hierarchical notifications for CREATE, UPDATE, DELETE actions.
 * @deprecated Use sendTieredNotification for consistent Admin+Owner+Manager coverage.
 */
export const sendHierarchyNotification = async ({
    actorId,
    entityId,
    entityType,
    entityName,
    action,
    customMessage
}) => {
    // Fallback to tiered notification
    return sendTieredNotification({
        actorId,
        entityId,
        entityType,
        entityName,
        action,
        customMessage
    });
};
