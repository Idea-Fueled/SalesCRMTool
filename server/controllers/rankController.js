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

        const deals = await Deal.find({ isDeleted: false, ...ownerFilter })
            .populate("ownerId", "firstName lastName email role")
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
        const ownerFilter = await buildOwnerFilter(req.user);
        const { tier, limit, name } = req.query;

        const companies = await Company.find({ isDeleted: false, ...ownerFilter })
            .populate("ownerId", "firstName lastName email role")
            .lean();

        // Aggregate deal counts and contact counts per company
        const companyIds = companies.map(c => c._id);

        const [dealAgg, contactAgg] = await Promise.all([
            Deal.aggregate([
                { $match: { companyId: { $in: companyIds }, isDeleted: false, stage: { $nin: ["Closed Won", "Closed Lost"] } } },
                { $group: { _id: "$companyId", count: { $sum: 1 } } }
            ]),
            Contact.aggregate([
                { $match: { companyId: { $in: companyIds }, isDeleted: false } },
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
        const ownerFilter = await buildOwnerFilter(req.user);
        const { tier, limit, name } = req.query;

        const contacts = await Contact.find({ isDeleted: false, ...ownerFilter })
            .populate("ownerId", "firstName lastName email role")
            .populate("companyId", "name")
            .lean();

        // Aggregate deal counts per contact
        const contactIds = contacts.map(c => c._id);
        const dealAgg = await Deal.aggregate([
            { $match: { contactId: { $in: contactIds }, isDeleted: false } },
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
