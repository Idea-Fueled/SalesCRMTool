import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        industry: {
            type: String,
            trim: true
        },
        size: {
            type: String,
            enum: ["1-10", "11-50", "51-200", "201-500", "500+"]
        },
        website: {
            type: String,
            trim: true
        },
        primaryContact: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ["Active", "Inactive", "Prospect"],
            default: "Prospect"
        },
        address: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        revenueRange: {
            type: Number,
            default: 0
        },
        notes: {
            type: String
        },
        remarks: [
            {
                text: String,
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
                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

companySchema.index({ ownerId: 1 });

export const Company = mongoose.model("Company", companySchema);
