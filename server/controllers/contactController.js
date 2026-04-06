import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import { Deal } from "../models/dealSchema.js";
import User from "../models/userSchema.js";
import { scoreContact } from "../utils/rankingService.js";
import { logAction } from "../utils/auditLogger.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../middlewares/uploadMiddleware.js";
import { sendTieredNotification } from "../services/notificationService.js";
import { generateSpecificContactSummary } from "../services/aiService.js";

export const createContact = async (req, res, next) => {
    try {
        const { firstName, lastName, email, jobTitle, companyId, companyName, phone, mobile, linkedin, notes } = req.body
        const { id, role } = req.user;

        // Parse companies array (multi-company support)
        let parsedCompanies = [];
        if (req.body.companies) {
            try {
                parsedCompanies = typeof req.body.companies === 'string'
                    ? JSON.parse(req.body.companies)
                    : req.body.companies;
            } catch (e) {
                parsedCompanies = [];
            }
        }

        // Derive primary company from first entry in companies array (or legacy fields)
        const primaryCompany = parsedCompanies[0] || null;
        const primaryCompanyId = primaryCompany?.companyId || companyId || null;
        const primaryCompanyName = primaryCompany?.companyName || companyName || "";

        if (!firstName || !lastName || !email || !jobTitle || (parsedCompanies.length === 0 && !companyId && !companyName)) {
            return res.status(400).json({
                message: "All required fields must be filled!"
            })
        }

        // Prevent duplicate contacts with the same email address
        const emailNormalized = email.trim().toLowerCase();
        const existingContact = await Contact.findOne({
            $expr: { $eq: [{ $toLower: "$email" }, emailNormalized] }
        });
        if (existingContact) {
            return res.status(409).json({
                message: `A contact with the email "${email.trim()}" already exists.`
            });
        }

        const sanitizedCompanyId = primaryCompanyId && String(primaryCompanyId).trim() !== "" ? primaryCompanyId : null;
        const sanitizedOwnerId = req.body.ownerId && req.body.ownerId.trim() !== "" ? req.body.ownerId : id;

        if (sanitizedCompanyId) {
            const company = await Company.findById(sanitizedCompanyId);

            if (!company) {
                return res.status(404).json({
                    message: "Associated company not found!"
                })
            }

            if (role !== "admin") {
                let teamIds = [];
                if (role === "sales_manager") {
                    const teamUsers = await User.find({ $or: [{ _id: id }, { managerId: id }] }).select("_id");
                    teamIds = teamUsers.map(user => user._id.toString());
                }

                const hasExistingDeal = await Deal.exists({ 
                    companyId: sanitizedCompanyId, 
                    ownerId: role === "sales_manager" ? { $in: teamIds } : id,
                    isDeleted: { $ne: true }
                });

                if (role === "sales_manager") {
                    const isTeamOwned = company.ownerId && teamIds.includes(company.ownerId.toString());
                    if (!isTeamOwned && !hasExistingDeal) {
                        return res.status(403).json({
                            message: "You can only add contacts to your team companies!"
                        })
                    }
                }

                if (role === "sales_rep") {
                    const isOwned = company.ownerId && company.ownerId.toString() === id;
                    if (!isOwned && !hasExistingDeal) {
                        return res.status(403).json({
                            message: "You can only add contacts to your own companies!"
                        })
                    }
                }
            }
        }

        let contactData = {
            firstName,
            lastName,
            email,
            jobTitle,
            companyId: sanitizedCompanyId,
            companyName: primaryCompanyName,
            companies: parsedCompanies,
            ownerId: (role === "admin" || role === "sales_manager") ? sanitizedOwnerId : id,
            phone,
            mobile,
            linkedin,
            notes,
            attachments: []
        };

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file, "contacts/attachments"));
            const uploadedFiles = await Promise.all(uploadPromises);
            contactData.attachments = uploadedFiles.map(file => ({
                ...file,
                uploadedBy: id,
                uploadedByName: `${req.user.firstName} ${req.user.lastName || ""}`.trim(),
                uploadedAt: new Date()
            }));
        }

        const contact = await Contact.create(contactData);

        res.status(201).json({
            message: "Contact created successfully!",
            data: contact
        })

        // Log contact creation
        await logAction({
            entityType: "Contact",
            entityId: contact._id,
            action: "CREATE",
            performedBy: id,
            targetUserId: contact.ownerId?.toString() !== id.toString() ? contact.ownerId : null,
            details: { 
                newValues: contact,
                entityName: `${contact.firstName} ${contact.lastName}`,
                message: contact.ownerId?.toString() !== id.toString()
                    ? `Contact "${contact.firstName} ${contact.lastName}" created and assigned to ownership`
                    : `Contact "${contact.firstName} ${contact.lastName}" created`
            },
            req
        });

        // Tiered Notification (Admins, Owner, Manager)
        await sendTieredNotification({
            actorId: id,
            ownerId: contact.ownerId,
            entityId: contact._id,
            entityType: "Contact",
            entityName: `${contact.firstName} ${contact.lastName}`,
            action: "CREATE"
        });

        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const getContacts = async (req, res, next) => {
    try {

        const { _id: id, role } = req.user;
        const { name, company, jobTitle, createdAfter, createdBefore, page = 1, limit = 10, sort = "-createdAt" } = req.query;

        let filter = { isDeleted: { $ne: true } };
        if (name) {
            filter.$or = [
                { firstName: { $regex: name, $options: "i" } },
                { lastName: { $regex: name, $options: "i" } },
                { jobTitle: { $regex: name, $options: "i" } },
                { email: { $regex: name, $options: "i" } },
                { phone: { $regex: name, $options: "i" } },
                { mobile: { $regex: name, $options: "i" } },
                { companyName: { $regex: name, $options: "i" } },
                { notes: { $regex: name, $options: "i" } }
            ]
        }
        if (jobTitle) {
            filter.jobTitle = { $regex: jobTitle, $options: "i" }
        }
        if (company) {
            const companyDocs = await Company.findOne({ name: { $regex: company, $options: "i" } })
            if (companyDocs) {
                filter.companyId = companyDocs._id
            }
        }

        if (createdAfter || createdBefore) {
            filter.createdAt = {};
            if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
            if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
        }

        let teamIds = [];
        if (role === "sales_manager") {
            const teamUsers = await User.find({ $or: [{ _id: id }, { managerId: id }] }).select("_id");
            teamIds = teamUsers.map(u => u._id);

            // Get contacts linked to team's deals
            const { Deal } = await import("../models/dealSchema.js");
            const teamDeals = await Deal.find({ ownerId: { $in: teamIds }, isDeleted: { $ne: true } }).select("contactId");
            const dealContactIds = teamDeals.map(d => d.contactId).filter(id => id);

            const visibilityFilter = {
                $or: [
                    { ownerId: { $in: teamIds } },
                    { _id: { $in: dealContactIds } }
                ]
            };
            filter = { $and: [filter, visibilityFilter] };
        }

        if (role === "sales_rep") {
            // Get contacts linked to rep's deals
            const { Deal } = await import("../models/dealSchema.js");
            const myDeals = await Deal.find({ ownerId: id, isDeleted: { $ne: true } }).select("contactId");
            const dealContactIds = myDeals.map(d => d.contactId).filter(id => id);

            const visibilityFilter = {
                $or: [
                    { ownerId: id },
                    { _id: { $in: dealContactIds } }
                ]
            };
            filter = { $and: [filter, visibilityFilter] };
        }

        const skip = (page - 1) * limit;
        const contacts = await Contact.find(filter)
            .populate("ownerId", "firstName lastName email profilePicture role")
            .populate("companyId", "name industry")
            .populate("companies.companyId", "name industry")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const { Deal } = await import("../models/dealSchema.js");
        const contactsWithDealCount = await Promise.all(contacts.map(async (c) => {
            let dealFilter = { contactId: c._id, isDeleted: { $ne: true } };
            
            if (role === "sales_rep") {
                dealFilter.ownerId = id;
            } else if (role === "sales_manager") {
                dealFilter.ownerId = { $in: teamIds };
            }

            const count = await Deal.countDocuments(dealFilter);
            return { ...c.toObject(), dealCount: count };
        }));

        const total = await Contact.countDocuments(filter);

        return res.status(200).json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: contactsWithDealCount
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const updateContact = async (req, res, next) => {
    try {

        const { id: userId, role } = req.user;
        const { id } = req.params;

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                message: "Contact not found!"
            })
        }

        if (role !== "admin") {
            let teamIds = [];
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                teamIds = teamUsers.map(user => user._id.toString());
            }

            const hasExistingDeal = await Deal.exists({ 
                contactId: id, 
                ownerId: role === "sales_manager" ? { $in: teamIds } : userId,
                isDeleted: { $ne: true }
            });

            if (role === "sales_manager") {
                const isTeamOwned = contact.ownerId && teamIds.includes(contact.ownerId.toString());
                if (!isTeamOwned && !hasExistingDeal) {
                    return res.status(403).json({
                        message: "You can only update contacts of your team members!"
                    })
                }
            }

            if (role === "sales_rep") {
                const isOwned = contact.ownerId && contact.ownerId.toString() === userId;
                if (!isOwned && !hasExistingDeal) {
                    return res.status(403).json({
                        message: "You can only update your own contacts!"
                    })
                }
            }
        }

        if (req.body.ownerId !== undefined && req.body.ownerId !== contact.ownerId.toString()) {
            if (role === "sales_rep") {
                return res.status(403).json({ message: "Sales representatives cannot reassign contacts!" });
            }
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(u => u._id.toString());
                if (!teamIds.includes(req.body.ownerId.toString())) {
                    return res.status(403).json({ message: "You can only reassign contacts within your team!" });
                }
            }
        }

        // Handle companies array update
        if (req.body.companies !== undefined) {
            try {
                const updatedCompanies = typeof req.body.companies === 'string'
                    ? JSON.parse(req.body.companies)
                    : req.body.companies;
                contact.companies = updatedCompanies;
                // Keep legacy fields in sync
                if (updatedCompanies.length > 0) {
                    contact.companyId = updatedCompanies[0].companyId || null;
                    contact.companyName = updatedCompanies[0].companyName || "";
                }
            } catch (e) { /* ignore parse errors */ }
        }

        const oldOwnerId = contact.ownerId ? contact.ownerId.toString() : null;
        const fields = [
            "firstName", "lastName", "email", "jobTitle", "companyId",
            "ownerId", "phone", "mobile", "linkedin", "notes", "remarks"
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                let value = req.body[field];
                // Sanitize ID fields
                if (["companyId", "ownerId"].includes(field) && typeof value === "string" && value.trim() === "") {
                    value = null;
                }
                contact[field] = value;
            }
        });

        // Handle legacy remarks migration
        if (req.body.remarks !== undefined && typeof req.body.remarks === "string") {
            const authorName = `${req.user.firstName} ${req.user.lastName || ""}`.trim();
            contact.remarks.push({
                text: req.body.remarks,
                author: userId,
                authorName,
                createdAt: new Date()
            });
        }

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file, "contacts/attachments"));
            const uploadedFiles = await Promise.all(uploadPromises);
            const newAttachments = uploadedFiles.map(file => ({
                ...file,
                uploadedBy: userId,
                uploadedByName: `${req.user.firstName} ${req.user.lastName || ""}`.trim(),
                uploadedAt: new Date()
            }));
            contact.attachments.push(...newAttachments);
        }

        await contact.save();

        let reassignedToName = null;
        const newOwnerId = contact.ownerId ? contact.ownerId.toString() : null;
        const ownerChanged = req.body.ownerId !== undefined && newOwnerId !== oldOwnerId;

        if (ownerChanged) {
            const owner = await User.findById(newOwnerId);
            if (owner) reassignedToName = `${owner.firstName} ${owner.lastName}`;
        }

        const aiSummary = await updateContactAiSummaryInternal(id, req.user);

        res.status(200).json({
            message: "Contact updated successfully!",
            data: contact,
            aiSummary: aiSummary || contact.aiSummary
        })

        // Log contact update
        await logAction({
            entityType: "Contact",
            entityId: id,
            action: ownerChanged ? "REASSIGN" : "UPDATE",
            performedBy: userId,
            targetUserId: ownerChanged && newOwnerId !== userId.toString() ? newOwnerId : null,
            details: {
                newValues: req.body,
                entityName: `${contact.firstName} ${contact.lastName}`,
                message: reassignedToName ? `Contact "${contact.firstName} ${contact.lastName}" updated and reassigned to ${reassignedToName}` : `Contact "${contact.firstName} ${contact.lastName}" updated`,
                reassignedToName
            },
            req
        });

        // Tiered Notification (Admins, Owner, Manager)
        await sendTieredNotification({
            actorId: userId,
            ownerId: contact.ownerId,
            entityId: id,
            entityType: "Contact",
            entityName: `${contact.firstName} ${contact.lastName}`,
            action: ownerChanged ? "ASSIGN" : "UPDATE",
            customMessage: reassignedToName ? `Contact "${contact.firstName} ${contact.lastName}" reassigned to ${reassignedToName} by ${req.user.firstName}.` : null
        });

        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}


export const deleteContact = async (req, res, next) => {
    try {

        const { id: userId, role } = req.user;
        const { id } = req.params;

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                message: "Contact not found!"
            })
        }

        if (role !== "admin") {
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(user => user._id.toString());
                if (!teamIds.includes(contact.ownerId.toString())) {
                    return res.status(403).json({
                        message: "You can only delete contacts of your team members!"
                    })
                }
            }
        }

        if (role === "sales_rep") {
            if (contact.ownerId.toString() !== userId) {
                return res.status(403).json({
                    message: "You can only delete your own contacts!"
                })
            }
        }

        contact.isDeleted = true;
        contact.deletedAt = new Date();
        await contact.save();

        res.status(200).json({
            message: "Contact moved to trash successfully!"
        })

        // Log contact deletion
        await logAction({
            entityType: "Contact",
            entityId: id,
            action: "DELETE",
            performedBy: userId,
            details: { message: `Contact "${contact.firstName} ${contact.lastName}" moved to trash.`, oldValues: contact },
            req
        });

        // Tiered Notification (Admins, Owner, Manager)
        await sendTieredNotification({
            actorId: userId,
            ownerId: contact.ownerId,
            entityId: id,
            entityType: "Contact",
            entityName: `${contact.firstName} ${contact.lastName}`,
            action: "DELETE"
        });

        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const getContactById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findById(id)
            .populate("ownerId", "firstName lastName email profilePicture role")
            .populate("companyId", "name industry")
            .populate("companies.companyId", "name industry")
            .populate({
                path: 'remarks.author',
                select: 'firstName lastName email profilePicture'
            });

        if (!contact) {
            return res.status(404).json({ message: "Contact not found!" });
        }

        const { id: userId, role } = req.user;
        const { Deal } = await import("../models/dealSchema.js");
        
        let dealFilter = { contactId: contact._id, isDeleted: { $ne: true } };

        if (role === "sales_rep") {
            dealFilter.ownerId = userId;
        } else if (role === "sales_manager") {
            const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
            const teamIds = teamUsers.map(u => u._id);
            dealFilter.ownerId = { $in: teamIds };
        }

        const dealCount = await Deal.countDocuments(dealFilter);

        // AI Rank calculation
        const { score: aiScore, tier: aiTier } = scoreContact(contact, dealCount);

        res.status(200).json({ 
            data: {
                ...contact.toObject(),
                dealCount,
                aiScore,
                aiTier
            } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const getArchivedContacts = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        let filter = { isDeleted: true };

        if (role === "sales_manager") {
            const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
            const teamIds = teamUsers.map(user => user._id);
            filter.ownerId = { $in: teamIds };
        } else if (role === "sales_rep") {
            filter.ownerId = userId;
        }

        const contacts = await Contact.find(filter)
            .populate("ownerId", "firstName lastName email profilePicture role")
            .populate("companyId", "name")
            .sort({ deletedAt: -1 });

        res.status(200).json({ data: contacts });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const restoreContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const contact = await Contact.findById(id);
        if (!contact) return res.status(404).json({ message: "Contact not found!" });

        if (!contact.isDeleted) return res.status(400).json({ message: "Contact is not in trash!" });

        // Check 30 days
        const deletedAt = new Date(contact.deletedAt);
        const now = new Date();
        const diffDays = Math.ceil((now - deletedAt) / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
            return res.status(400).json({ message: "Restore period expired (30 days max)!" });
        }

        // Permission check
        if (role !== "admin") {
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(u => u._id.toString());
                if (!contact.ownerId || !teamIds.includes(contact.ownerId.toString())) {
                    return res.status(403).json({ message: "Access denied!" });
                }
            } else if (role === "sales_rep") {
                if (!contact.ownerId || contact.ownerId.toString() !== userId) {
                    return res.status(403).json({ message: "Access denied!" });
                }
            }
        }

        contact.isDeleted = false;
        contact.deletedAt = null;
        await contact.save();

        res.status(200).json({ message: "Contact restored successfully!" });

        await logAction({
            entityType: "Contact",
            entityId: id,
            action: "ACTIVATE",
            performedBy: userId,
            details: { message: `Contact "${contact.firstName} ${contact.lastName}" restored from trash.` },
            req
        });

        // Tiered Notification for Restore
        await sendTieredNotification({
            actorId: userId,
            ownerId: contact.ownerId,
            entityId: id,
            entityType: "Contact",
            entityName: `${contact.firstName} ${contact.lastName}`,
            action: "ACTIVATE"
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const deleteRemarkFile = async (req, res) => {
    try {
        const { id, remarkId, fileId } = req.params;
        const { id: userId, role } = req.user;

        const contact = await Contact.findById(id);
        if (!contact) return res.status(404).json({ message: "Contact not found!" });

        const remark = contact.remarks.id(remarkId);
        if (!remark) return res.status(404).json({ message: "Remark not found!" });

        // Security check
        if (remark.author.toString() !== userId.toString() && role !== "admin") {
            return res.status(403).json({ message: "You can only delete your own files!" });
        }

        const file = remark.files.id(fileId);
        if (!file) return res.status(404).json({ message: "File not found!" });

        // Delete from Cloudinary
        if (file.publicId) {
            import("../middlewares/uploadMiddleware.js").then(m => m.deleteFromCloudinary(file.publicId));
        }

        remark.files.pull(fileId);

        // If no text and no files left, remove the entire remark
        if (!remark.text?.trim() && remark.files.length === 0) {
            contact.remarks.pull(remarkId);
        }

        await contact.save();

        res.status(200).json({ message: "File deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const deleteAttachment = async (req, res) => {
    try {
        const { id, fileId } = req.params;
        const { id: userId, role } = req.user;

        const contact = await Contact.findById(id);
        if (!contact) return res.status(404).json({ message: "Contact not found!" });

        const file = contact.attachments.id(fileId);
        if (!file) return res.status(404).json({ message: "File not found!" });

        // Security check
        if (file.uploadedBy.toString() !== userId.toString() && role !== "admin") {
            return res.status(403).json({ message: "You can only delete your own files!" });
        }

        // Delete from Cloudinary
        if (file.publicId) {
            import("../middlewares/uploadMiddleware.js").then(m => m.deleteFromCloudinary(file.publicId));
        }

        contact.attachments.pull(fileId);
        await contact.save();

        res.status(200).json({ message: "Attachment deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const deleteRemark = async (req, res) => {
    try {
        const { id, remarkId } = req.params;
        const { id: userId, role } = req.user;

        const contact = await Contact.findById(id);
        if (!contact) return res.status(404).json({ message: "Contact not found!" });

        const remark = contact.remarks.id(remarkId);
        if (!remark) return res.status(404).json({ message: "Remark not found!" });

        // Security check
        if (remark.author.toString() !== userId.toString() && role !== "admin") {
            return res.status(403).json({ message: "You can only delete your own remarks!" });
        }

        // Cleanup Cloudinary files before removing remark
        if (remark.files && remark.files.length > 0) {
            for (const file of remark.files) {
                if (file.publicId) {
                    await deleteFromCloudinary(file.publicId);
                }
            }
        }

        contact.remarks.pull(remarkId);
        await contact.save();

        const aiSummary = await updateContactAiSummaryInternal(id, req.user);

        res.status(200).json({ message: "Remark deleted successfully!", aiSummary: aiSummary || contact.aiSummary });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const addRemark = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const { id: userId, firstName, lastName } = req.user;

        if (!text && (!req.files || req.files.length === 0)) {
            return res.status(400).json({ message: "Remark text or files are required!" });
        }

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({ message: "Contact not found!" });
        }

        let remarkFiles = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file, "contacts/remarks"));
            remarkFiles = await Promise.all(uploadPromises);
        }

        const authorName = `${firstName} ${lastName || ""}`.trim();
        const newRemark = {
            text,
            files: remarkFiles,
            author: userId,
            authorName,
            createdAt: new Date()
        };

        contact.remarks.push(newRemark);
        await contact.save();

        const savedRemark = contact.remarks[contact.remarks.length - 1];
        await contact.populate({
            path: `remarks.${contact.remarks.length - 1}.author`,
            select: 'firstName lastName email profilePicture'
        });

        const aiSummary = await updateContactAiSummaryInternal(id, req.user);

        res.status(200).json({ 
            message: "Remark added successfully!", 
            data: savedRemark,
            aiSummary: aiSummary || contact.aiSummary
        });

        // Log action
        await logAction({
            entityType: "Contact",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: { message: "Added a new remark", remark: newRemark },
            req
        });

        // Tiered Notification for Remark
        await sendTieredNotification({
            actorId: userId,
            ownerId: contact.ownerId,
            entityId: id,
            entityType: "Contact",
            entityName: `${contact.firstName} ${contact.lastName}`,
            action: "REMARK",
            customMessage: `${authorName} added a remark to Contact "${contact.firstName} ${contact.lastName}": "${text ? text.substring(0, 50) : 'Attached files'}${text && text.length > 50 ? '...' : ''}"`
        });

    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

/**
 * Internal helper to update Contact AI Summary and manage history.
 */
export const updateContactAiSummaryInternal = async (contactId, user) => {
    try {
        const contact = await Contact.findById(contactId)
            .populate("ownerId", "firstName lastName")
            .populate("companyId", "name industry");

        if (!contact) return null;

        const summaryText = await generateSpecificContactSummary(contact);

        // Archive current summary to history if it exists
        if (contact.aiSummary && contact.aiSummary.text) {
            const historyEntry = {
                generatedAt: contact.aiSummary.generatedAt || new Date(),
                generatedBy: contact.aiSummary.generatedBy,
                generatedByName: contact.aiSummary.generatedByName || "System"
            };

            contact.aiSummary.history = contact.aiSummary.history || [];
            contact.aiSummary.history.unshift(historyEntry);

            // Cap history at 20 entries
            if (contact.aiSummary.history.length > 20) {
                contact.aiSummary.history = contact.aiSummary.history.slice(0, 20);
            }
        }

        // Update current summary
        contact.aiSummary = {
            text: summaryText,
            generatedAt: new Date(),
            generatedBy: user._id || user.id,
            generatedByName: `${user.firstName} ${user.lastName || ""}`.trim(),
            history: contact.aiSummary?.history || []
        };

        await contact.save();
        return contact.aiSummary;
    } catch (error) {
        console.error("Error in updateContactAiSummaryInternal:", error);
        return null;
    }
};

/**
 * Endpoint to explicitly trigger a contact summary refresh.
 */
export const generateContactSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const aiSummary = await updateContactAiSummaryInternal(id, req.user);

        if (!aiSummary) {
            return res.status(500).json({ message: "Failed to generate AI summary" });
        }

        res.status(200).json({
            message: "AI Summary generated successfully",
            aiSummary
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};
