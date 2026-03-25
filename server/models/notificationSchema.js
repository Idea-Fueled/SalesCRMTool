import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        senderRole: {
            type: String,
            enum: ["admin", "sales_manager", "sales_rep"]
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        entityType: {
            type: String,
            required: true,
            enum: ["Deal", "Company", "Contact", "User"]
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ["deal_created", "deal_updated", "deal_reassigned", "mention", "system"]
        },
        isRead: {
            type: Boolean,
            default: false
        },
        teamId: {
            type: mongoose.Schema.Types.ObjectId, // Generally the Manager's ID
            ref: "User"
        }
    },
    { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ teamId: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
