import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        entityType: {
            type: String,
            required: true,
            enum: ["User", "Company", "Contact", "Deal"],
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "entityType",
        },
        action: {
            type: String,
            required: true,
            enum: [
                "CREATE",
                "UPDATE",
                "DELETE",
                "DEACTIVATE",
                "ACTIVATE",
                "REASSIGN",
                "PASSWORD_CHANGE",
            ],
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true }
);

// Index for faster queries in Admin Dashboard
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
