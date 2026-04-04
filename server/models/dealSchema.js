import mongoose from "mongoose";

const stageEnum = [
    "Lead",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost"
];

const stageHistorySchema = new mongoose.Schema(
    {
        stage: {
            type: String,
            enum: stageEnum,
            required: true
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { _id: false }
);

const dealSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company"
        },

        companyName: {
            type: String
        },

        contactId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact"
        },

        contactName: {
            type: String
        },

        value: {
            type: Number,
            required: true
        },

        currency: {
            type: String,
            required: true,
            default: "USD"
        },

        stage: {
            type: String,
            enum: stageEnum,
            required: true,
            default: "Lead"
        },

        expectedCloseDate: {
            type: Date,
            required: true
        },

        probability: {
            type: Number,
            min: 0,
            max: 100
        },

        source: {
            type: String
        },

        notes: {
            type: String
        },

        remarks: {
            type: [{
                text: { type: String },
                files: [{
                    url: String,
                    publicId: String,
                    fileName: String,
                    fileType: String
                }],
                author: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                authorName: { type: String },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            default: []
        },

        attachments: [{
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
        }],

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        stageHistory: {
            type: [stageHistorySchema],
            default: []
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        aiSummary: {
            text: { type: String },
            generatedAt: { type: Date }
        }
    },
    { timestamps: true }
);

dealSchema.index({ ownerId: 1 });
dealSchema.index({ stage: 1 });
dealSchema.index({ expectedCloseDate: 1 });
dealSchema.index({ companyId: 1 });
dealSchema.index({ contactId: 1 });

export const Deal = mongoose.model("Deal", dealSchema);
