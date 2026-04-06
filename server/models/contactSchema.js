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
        required: true,
        trim: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: false
    },
    companyName: {
        type: String,
        trim: true,
        required: false
    },
    // Multi-company support
    companies: [
        {
            companyId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Company"
            },
            companyName: {
                type: String,
                trim: true
            }
        }
    ],
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
    remarks: [
        {
            text: { type: String },
            files: [
                {
                    url: String,
                    publicId: String,
                    fileName: String,
                    fileType: String
                }
            ],
            author: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            authorName: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    attachments: [
        {
            url: String,
            publicId: String,
            fileName: String,
            fileType: String,
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            uploadedByName: String,
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    aiSummary: {
        text: String,
        generatedAt: Date,
        generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        generatedByName: String,
        history: [
            {
                generatedAt: Date,
                generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                generatedByName: String
            }
        ]
    }
}, { timestamps: true })

contactSchema.index({ ownerId: 1 })
contactSchema.index({ companyId: 1 })

export const Contact = mongoose.model("Contact", contactSchema)