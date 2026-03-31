import mongoose from "mongoose";
import { Deal } from "../models/dealSchema.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import User from "../models/userSchema.js";
import { scoreDeal, scoreCompany, scoreContact } from "../utils/rankingService.js";
import { parseIntent, getHelpMessage } from "../utils/intentParser.js";

/**
 * Helper: get team member IDs for a manager
 */
const getTeamIds = async (userId) => {
    const teamMembers = await User.find({ managerId: userId }).select("_id");
    return [userId, ...teamMembers.map(m => m._id)];
};

const buildOwnerFilter = async (user) => {
    if (user.role === "admin") return {};
    if (user.role === "sales_manager") {
        const teamIds = await getTeamIds(user._id);
        return { ownerId: { $in: teamIds } };
    }
    return { ownerId: user._id };
};

// ── Formatters & Summarizers ─────────────────────────────────
const formatDeal = (d) => ({
    id: d._id,
    name: d.name,
    value: d.value,
    stage: d.stage,
    owner: d.ownerId ? `${d.ownerId.firstName} ${d.ownerId.lastName}` : "Unassigned",
    company: d.companyId?.name || "None",
    aiScore: d.aiScore,
    aiTier: d.aiTier
});

const summarizeDeal = (d) => `
**Deal:** ${d.name}
**Value:** $${(d.value || 0).toLocaleString()}
**Stage:** ${d.stage}
**Owner:** ${d.ownerId ? `${d.ownerId.firstName} ${d.ownerId.lastName}` : "Unassigned"}
**Company:** ${d.companyId?.name || "None"}
**AI Score:** ${d.aiScore} (${d.aiTier})
`.trim();

const formatCompany = (c) => ({
    id: c._id,
    name: c.name,
    industry: c.industry,
    owner: c.ownerId ? `${c.ownerId.firstName} ${c.ownerId.lastName}` : "Unassigned",
    deals: c.dealCount,
    contacts: c.contactCount,
    aiScore: c.aiScore,
    aiTier: c.aiTier
});

const summarizeCompany = (c) => `
**Company:** ${c.name}
**Industry:** ${c.industry || "N/A"}
**Owner:** ${c.ownerId ? `${c.ownerId.firstName} ${c.ownerId.lastName}` : "Unassigned"}
**Active Deals:** ${c.dealCount}
**Total Contacts:** ${c.contactCount}
**AI Score:** ${c.aiScore} (${c.aiTier})
`.trim();

const formatContact = (c) => ({
    id: c._id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    company: c.companyId?.name || "None",
    owner: c.ownerId ? `${c.ownerId.firstName} ${c.ownerId.lastName}` : "Unassigned",
    deals: c.dealCount,
    aiScore: c.aiScore,
    aiTier: c.aiTier
});

const summarizeContact = (c) => `
**Contact:** ${c.firstName} ${c.lastName}
**Email:** ${c.email || "N/A"}
**Company:** ${c.companyId?.name || "None"}
**Owner:** ${c.ownerId ? `${c.ownerId.firstName} ${c.ownerId.lastName}` : "Unassigned"}
**Active Deals:** ${c.dealCount}
**AI Score:** ${c.aiScore} (${c.aiTier})
`.trim();

// ── Entity Configuration ─────────────────────────────────────
const SCHEMA_CONFIG = {
    deals: {
        model: Deal,
        populates: [
            { path: "ownerId", select: "firstName lastName email role" },
            { path: "companyId", select: "name" },
            { path: "contactId", select: "firstName lastName" }
        ],
        scoreFn: (data, max) => scoreDeal(data, max),
        formatFn: formatDeal,
        summaryFn: summarizeDeal,
        searchFields: ["name", "ownerId.firstName", "ownerId.lastName", "companyName", "companyId.name"],
        type: "deal"
    },
    companies: {
        model: Company,
        populates: [{ path: "ownerId", select: "firstName lastName email role" }],
        scoreFn: (data, max, counts) => scoreCompany(data, counts.deals, counts.contacts, max),
        formatFn: formatCompany,
        summaryFn: summarizeCompany,
        searchFields: ["name", "industry"],
        type: "company"
    },
    contacts: {
        model: Contact,
        populates: [
            { path: "ownerId", select: "firstName lastName email role" },
            { path: "companyId", select: "name" }
        ],
        scoreFn: (data, max, counts) => scoreContact(data, counts.deals),
        formatFn: formatContact,
        summaryFn: summarizeContact,
        searchFields: ["firstName", "lastName", "jobTitle", "email", "companyName", "companyId.name"],
        type: "contact"
    }
};

// ── Universal Query Handler ───────────────────────────────────
const handleUniversalQuery = async (intent, user, res) => {
    const { entity, action, filter } = intent;
    const config = SCHEMA_CONFIG[entity];
    if (!config) return res.json({ reply: "I'm not sure how to handle that entity yet.", type: "error" });

    const ownerFilter = await buildOwnerFilter(user);
    
    // 1. Fetch base data
    let query = config.model.find({ isDeleted: false, ...ownerFilter });
    config.populates.forEach(p => query.populate(p));
    let items = await query.lean();

    // 2. Ranking & Counts (Relational)
    let ranked = [];
    if (entity === "deals") {
        const maxValue = Math.max(...items.map(d => d.value || 0), 1);
        ranked = items.map(d => ({ ...d, ...scoreDeal(d, maxValue), aiScore: scoreDeal(d, maxValue).score, aiTier: scoreDeal(d, maxValue).tier }));
    } else if (entity === "companies") {
        const companyIds = items.map(c => new mongoose.Types.ObjectId(c._id));
        const [dealAgg, contactAgg] = await Promise.all([
            Deal.aggregate([{ $match: { companyId: { $in: companyIds }, isDeleted: false } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
            Contact.aggregate([{ $match: { companyId: { $in: companyIds }, isDeleted: false } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }])
        ]);
        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id?.toString(), d.count]));
        const contactCountMap = Object.fromEntries(contactAgg.map(c => [c._id?.toString(), c.count]));
        const maxRev = Math.max(...items.map(c => c.revenueRange || 0), 1);
        ranked = items.map(c => {
            const dc = dealCountMap[c._id.toString()] || 0;
            const cc = contactCountMap[c._id.toString()] || 0;
            const { score, tier } = scoreCompany(c, dc, cc, maxRev);
            return { ...c, aiScore: score, aiTier: tier, dealCount: dc, contactCount: cc };
        });
    } else if (entity === "contacts") {
        const contactIds = items.map(c => new mongoose.Types.ObjectId(c._id));
        const dealAgg = await Deal.aggregate([{ $match: { contactId: { $in: contactIds }, isDeleted: false } }, { $group: { _id: "$contactId", count: { $sum: 1 } } }]);
        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id?.toString(), d.count]));
        ranked = items.map(c => {
            const dc = dealCountMap[c._id.toString()] || 0;
            const { score, tier } = scoreContact(c, dc);
            return { ...c, aiScore: score, aiTier: tier, dealCount: dc };
        });
    }

    // 3. Filters
    if (filter.tier) ranked = ranked.filter(i => i.aiTier === filter.tier);
    if (filter.valueAbove) ranked = ranked.filter(i => (i.value || 0) >= filter.valueAbove);
    if (filter.stageName) ranked = ranked.filter(i => (i.stage || "").toLowerCase() === filter.stageName.toLowerCase());
    if (filter.noDeals) ranked = ranked.filter(i => (i.dealCount || 0) === 0);
    if (filter.withDeals) ranked = ranked.filter(i => (i.dealCount || 0) > 0);

    // 4. Intelligence Logic (Suggestions/Followups)
    if (action === "suggestions" && entity === "deals") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        ranked = ranked.filter(d => d.aiScore >= 70 && (new Date(d.updatedAt) < sevenDaysAgo || (d.remarks?.length || 0) === 0));
        if (ranked.length === 0) return res.json({ reply: "All your high-priority deals seem to be active! Keep it up. 🚀", type: "success" });
    } else if (action === "followup" && entity === "deals") {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        ranked = ranked.filter(d => (d.remarks?.length || 0) === 0 || new Date(d.updatedAt) < fourteenDaysAgo);
        if (ranked.length === 0) return res.json({ reply: "Great job! No deals currently need urgent follow-up action. ✅", type: "success" });
    }

    // 5. Name Search (Robust cross-field)
    if (filter.name) {
        const nl = filter.name.toLowerCase();
        ranked = ranked.filter(i => {
            return config.searchFields.some(field => {
                const val = field.split('.').reduce((obj, key) => obj?.[key], i);
                return (val?.toString() || "").toLowerCase().includes(nl);
            });
        });
    }

    // 6. Sorting
    ranked.sort((a, b) => b.aiScore - a.aiScore);

    // 7. Actions (Return standard JSONs)
    if (action === "detail") {
        if (ranked.length > 0) return res.json({ reply: config.summaryFn(ranked[0]), type: `${config.type}_detail`, total: 1 });
        return res.json({ reply: `I couldn't find any ${config.type} named "${filter.name}".`, type: "not_found" });
    }

    if (action === "count") {
        const label = filter.tier ? ` ${filter.tier}` : "";
        return res.json({ reply: `You have **${ranked.length}${label} ${config.type}(s)**.`, type: "count", count: ranked.length });
    }

    if (action === "aggregate" && entity === "deals") {
        const total = ranked.reduce((sum, d) => sum + (d.value || 0), 0);
        return res.json({ reply: `Total pipeline value: **$${total.toLocaleString()}** across ${ranked.length} deal(s).`, type: "aggregate", value: total });
    }

    // Suggestions / Followup custom reply
    let reply = `Here are your ${config.type}s ranked by AI score:`;
    if (action === "suggestions") reply = `I've found **${ranked.length} high-priority ${config.type}(s)** that haven't had recent activity:`;
    if (action === "followup") reply = `Here are **${ranked.length} ${config.type}(s)** that might need a follow-up (no recent activity or notes):`;
    if (filter.tier) reply = `Here are your **${filter.tier} ${config.type}(s)**:`;
    if (filter.noDeals) reply = `Here are your companies with **no associated deals**:`;
    if (filter.withDeals) reply = `Here are your companies with **active deals**:`;

    if (filter.limit) ranked = ranked.slice(0, filter.limit);

    return res.json({
        reply: ranked.length > 0 ? reply : `No ${config.type}s found matching your criteria.`,
        data: ranked.map(config.formatFn),
        type: `${config.type}_list`,
        total: ranked.length
    });
};

// ── Main chatbot handler ─────────────────────────────────────
export const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ reply: "Please type a message!", type: "error" });
        }

        const intent = parseIntent(message);

        if (intent.action === "help") {
            return res.json({ reply: getHelpMessage(), type: "help" });
        }

        if (intent.action === "greet") {
            const name = req.user?.firstName || "there";
            return res.json({
                reply: `Hello ${name}! 👋 I'm your AI Sales Assistant. Type **"help"** to see what I can do, or ask me something like **"show my hot deals"**!`,
                type: "greeting"
            });
        }

        if (intent.action === "unknown") {
            return res.json({
                reply: `I'm not sure what you mean by "${message}". Try asking about **deals**, **contacts**, or **companies**. Type **"help"** for examples!`,
                type: "error"
            });
        }

        const { entity, filter } = intent;

        // ── CROSS-ENTITY SEARCH (entity === "all") ────────────
        if (entity === "all" && intent.action === "detail" && filter.name) {
            for (const ent of ["deals", "contacts", "companies"]) {
                const mockRes = {
                    json: (data) => data,
                    status: function() { return this; }
                };
                const result = await handleUniversalQuery({ ...intent, entity: ent }, req.user, mockRes);
                if (result.type?.includes("detail")) return res.json(result);
            }
            return res.json({ reply: `I couldn't find any details for "${filter.name}" across deals, contacts, or companies.`, type: "not_found" });
        }


        return await handleUniversalQuery(intent, req.user, res);
    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).json({ reply: "Something went wrong. Please try again.", type: "error" });
    }
};
