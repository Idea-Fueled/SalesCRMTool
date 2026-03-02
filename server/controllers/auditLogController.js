import mongoose from "mongoose";
import AuditLog from "../models/auditLogSchema.js";

export const getAuditLogs = async (req, res) => {
    try {
        const {
            entityType,
            action,
            performedBy,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sort = "-createdAt",
            search
        } = req.query;

        let filter = {};

        if (entityType) filter.entityType = entityType;
        if (action) filter.action = action;
        if (performedBy) filter.performedBy = performedBy;

        if (search) {
            const searchRegex = new RegExp(search, "i");

            // Find users matching search for performedBy
            const matchingUsers = await mongoose.model("User").find({
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex }
                ]
            }).select("_id");

            const matchingUserIds = matchingUsers.map(u => u._id);

            filter.$or = [
                { "details.message": searchRegex },
                { "details.targetName": searchRegex },
                { "details.reassignedToName": searchRegex },
                { "details.fromUserName": searchRegex },
                { "details.toUserName": searchRegex },
                { performedBy: { $in: matchingUserIds } }
            ];

            // ObjectId exact matches
            if (search.match(/^[0-9a-fA-F]{24}$/)) {
                filter.$or.push({ entityId: search });
                filter.$or.push({ performedBy: search });
            }
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        // Fetch logs with population
        let logs = await AuditLog.find(filter)
            .populate("performedBy", "firstName lastName email")
            .populate("entityId", "name firstName lastName email")
            .sort(sort);

        // Filter out orphaned logs (where performedBy user was deleted)
        // We do this post-query because we can't easily filter by a populated field existence in one MongoDB query without aggregation
        const filteredLogs = logs.filter(log => log.performedBy !== null);

        // Paginate manually after filtering
        const paginatedLogs = filteredLogs.slice(skip, skip + Number(limit));

        const total = filteredLogs.length;

        res.status(200).json({
            data: paginatedLogs,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        res.status(500).json({
            message: error.message || "Server error!"
        });
    }
};
