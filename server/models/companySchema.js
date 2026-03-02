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
            enum: ["Lead", "Prospect", "Customer", "Churned"],
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
            type: String,
            trim: true
        },
        notes: {
            type: String
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

companySchema.index({ ownerId: 1 });

export const Company = mongoose.model("Company", companySchema);
