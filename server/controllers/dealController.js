import { Contact } from "../models/contactSchema.js";
import { Deal } from "../models/dealSchema.js";
import User from "../models/userSchema.js";
import { Company } from "../models/companySchema.js";
import { logAction } from "../utils/auditLogger.js";
import { Notification } from "../models/notificationSchema.js";
import { emitNotification } from "../utils/socket.js";

export const createDeal = async (req, res, next) => {
    try {
        const { name, companyId, contactId, companyName, contactName, value, currency, stage, expectedCloseDate, probability, source, notes } = req.body;
        const { id: userId, role } = req.user;

        // Require name, some company ref, some contact ref, value and date
        if (!name || (!companyId && !companyName) || (!contactId && !contactName) || !value || !expectedCloseDate) {
            return res.status(400).json({ message: "All required fields must be filled!" });
        }

        const sanitizedCompanyId = companyId && companyId.trim() !== "" ? companyId : null;
        const sanitizedContactId = contactId && contactId.trim() !== "" ? contactId : null;
        const sanitizedOwnerId = req.body.ownerId && req.body.ownerId.trim() !== "" ? req.body.ownerId : userId;

        let dealData = {
            name, value,
            currency: currency || "USD",
            stage: stage || "Lead",
            expectedCloseDate, probability, source, notes,
            ownerId: (role === "admin" || role === "sales_manager") && req.body.ownerId ? req.body.ownerId : userId,
            stageHistory: [{ stage: stage || "Lead", changedBy: userId }]
        };

        if (sanitizedCompanyId && sanitizedContactId) {
            // ID-based flow — validate against DB
            const company = await Company.findById(sanitizedCompanyId);
            if (!company) return res.status(404).json({ message: "Company not found!" });

            const contact = await Contact.findById(sanitizedContactId);
            if (!contact) return res.status(404).json({ message: "Contact not found!" });

            if (contact.companyId && contact.companyId.toString() !== sanitizedCompanyId) {
                return res.status(400).json({ message: "Contact does not belong to this company!" });
            }

            if (role !== "admin") {
                if (role === "sales_manager") {
                    const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                    const teamIds = teamUsers.map(u => u._id.toString());
                    if (!teamIds.includes(company.ownerId.toString())) {
                        return res.status(403).json({ message: "Access denied!" });
                    }
                }
                if (role === "sales_rep") {
                    if (company.ownerId.toString() !== userId) {
                        return res.status(403).json({ message: "Access denied!" });
                    }
                }
            }

            dealData.companyId = sanitizedCompanyId;
            dealData.contactId = sanitizedContactId;
        } else {
            // Free-text flow — store plain names (sales_rep)
            dealData.companyName = companyName;
            dealData.contactName = contactName;
        }

        const deal = await Deal.create(dealData);
        res.status(201).json({ message: "Deal created successfully!", data: deal });

        // Log deal creation
        await logAction({
            entityType: "Deal",
            entityId: deal._id,
            action: "CREATE",
            performedBy: userId,
            details: { newValues: deal },
            req
        });

        // Create Notification
        const owner = await User.findById(deal.ownerId);
        const notification = await Notification.create({
            recipientId: deal.ownerId,
            senderId: userId,
            entityId: deal._id,
            entityType: "Deal",
            type: "deal_created",
            message: `New deal "${deal.name}" has been created and assigned to you.`,
            teamId: owner?.managerId || (role === "sales_manager" ? userId : null)
        });
        emitNotification(notification);

        return;

    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const updateDealInformation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const deal = await Deal.findById(id);

        if (!deal) {
            return res.status(404).json({
                message: "Deal not found!"
            })
        }

        if (role !== "admin") {
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id")
                const teamIds = teamUsers.map(user => user._id.toString());
                if (!teamIds.includes(deal.ownerId.toString())) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }

            if (role === "sales_rep") {
                if (deal.ownerId.toString() !== userId) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }
        }

        const allowedStages = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

        if (req.body.stage && req.body.stage !== deal.stage) {
            if (!allowedStages.includes(req.body.stage)) {
                return res.status(400).json({ message: "Invalid Stage!" });
            }
            deal.stageHistory.push({
                stage: req.body.stage,
                changedBy: userId
            });
            if (req.body.stage === "Closed Won") deal.probability = 100;
            if (req.body.stage === "Closed Lost") deal.probability = 0;
        }

        if (req.body.contactId && req.body.companyId) {
            const contact = await Contact.findById(req.body.contactId);

            if (!contact || (contact.companyId && contact.companyId.toString() !== req.body.companyId)) {
                return res.status(400).json({
                    message: "Contact does not belong to this company!"
                })
            }
        }

        if (req.body.ownerId !== undefined && req.body.ownerId !== deal.ownerId.toString()) {
            if (role === "sales_rep") {
                return res.status(403).json({ message: "Sales representatives cannot reassign deals!" });
            }
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(u => u._id.toString());
                if (!teamIds.includes(req.body.ownerId.toString())) {
                    return res.status(403).json({ message: "You can only reassign deals within your team!" });
                }
            }
        }

        const fields = [
            "name", "companyId", "contactId", "value", "currency",
            "stage", "expectedCloseDate", "probability", "source", "notes", "ownerId"
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                let value = req.body[field];
                // Sanitize ID fields
                if (["companyId", "contactId", "ownerId"].includes(field) && typeof value === "string" && value.trim() === "") {
                    value = null;
                }
                deal[field] = value;
            }
        });

        await deal.save();

        let reassignedToName = null;
        if (req.body.ownerId) {
            const owner = await User.findById(req.body.ownerId);
            if (owner) reassignedToName = `${owner.firstName} ${owner.lastName}`;
        }

        res.status(200).json({
            message: "Deal updated successfuly!",
            data: deal
        })

        // Log deal update
        await logAction({
            entityType: "Deal",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: {
                newValues: req.body,
                message: reassignedToName ? `Deal updated and reassigned to ${reassignedToName}` : `Deal updated`,
                reassignedToName
            },
            req
        });

        // Notification for reassignment
        if (req.body.ownerId && req.body.ownerId !== deal.ownerId.toString()) {
            const newOwner = await User.findById(req.body.ownerId);
            const notification = await Notification.create({
                recipientId: req.body.ownerId,
                senderId: userId,
                entityId: deal._id,
                entityType: "Deal",
                type: "deal_reassigned",
                message: `Deal "${deal.name}" has been reassigned to you.`,
                teamId: newOwner?.managerId || null
            });
            emitNotification(notification);
        } else if (req.body.stage && req.body.stage !== deal.stage) {
            // Notification for stage change
            const owner = await User.findById(deal.ownerId);
            const notification = await Notification.create({
                recipientId: deal.ownerId,
                senderId: userId,
                entityId: deal._id,
                entityType: "Deal",
                type: "deal_updated",
                message: `Deal "${deal.name}" stage updated to ${req.body.stage}.`,
                teamId: owner?.managerId || null
            });
            emitNotification(notification);
        }

        return;


    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const moveDealStage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;
        const { newStage } = req.body;

        const allowedStages = [
            "Lead",
            "Qualified",
            "Proposal",
            "Negotiation",
            "Closed Won",
            "Closed Lost"
        ]

        if (!newStage || !allowedStages.includes(newStage)) {
            return res.status(400).json({
                message: "Invalid Stage!"
            })
        }

        const deal = await Deal.findById(id);

        if (!deal) {
            return res.status(404).json({
                message: "Deal not found!"
            })
        }

        if (role !== "admin") {
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(user => user._id.toString())

                if (!teamIds.includes(deal.ownerId.toString())) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }

            if (role === "sales_rep") {
                if (deal.ownerId.toString() !== userId) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }
        }

        if (deal.stage === newStage) {
            return res.status(400).json({
                message: "Deal is already in this stage!"
            })
        }

        //update
        deal.stage = newStage;

        deal.stageHistory.push({
            stage: newStage,
            changedBy: userId
        })

        await deal.save();

        res.status(200).json({
            message: "Deal stage updated successfully!",
            data: deal
        })

        // Log stage move
        await logAction({
            entityType: "Deal",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: { message: `Stage moved to ${newStage}`, newStage },
            req
        });

        // Create Notification
        const owner = await User.findById(deal.ownerId);
        const notification = await Notification.create({
            recipientId: deal.ownerId,
            senderId: userId,
            entityId: deal._id,
            entityType: "Deal",
            type: "deal_updated",
            message: `Deal "${deal.name}" moved to ${newStage}.`,
            teamId: owner?.managerId || null
        });
        emitNotification(notification);

        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

//mark deal as won or lost
export const markDealResult = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { result } = req.body;
        const { role, id: userId } = req.user

        const allowedResults = [
            "Closed Won",
            "Closed Lost"
        ]

        if (!allowedResults.includes(result)) {
            return res.status(400).json({
                message: "Invalid result!"
            })
        }

        const deal = await Deal.findById(id);

        if (!deal) {
            return res.status(404).json({
                message: "Deal not found!"
            })
        }

        if (role !== "admin") {
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id")
                const teamIds = teamUsers.map(user => user._id.toString());
                if (!teamIds.includes(deal.ownerId.toString())) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }

            if (role === "Sales_rep") {
                if (deal.ownerId.toString() !== userId) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }
        }

        if (deal.stage === "Closed Won" || deal.stage === "Closed Lost") {
            return res.status(400).json({
                message: "Deal already closed!"
            })
        }

        deal.stage = result;
        deal.probability = result === "Closed Won" ? 100 : 0

        deal.stageHistory.push({
            stage: result,
            changedBy: userId
        })

        await deal.save();

        res.status(200).json({
            message: `Deal marked as ${result}`,
            data: deal
        })

        // Log result
        await logAction({
            entityType: "Deal",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: { message: `Deal marked as ${result}`, result },
            req
        });
        return;


    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const deleteDeal = async (req, res, next) => {
    try {

        const { id } = req.params;
        const { role, id: userId } = req.user;

        const deal = await Deal.findById(id);

        if (!deal) {
            return res.status(404).json({
                message: "Deal not found!"
            })
        }

        if (role !== "admin") {
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(user => user._id.toString());
                if (!teamIds.includes(deal.ownerId.toString())) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }
            if (role === "sales_rep") {
                if (deal.ownerId.toString() !== userId) {
                    return res.status(403).json({
                        message: "Access denied!"
                    })
                }
            }
        }

        deal.isDeleted = true;
        deal.deletedAt = new Date();
        await deal.save();

        res.status(200).json({
            message: "Deal moved to trash successfully!"
        })

        // Log deletion
        await logAction({
            entityType: "Deal",
            entityId: id,
            action: "DELETE",
            performedBy: userId,
            details: { message: `Deal "${deal.name}" moved to trash.`, oldValues: deal },
            req
        });
        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const getDeals = async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        const { name, stage, minValue, maxValue, startDate, endDate, owner, page = 1, limit = 10, sort = "-createdAt" } = req.query;

        let filter = { isDeleted: { $ne: true } }

        if (name) filter.name = { $regex: name, $options: "i" };

        if (stage) {
            filter.stage = stage
        }

        if (minValue || maxValue) {
            filter.value = {};
            if (minValue) filter.value.$gte = Number(minValue)
            if (maxValue) filter.value.$lte = Number(maxValue)
        }
        if (startDate || endDate) {
            filter.expectedCloseDate = {};
            if (startDate) filter.expectedCloseDate.$gte = new Date(startDate);
            if (endDate) filter.expectedCloseDate.$lte = new Date(endDate);
        }

        if (owner && role === "admin") {
            filter.ownerId = owner;
        }
        if (role === "sales_manager") {
            const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
            const teamIds = teamUsers.map(user => user._id.toString());
            filter.ownerId = { $in: teamIds };
        }

        if (role === "sales_rep") {
            filter.ownerId = userId;
        }

        //pagination
        const skip = (page - 1) * limit;
        const deals = await Deal.find(filter)
            .populate("ownerId", "firstName email")
            .populate("companyId", "name industry")
            .populate("contactId", "firstName lastName email")
            .populate({
                path: 'stageHistory.changedBy',
                select: 'firstName lastName email'
            })
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Deal.countDocuments(filter);

        return res.status(200).json({
            message: "Deals fetched successfully!",
            data: deals,
            totalPages: Math.ceil(total / Number(limit)),
            total: total,
            page: Number(page),
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const getDealById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deal = await Deal.findById(id)
            .populate("ownerId", "firstName lastName email")
            .populate("companyId", "name industry size website address phone")
            .populate("contactId", "firstName lastName email jobTitle phone mobile linkedin")
            .populate({
                path: 'stageHistory.changedBy',
                select: 'firstName lastName email'
            });

        if (!deal) {
            return res.status(404).json({ message: "Deal not found!" });
        }

        res.status(200).json({ data: deal });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const getArchivedDeals = async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

        const deals = await Deal.find({ isDeleted: true })
            .populate("ownerId", "firstName lastName email")
            .populate("companyId", "name")
            .populate("contactId", "firstName lastName")
            .sort({ deletedAt: -1 });

        res.status(200).json({ data: deals });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const restoreDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

        const deal = await Deal.findById(id);
        if (!deal) return res.status(404).json({ message: "Deal not found!" });

        if (!deal.isDeleted) return res.status(400).json({ message: "Deal is not in trash!" });

        // Check 30 days
        const deletedAt = new Date(deal.deletedAt);
        const now = new Date();
        const diffDays = Math.ceil((now - deletedAt) / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
            return res.status(400).json({ message: "Restore period expired (30 days max)!" });
        }

        deal.isDeleted = false;
        deal.deletedAt = null;
        await deal.save();

        res.status(200).json({ message: "Deal restored successfully!" });

        await logAction({
            entityType: "Deal",
            entityId: id,
            action: "ACTIVATE",
            performedBy: userId,
            details: { message: `Deal "${deal.name}" restored from trash.` },
            req
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};
