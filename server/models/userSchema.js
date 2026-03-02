import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: false, // Changed for invitation flow
        minLength: 6,
        select: false
    },
    role: {
        type: String,
        required: true,
        enum: ["admin", "sales_manager", "sales_rep"],
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isSetupComplete: {
        type: Boolean,
        default: false
    },
    invitationToken: {
        type: String,
        default: null
    },
    invitationExpiry: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpiry: {
        type: Date,
        default: null
    }
}, { timestamps: true })

userSchema.index({ managerId: 1 })

const User = mongoose.model("User", userSchema)

export default User