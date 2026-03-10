import { Notification } from "../models/notificationSchema.js";
import User from "../models/userSchema.js";
import { emitNotification } from "../utils/socket.js";

/**
 * Sends notifications to the old owner, new owner, and their managers when data is reassigned.
 * @param {Object} oldOwnerId - ID of the user losing data
 * @param {Object} newOwnerId - ID of the user receiving data
 * @param {Object} actorId - ID of the admin/manager performing the action
 * @param {String} entityType - "Deal", "Company", "Contact", or "User"
 * @param {String} entityId - ID of the record being reassigned (if singular) or representative ID
 * @param {String} customMessage - Optional override message
 */
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

        const defaultMessage = `${actorName} reassigned data from ${oldOwnerName} to ${newOwnerName}.`;
        const notificationMessage = customMessage || defaultMessage;

        const notifications = await Promise.all(
            Array.from(recipients).map(async (recipientId) => {
                const notification = await Notification.create({
                    recipientId,
                    senderId: actorId,
                    entityId: entityId || oldOwnerId,
                    entityType,
                    message: notificationMessage,
                    type: "deal_reassigned", // Reusing this type or we can add "reassignment" if needed
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
