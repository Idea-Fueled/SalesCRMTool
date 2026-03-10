import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import User from "../models/userSchema.js";
import { logAction } from "../utils/auditLogger.js";

export const createContact = async (req, res, next) => {
    try {
        const { firstName, lastName, email, jobTitle, companyId, companyName, phone, mobile, linkedin, notes } = req.body
        const { id, role } = req.user;

        if (!firstName || !lastName || !email || !jobTitle || (!companyId && !companyName)) {
            return res.status(400).json({
                message: "All required fields must be filled!"
            })
        }

        const sanitizedCompanyId = companyId && companyId.trim() !== "" ? companyId : null;
        const sanitizedOwnerId = req.body.ownerId && req.body.ownerId.trim() !== "" ? req.body.ownerId : id;

        if (sanitizedCompanyId) {
            const company = await Company.findById(sanitizedCompanyId);

            if (!company) {
                return res.status(404).json({
                    message: "Associated company not found!"
                })
            }

            if (role !== "admin") {
                if (role === "sales_manager") {
                    const teamUsers = await User.find({ $or: [{ _id: id }, { managerId: id }] }).select("_id");
                    const teamIds = teamUsers.map(user => user._id.toString());

                    if (!teamIds.includes(company.ownerId.toString())) {
                        return res.status(403).json({
                            message: "You can only add contacts to your team companies!"
                        })
                    }
                }
            }

            if (role === "sales_rep") {
                if (company.ownerId.toString() !== id) {
                    return res.status(403).json({
                        message: "You can only add contacts to your own companies!"
                    })
                }
            }
        }

        const contact = await Contact.create({
            firstName,
            lastName,
            email,
            jobTitle,
            companyId: sanitizedCompanyId,
            companyName,
            ownerId: (role === "admin" || role === "sales_manager") ? sanitizedOwnerId : id,
            phone,
            mobile,
            linkedin,
            notes
        })

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
            details: { newValues: contact },
            req
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

        const { id, role } = req.user;
        const { name, company, jobTitle, page = 1, limit = 10, sort = "-createdAt" } = req.query;

        let filter = { isDeleted: { $ne: true } };
        if (name) {
            filter.$or = [
                { firstName: { $regex: name, $options: "i" } },
                { lastName: { $regex: name, $options: "i" } }
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

        if (role === "sales_manager") {
            const teamUsers = await User.find({ $or: [{ _id: id }, { managerId: id }] }).select("_id");
            const teamIds = teamUsers.map(user => user._id.toString());
            filter.ownerId = { $in: teamIds }
        }

        if (role === "sales_rep") {
            filter.ownerId = id;
        }

        const skip = (page - 1) * limit;
        const contacts = await Contact.find(filter).populate("ownerId", 'firstName email').populate("companyId", "name industry").sort(sort).skip(skip).limit(Number(limit));

        const total = await Contact.countDocuments(filter);

        return res.status(200).json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: contacts
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
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(user => user._id.toString());
                if (!teamIds.includes(contact.ownerId.toString())) {
                    return res.status(403).json({
                        message: "You can only update contacts of your team members!"
                    })
                }
            }
        }

        if (role === "sales_rep") {
            if (contact.ownerId.toString() !== userId) {
                return res.status(403).json({
                    message: "You can only update your own contacts!"
                })
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

        await contact.save();

        let reassignedToName = null;
        if (req.body.ownerId) {
            const owner = await User.findById(req.body.ownerId);
            if (owner) reassignedToName = `${owner.firstName} ${owner.lastName}`;
        }

        res.status(200).json({
            message: "Contact updated successfully!",
            data: contact
        })

        // Log contact update
        await logAction({
            entityType: "Contact",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: {
                newValues: req.body,
                message: reassignedToName ? `Contact updated and reassigned to ${reassignedToName}` : `Contact updated`,
                reassignedToName
            },
            req
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
            .populate("ownerId", "firstName lastName email")
            .populate("companyId", "name industry");

        if (!contact) {
            return res.status(404).json({ message: "Contact not found!" });
        }

        res.status(200).json({ data: contact });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const getArchivedContacts = async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

        const contacts = await Contact.find({ isDeleted: true })
            .populate("ownerId", "firstName lastName email")
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
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

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
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};
