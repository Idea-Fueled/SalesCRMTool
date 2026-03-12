import { Company } from "../models/companySchema.js";
import User from "../models/userSchema.js";
import { logAction } from "../utils/auditLogger.js";
import { uploadToCloudinary } from "../middlewares/uploadMiddleware.js";

export const createCompany = async (req, res) => {
    try {
        const {
            name,
            industry,
            size,
            website,
            primaryContact,
            status,
            address,
            phone,
            revenueRange,
            notes
        } = req.body;

        const { role } = req.user;

        if (!name) {
            return res.status(400).json({
                message: "Company name is required!"
            });
        }

        let companyData = {
            name,
            industry,
            size,
            website,
            primaryContact,
            status,
            address,
            phone,
            revenueRange,
            notes,
            ownerId: (role === "admin" || role === "sales_manager") && req.body.ownerId && req.body.ownerId.trim() !== "" ? req.body.ownerId : req.user.id,
            attachments: []
        };

        // Handle File Uploads
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file, "companies/attachments"));
            const uploadedFiles = await Promise.all(uploadPromises);
            companyData.attachments = uploadedFiles.map(file => ({
                ...file,
                uploadedBy: req.user.id
            }));
        }

        const company = await Company.create(companyData);

        res.status(201).json({
            message: "Company created successfully!",
            data: company
        });

        // Log company creation
        await logAction({
            entityType: "Company",
            entityId: company._id,
            action: "CREATE",
            performedBy: req.user.id,
            details: { newValues: company },
            req
        });
        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
};

export const getCompanies = async (req, res) => {
    try {
        const { id, role } = req.user;
        const { name, industry, status, page = 1, limit = 10, sort = "-createdAt" } = req.query;

        let filter = { isDeleted: { $ne: true } };

        if (name) filter.name = { $regex: name, $options: "i" };
        if (industry) filter.industry = industry;
        if (status) filter.status = status;

        if (role === "sales_manager") {
            const teamUsers = await User.find({
                $or: [{ _id: id }, { managerId: id }]
            }).select("_id");

            const teamIds = teamUsers.map(u => u._id);
            
            // Get companies linked to team's deals
            const { Deal } = await import("../models/dealSchema.js");
            const teamDeals = await Deal.find({ ownerId: { $in: teamIds }, isDeleted: { $ne: true } }).select("companyId");
            const dealCompanyIds = teamDeals.map(d => d.companyId).filter(id => id);

            filter.$or = [
                { ownerId: { $in: teamIds } },
                { _id: { $in: dealCompanyIds } }
            ];
        }

        if (role === "sales_rep") {
            // Get companies linked to rep's deals
            const { Deal } = await import("../models/dealSchema.js");
            const myDeals = await Deal.find({ ownerId: id, isDeleted: { $ne: true } }).select("companyId");
            const dealCompanyIds = myDeals.map(d => d.companyId).filter(id => id);

            filter.$or = [
                { ownerId: id },
                { _id: { $in: dealCompanyIds } }
            ];
        }


        //pagination
        const skip = (page - 1) * limit;

        const companies = await Company.find(filter)
            .populate("ownerId", "firstName email")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Company.countDocuments(filter);

        return res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            data: companies
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
};

export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const company = await Company.findById(id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found!"
            });
        }

        if (role !== "admin") {

            if (role === "sales_manager") {
                const teamUsers = await User.find({
                    $or: [{ _id: userId }, { managerId: userId }]
                }).select("_id");

                const teamIds = teamUsers.map(u => u._id.toString());

                if (!company.ownerId || !teamIds.includes(company.ownerId.toString())) {
                    return res.status(403).json({
                        message: "Access denied!"
                    });
                }
            }

            if (role === "sales_rep") {
                if (!company.ownerId || company.ownerId.toString() !== userId) {
                    return res.status(403).json({
                        message: "Access denied!"
                    });
                }
            }
        }

        if (req.body.ownerId !== undefined && (!company.ownerId || req.body.ownerId !== company.ownerId.toString())) {
            if (role === "sales_rep") {
                return res.status(403).json({ message: "Sales representatives cannot reassign companies!" });
            }
            if (role === "sales_manager") {
                const teamUsers = await User.find({ $or: [{ _id: userId }, { managerId: userId }] }).select("_id");
                const teamIds = teamUsers.map(u => u._id.toString());
                if (!teamIds.includes(req.body.ownerId.toString())) {
                    return res.status(403).json({ message: "You can only reassign companies within your team!" });
                }
            }
        }

        const fields = [
            "name", "industry", "size", "website", "primaryContact",
            "status", "address", "phone", "revenueRange", "notes", "remarks", "ownerId"
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                let value = req.body[field];
                // Sanitize ID fields
                if (field === "ownerId" && typeof value === "string" && value.trim() === "") {
                    value = null;
                }
                company[field] = value;
            }
        });

        // Handle legacy remarks migration
        if (req.body.remarks !== undefined && typeof req.body.remarks === "string") {
            const authorName = `${req.user.firstName} ${req.user.lastName || ""}`.trim();
            company.remarks.push({
                text: req.body.remarks,
                author: userId,
                authorName,
                createdAt: new Date()
            });
        }

        // Handle File Uploads for Attachments
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file, "companies/attachments"));
            const uploadedFiles = await Promise.all(uploadPromises);
            const newAttachments = uploadedFiles.map(file => ({
                ...file,
                uploadedBy: userId
            }));
            company.attachments.push(...newAttachments);
        }

        await company.save();

        res.json({
            message: "Company updated successfully!",
            data: company
        });

        // Log company update
        await logAction({
            entityType: "Company",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: { newValues: req.body },
            req
        });
        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
};

export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const company = await Company.findById(id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found!"
            });
        }

        if (role !== "admin") {

            if (role === "sales_manager") {
                const teamUsers = await User.find({
                    $or: [{ _id: userId }, { managerId: userId }]
                }).select("_id");

                const teamIds = teamUsers.map(u => u._id.toString());

                if (!company.ownerId || !teamIds.includes(company.ownerId.toString())) {
                    return res.status(403).json({
                        message: "Access denied!"
                    });
                }
            }

            if (role === "sales_rep") {
                if (!company.ownerId || company.ownerId.toString() !== userId) {
                    return res.status(403).json({
                        message: "Access denied!"
                    });
                }
            }
        }

        company.isDeleted = true;
        company.deletedAt = new Date();
        await company.save();

        res.json({
            message: "Company moved to trash successfully!"
        });

        // Log company deletion
        await logAction({
            entityType: "Company",
            entityId: id,
            action: "DELETE",
            performedBy: userId,
            details: { message: `Company "${company.name}" moved to trash.`, oldValues: company },
            req
        });
        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
};

export const changeOwnership = async (req, res) => {
    try {
        const { id } = req.params;
        const { newOwnerId } = req.body;
        const { role, id: userId } = req.user;

        const company = await Company.findById(id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found!"
            });
        }

        if (role === "sales_rep") {
            return res.status(403).json({
                message: "Access denied!"
            });
        }

        if (role === "sales_manager") {
            const teamUsers = await User.find({
                $or: [{ _id: userId }, { managerId: userId }]
            }).select("_id");

            const teamIds = teamUsers.map(u => u._id.toString());

            if (!newOwnerId || newOwnerId.trim() === "" || !teamIds.includes(newOwnerId)) {
                return res.status(403).json({
                    message: "New owner must belong to your team!"
                });
            }
        }

        company.ownerId = newOwnerId;
        await company.save();

        const newOwner = await User.findById(newOwnerId);

        res.json({
            message: "Ownership changed successfully!",
            data: company
        });

        // Log ownership change
        await logAction({
            entityType: "Company",
            entityId: id,
            action: "REASSIGN",
            performedBy: userId,
            details: {
                message: `Company ownership changed to ${newOwner ? `${newOwner.firstName} ${newOwner.lastName}` : newOwnerId}`,
                newOwnerId,
                reassignedToName: newOwner ? `${newOwner.firstName} ${newOwner.lastName}` : null
            },
            req
        });
        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
};

export const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findById(id).populate("ownerId", "firstName lastName email");

        if (!company) {
            return res.status(404).json({ message: "Company not found!" });
        }

        res.status(200).json({ data: company });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const getArchivedCompanies = async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

        const companies = await Company.find({ isDeleted: true })
            .populate("ownerId", "firstName lastName email")
            .sort({ deletedAt: -1 });

        res.status(200).json({ data: companies });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const restoreCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

        const company = await Company.findById(id);
        if (!company) return res.status(404).json({ message: "Company not found!" });

        if (!company.isDeleted) return res.status(400).json({ message: "Company is not in trash!" });

        // Check 30 days
        const deletedAt = new Date(company.deletedAt);
        const now = new Date();
        const diffDays = Math.ceil((now - deletedAt) / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
            return res.status(400).json({ message: "Restore period expired (30 days max)!" });
        }

        company.isDeleted = false;
        company.deletedAt = null;
        await company.save();

        res.status(200).json({ message: "Company restored successfully!" });

        await logAction({
            entityType: "Company",
            entityId: id,
            action: "ACTIVATE",
            performedBy: userId,
            details: { message: `Company "${company.name}" restored from trash.` },
            req
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};

export const addRemark = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const { id: userId, firstName, lastName } = req.user;

        if (!text) {
            return res.status(400).json({ message: "Remark text is required!" });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({ message: "Company not found!" });
        }

        let remarkFiles = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file, "companies/remarks"));
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

        company.remarks.push(newRemark);
        await company.save();

        res.status(200).json({ message: "Remark added successfully!", data: newRemark });

        // Log action
        await logAction({
            entityType: "Company",
            entityId: id,
            action: "UPDATE",
            performedBy: userId,
            details: { message: "Added a new remark", remark: newRemark },
            req
        });

    } catch (error) {
        res.status(500).json({ message: error.message || "Server error!" });
    }
};
