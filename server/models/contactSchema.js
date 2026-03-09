import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
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
        lowercase: true
    },
    jobTitle: {
        type: String,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: false
    },
    companyName: {
        type: String,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    phone: {
        type: String
    },
    mobile: {
        type: String
    },
    linkedin: {
        type: String
    },
    notes: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

contactSchema.index({ ownerId: 1 })
contactSchema.index({ companyId: 1 })

export const Contact = mongoose.model("Contact", contactSchema)