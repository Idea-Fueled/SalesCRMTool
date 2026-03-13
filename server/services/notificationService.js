import { Notification } from "../models/notificationSchema.js";
import User from "../models/userSchema.js";
import { emitNotification } from "../utils/socket.js";

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

/**
 * Sends hierarchical notifications for CREATE, UPDATE, DELETE actions.
 * Hierarchy:
 * - Rep actions notify direct Manager AND all Admins.
 * - Manager actions notify all Admins.
 * - Admin actions: No hierarchical notification.
 */
export const sendHierarchyNotification = async ({
    actorId,
    entityId,
    entityType,
    entityName,
    action, // "CREATE", "UPDATE", "DELETE"
    customMessage
}) => {
    try {
        const actor = await User.findById(actorId);
        if (!actor) return;

        const actorRole = actor.role;
        const actorName = `${actor.firstName} ${actor.lastName}`;
        const recipients = new Set();

        // 1. Determine Recipients based on Role
        if (actorRole === "sales_rep") {
            // Rep -> Manager
            if (actor.managerId) {
                recipients.add(actor.managerId.toString());
            }
            // Rep -> All Admins
            const admins = await User.find({ role: "admin", isActive: true }).select("_id");
            admins.forEach(admin => recipients.add(admin._id.toString()));
        } else if (actorRole === "sales_manager") {
            // Manager -> All Admins
            const admins = await User.find({ role: "admin", isActive: true }).select("_id");
            admins.forEach(admin => recipients.add(admin._id.toString()));
        }

        // Remove actor from recipients if they are an admin or manager themselves (though hierarchy usually prevents this)
        recipients.delete(actorId.toString());

        if (recipients.size === 0) return;

        // 2. Format Message
        const actionVerb = action === "CREATE" ? "created" : 
                           action === "UPDATE" ? "updated" : 
                           action === "DELETE" ? "deleted" : action.toLowerCase();
        
        const defaultMessage = `${actorName} ${actionVerb} ${entityType} "${entityName}".`;
        const notificationMessage = customMessage || defaultMessage;

        const typeMap = {
            "Deal": "deal_updated",
            "Company": "system",
            "Contact": "system"
        };
        if (action === "CREATE") typeMap["Deal"] = "deal_created";

        // 3. Create and Emit Notifications
        const notifications = await Promise.all(
            Array.from(recipients).map(async (recipientId) => {
                const notification = await Notification.create({
                    recipientId,
                    senderId: actorId,
                    entityId,
                    entityType,
                    message: notificationMessage,
                    type: typeMap[entityType] || "system",
                    teamId: (recipientId === actor.managerId?.toString()) ? actor.managerId : null
                });
                
                emitNotification(notification);
                return notification;
            })
        );

        console.log(`[notificationService] Created ${notifications.length} hierarchical notifications for ${action} ${entityType}.`);

    } catch (error) {
        console.error("❌ Notification Service Error (sendHierarchyNotification):", error);
    }
};
