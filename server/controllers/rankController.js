import { Deal } from "../models/dealSchema.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import User from "../models/userSchema.js";
import { scoreDeal, scoreCompany, scoreContact } from "../utils/rankingService.js";

/**
 * Helper: get team member IDs for a manager
 */
const getTeamIds = async (userId) => {
    const teamMembers = await User.find({ managerId: userId }).select("_id");
    return [userId, ...teamMembers.map(m => m._id)];
};

/**
 * Build ownership filter based on user role
 */
const buildOwnerFilter = async (user) => {
    if (user.role === "admin") return {};
    if (user.role === "sales_manager") {
        const teamIds = await getTeamIds(user._id);
        return { ownerId: { $in: teamIds } };
    }
    return { ownerId: user._id }; // sales_rep
};

// ── GET /api/rank/deals ───────────────────────────────────────
export const getRankedDeals = async (req, res) => {
    try {
        const ownerFilter = await buildOwnerFilter(req.user);
        const { tier, limit, owner, name } = req.query;

        const deals = await Deal.find({ isDeleted: { $ne: true }, ...ownerFilter })
            .populate("ownerId", "firstName lastName email profilePicture role")
            .populate("companyId", "name")
            .populate("contactId", "firstName lastName")
            .lean();

        // Get max deal value for normalization
        const maxValue = Math.max(...deals.map(d => d.value || 0), 1);

        // Score each deal
        let ranked = deals.map(deal => {
            const { score, tier: dealTier } = scoreDeal(deal, maxValue);
            return { ...deal, aiScore: score, aiTier: dealTier };
        });

        // Filter by tier
        if (tier) {
            ranked = ranked.filter(d => d.aiTier.toLowerCase() === tier.toLowerCase());
        }

        // Filter by owner name
        if (owner) {
            const ownerLower = owner.toLowerCase();
            ranked = ranked.filter(d => {
                const ownerName = `${d.ownerId?.firstName || ""} ${d.ownerId?.lastName || ""}`.trim().toLowerCase();
                return ownerName.includes(ownerLower);
            });
        }

        // Global text search across names, companies, contacts, owner
        if (name) {
            const searchLower = name.toLowerCase();
            ranked = ranked.filter(d => {
                const dealName = (d.name || "").toLowerCase();
                const compName = (d.companyId?.name || d.companyName || "").toLowerCase();
                const contName = `${d.contactId?.firstName || ""} ${d.contactId?.lastName || ""}`.trim().toLowerCase();
                const ownerName = `${d.ownerId?.firstName || ""} ${d.ownerId?.lastName || ""}`.trim().toLowerCase();
                return dealName.includes(searchLower) || compName.includes(searchLower) || contName.includes(searchLower) || ownerName.includes(searchLower);
            });
        }

        // Sort by score desc
        ranked.sort((a, b) => b.aiScore - a.aiScore);

        // Limit results
        if (limit) {
            ranked = ranked.slice(0, parseInt(limit));
        }

        res.status(200).json({ data: ranked, total: ranked.length });
    } catch (error) {
        console.error("❌ Error in getRankedDeals:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// ── GET /api/rank/companies ───────────────────────────────────
export const getRankedCompanies = async (req, res) => {
    try {
        const user = req.user;
        const { tier, limit, name } = req.query;

        // Build visibility filter — mirrors getCompanies logic exactly
        let ownerFilter = {};
        const id = user._id; // Normalized name to 'id' to match companyController

        if (user.role === "sales_manager") {
            const teamUsers = await User.find({
                $or: [{ _id: id }, { managerId: id }]
            }).select("_id");
            const teamIds = teamUsers.map(u => u._id);

            // Get companies linked to team's deals
            const teamDeals = await Deal.find({ ownerId: { $in: teamIds }, isDeleted: { $ne: true } }).select("companyId");
            const dealCompanyIds = teamDeals.map(d => d.companyId).filter(compId => compId);

            // Get companies linked to team's contacts
            const teamContacts = await Contact.find({ ownerId: { $in: teamIds }, isDeleted: { $ne: true } }).select("companyId companies");
            const contactCompanyIds = [];
            teamContacts.forEach(c => {
                if (c.companyId) contactCompanyIds.push(c.companyId);
                if (c.companies && Array.isArray(c.companies)) {
                    c.companies.forEach(assoc => {
                        if (assoc.companyId) contactCompanyIds.push(assoc.companyId);
                    });
                }
            });

            ownerFilter = {
                $or: [
                    { ownerId: { $in: teamIds } },
                    { _id: { $in: dealCompanyIds } },
                    { _id: { $in: contactCompanyIds } }
                ]
            };
        } else if (user.role === "sales_rep") {
            // sales_rep: sees own companies OR companies linked to their deals/contacts
            const repDeals = await Deal.find({ ownerId: id, isDeleted: { $ne: true } }).select("companyId");
            const dealCompanyIds = repDeals.map(d => d.companyId).filter(compId => compId);

            const repContacts = await Contact.find({ ownerId: id, isDeleted: { $ne: true } }).select("companyId companies");
            const contactCompanyIds = [];
            repContacts.forEach(c => {
                if (c.companyId) contactCompanyIds.push(c.companyId);
                if (c.companies && Array.isArray(c.companies)) {
                    c.companies.forEach(assoc => {
                        if (assoc.companyId) contactCompanyIds.push(assoc.companyId);
                    });
                }
            });

            ownerFilter = {
                $or: [
                    { ownerId: id },
                    { _id: { $in: dealCompanyIds } },
                    { _id: { $in: contactCompanyIds } }
                ]
            };
        }


        const companies = await Company.find({ isDeleted: { $ne: true }, ...ownerFilter })
            .populate("ownerId", "firstName lastName email profilePicture role")
            .lean();


        // Aggregate deal counts and contact counts per company
        const companyIds = companies.map(c => c._id);

        const [dealAgg, contactAgg] = await Promise.all([
            Deal.aggregate([
                { $match: { companyId: { $in: companyIds }, isDeleted: { $ne: true }, stage: { $nin: ["Closed Won", "Closed Lost"] } } },
                { $group: { _id: "$companyId", count: { $sum: 1 } } }
            ]),
            Contact.aggregate([
                { $match: { companyId: { $in: companyIds }, isDeleted: { $ne: true } } },
                { $group: { _id: "$companyId", count: { $sum: 1 } } }
            ])
        ]);

        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id.toString(), d.count]));
        const contactCountMap = Object.fromEntries(contactAgg.map(c => [c._id.toString(), c.count]));

        const maxRevenue = Math.max(...companies.map(c => c.revenueRange || 0), 1);

        let ranked = companies.map(company => {
            const dealCount = dealCountMap[company._id.toString()] || 0;
            const contactCount = contactCountMap[company._id.toString()] || 0;
            const { score, tier: compTier } = scoreCompany(company, dealCount, contactCount, maxRevenue);
            return { ...company, aiScore: score, aiTier: compTier, dealCount, contactCount };
        });

        if (tier) {
            ranked = ranked.filter(c => c.aiTier.toLowerCase() === tier.toLowerCase());
        }

        if (name) {
            const searchLower = name.toLowerCase();
            ranked = ranked.filter(c => {
                const compName = (c.name || "").toLowerCase();
                const industry = (c.industry || "").toLowerCase();
                const ownerName = `${c.ownerId?.firstName || ""} ${c.ownerId?.lastName || ""}`.trim().toLowerCase();
                return compName.includes(searchLower) || industry.includes(searchLower) || ownerName.includes(searchLower);
            });
        }

        ranked.sort((a, b) => b.aiScore - a.aiScore);

        if (limit) {
            ranked = ranked.slice(0, parseInt(limit));
        }

        res.status(200).json({ data: ranked, total: ranked.length });
    } catch (error) {
        console.error("❌ Error in getRankedCompanies:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// ── GET /api/rank/contacts ────────────────────────────────────
export const getRankedContacts = async (req, res) => {
    try {
        const user = req.user;
        const { tier, limit, name } = req.query;

        // Build visibility filter — mirrors getContacts logic exactly
        let ownerFilter = {};
        if (user.role === "admin") {
            ownerFilter = {};
        } else if (user.role === "sales_manager") {
            const teamIds = await getTeamIds(user._id);
            // Manager sees: owned by team OR linked to team's deals
            const teamDeals = await Deal.find({ ownerId: { $in: teamIds }, isDeleted: { $ne: true } }).select("contactId").lean();
            const dealContactIds = teamDeals.map(d => d.contactId).filter(Boolean);
            ownerFilter = {
                $or: [
                    { ownerId: { $in: teamIds } },
                    { _id: { $in: dealContactIds } }
                ]
            };
        } else {
            // sales_rep: sees own contacts OR contacts linked to their deals
            const myDeals = await Deal.find({ ownerId: user._id, isDeleted: { $ne: true } }).select("contactId").lean();
            const dealContactIds = myDeals.map(d => d.contactId).filter(Boolean);
            ownerFilter = {
                $or: [
                    { ownerId: user._id },
                    { _id: { $in: dealContactIds } }
                ]
            };
        }

        const contacts = await Contact.find({ isDeleted: { $ne: true }, ...ownerFilter })
            .populate("ownerId", "firstName lastName email profilePicture role")
            .populate("companyId", "name")
            .lean();

        // Aggregate deal counts per contact
        const contactIds = contacts.map(c => c._id);
        const dealAgg = await Deal.aggregate([
            { $match: { contactId: { $in: contactIds }, isDeleted: { $ne: true } } },
            { $group: { _id: "$contactId", count: { $sum: 1 } } }
        ]);
        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id.toString(), d.count]));

        let ranked = contacts.map(contact => {
            const dealCount = dealCountMap[contact._id.toString()] || 0;
            const { score, tier: contTier } = scoreContact(contact, dealCount);
            return { ...contact, aiScore: score, aiTier: contTier, dealCount };
        });

        if (tier) {
            ranked = ranked.filter(c => c.aiTier.toLowerCase() === tier.toLowerCase());
        }

        if (name) {
            const nameLower = name.toLowerCase();
            ranked = ranked.filter(c => {
                const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
                return fullName.includes(nameLower);
            });
        }

        ranked.sort((a, b) => b.aiScore - a.aiScore);

        if (limit) {
            ranked = ranked.slice(0, parseInt(limit));
        }

        res.status(200).json({ data: ranked, total: ranked.length });
    } catch (error) {
        console.error("❌ Error in getRankedContacts:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};
