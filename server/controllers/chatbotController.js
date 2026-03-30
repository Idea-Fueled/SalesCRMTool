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

// ── Format helpers ────────────────────────────────────────────
const formatDeal = (d) => ({
    id: d._id,
    name: d.name,
    value: `${d.currency || "$"}${(d.value || 0).toLocaleString()}`,
    stage: d.stage,
    owner: d.ownerId ? `${d.ownerId.firstName || ""} ${d.ownerId.lastName || ""}`.trim() : "Unassigned",
    company: d.companyId?.name || d.companyName || "—",
    score: d.aiScore,
    tier: d.aiTier
});

const formatCompany = (c) => ({
    id: c._id,
    name: c.name,
    industry: c.industry || "—",
    status: c.status || "—",
    owner: c.ownerId ? `${c.ownerId.firstName || ""} ${c.ownerId.lastName || ""}`.trim() : "Unassigned",
    deals: c.dealCount || 0,
    contacts: c.contactCount || 0,
    score: c.aiScore,
    tier: c.aiTier
});

const formatContact = (c) => ({
    id: c._id,
    name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
    jobTitle: c.jobTitle || "—",
    email: c.email || "—",
    company: c.companyId?.name || c.companyName || "—",
    linkedin: c.linkedin ? "Yes" : "No",
    deals: c.dealCount || 0,
    score: c.aiScore,
    tier: c.aiTier
});

// ── Main chatbot handler ─────────────────────────────────────
export const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ reply: "Please type a message!", type: "error" });
        }

        const intent = parseIntent(message);

        // Help
        if (intent.action === "help") {
            return res.json({ reply: getHelpMessage(), type: "help" });
        }

        // Greeting
        if (intent.action === "greet") {
            const name = req.user?.firstName || "there";
            return res.json({
                reply: `Hello ${name}! 👋 I'm your AI Sales Assistant. Type **"help"** to see what I can do, or ask me something like **"show my hot deals"**!`,
                type: "greeting"
            });
        }

        // Unknown
        if (intent.action === "unknown") {
            return res.json({
                reply: `I'm not sure what you mean by "${message}". Try asking about **deals**, **contacts**, or **companies**. Type **"help"** for examples!`,
                type: "error"
            });
        }

        const ownerFilter = await buildOwnerFilter(req.user);
        const { entity, filter } = intent;

        // ── DEALS ─────────────────────────────────────────────
        if (entity === "deals") {
            const deals = await Deal.find({ isDeleted: false, ...ownerFilter })
                .populate("ownerId", "firstName lastName email role")
                .populate("companyId", "name")
                .lean();

            const maxValue = Math.max(...deals.map(d => d.value || 0), 1);
            let ranked = deals.map(deal => {
                const { score, tier } = scoreDeal(deal, maxValue);
                return { ...deal, aiScore: score, aiTier: tier };
            });

            // Apply filters
            if (filter.tier) ranked = ranked.filter(d => d.aiTier === filter.tier);
            if (filter.name) {
                const nameLower = filter.name.toLowerCase();
                ranked = ranked.filter(d => {
                    const ownerName = `${d.ownerId?.firstName || ""} ${d.ownerId?.lastName || ""}`.trim().toLowerCase();
                    return ownerName.includes(nameLower);
                });
            }

            ranked.sort((a, b) => b.aiScore - a.aiScore);
            if (filter.limit) ranked = ranked.slice(0, filter.limit);

            // COUNT action
            if (intent.action === "count") {
                const tierLabel = filter.tier ? ` ${filter.tier}` : "";
                return res.json({
                    reply: `You have **${ranked.length}${tierLabel} deal(s)** in your pipeline.`,
                    type: "count",
                    count: ranked.length
                });
            }

            // AGGREGATE action
            if (intent.action === "aggregate") {
                const total = ranked.reduce((sum, d) => sum + (d.value || 0), 0);
                return res.json({
                    reply: `Total pipeline value: **$${total.toLocaleString()}** across ${ranked.length} deal(s).`,
                    type: "aggregate",
                    value: total
                });
            }

            // LIST action
            const tierLabel = filter.tier ? ` ${filter.tier}` : "";
            const ownerLabel = filter.name ? ` owned by ${filter.name}` : "";
            return res.json({
                reply: ranked.length > 0
                    ? `Here are your${tierLabel} deals${ownerLabel} ranked by AI score:`
                    : `No${tierLabel} deals found${ownerLabel}.`,
                data: ranked.map(formatDeal),
                type: "deal_list",
                total: ranked.length
            });
        }

        // ── COMPANIES ─────────────────────────────────────────
        if (entity === "companies") {
            const companies = await Company.find({ isDeleted: false, ...ownerFilter })
                .populate("ownerId", "firstName lastName email role")
                .lean();

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
                const { score, tier } = scoreCompany(company, dealCount, contactCount, maxRevenue);
                return { ...company, aiScore: score, aiTier: tier, dealCount, contactCount };
            });

            if (filter.tier) ranked = ranked.filter(c => c.aiTier === filter.tier);
            ranked.sort((a, b) => b.aiScore - a.aiScore);
            if (filter.limit) ranked = ranked.slice(0, filter.limit);

            if (intent.action === "count") {
                return res.json({
                    reply: `You have **${ranked.length} company/companies**.`,
                    type: "count", count: ranked.length
                });
            }

            const tierLabel = filter.tier ? ` ${filter.tier}` : "";
            return res.json({
                reply: ranked.length > 0
                    ? `Here are your${tierLabel} companies ranked by AI score:`
                    : `No${tierLabel} companies found.`,
                data: ranked.map(formatCompany),
                type: "company_list",
                total: ranked.length
            });
        }

        // ── CONTACTS ──────────────────────────────────────────
        if (entity === "contacts") {
            const contacts = await Contact.find({ isDeleted: false, ...ownerFilter })
                .populate("ownerId", "firstName lastName email role")
                .populate("companyId", "name")
                .lean();

            const contactIds = contacts.map(c => c._id);
            const dealAgg = await Deal.aggregate([
                { $match: { contactId: { $in: contactIds }, isDeleted: false } },
                { $group: { _id: "$contactId", count: { $sum: 1 } } }
            ]);
            const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id.toString(), d.count]));

            let ranked = contacts.map(contact => {
                const dealCount = dealCountMap[contact._id.toString()] || 0;
                const { score, tier } = scoreContact(contact, dealCount);
                return { ...contact, aiScore: score, aiTier: tier, dealCount };
            });

            if (filter.tier) ranked = ranked.filter(c => c.aiTier === filter.tier);
            if (filter.name) {
                const nameLower = filter.name.toLowerCase();
                ranked = ranked.filter(c => {
                    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
                    return fullName.includes(nameLower);
                });
            }

            ranked.sort((a, b) => b.aiScore - a.aiScore);
            if (filter.limit) ranked = ranked.slice(0, filter.limit);

            // DETAIL action for a specific contact
            if (intent.action === "detail" && ranked.length > 0) {
                const c = ranked[0];
                const formatted = formatContact(c);
                return res.json({
                    reply: `Here are the details for **${formatted.name}**:`,
                    data: [formatted],
                    type: "contact_detail",
                    total: 1
                });
            }

            if (intent.action === "count") {
                return res.json({
                    reply: `You have **${ranked.length} contact(s)**.`,
                    type: "count", count: ranked.length
                });
            }

            const tierLabel = filter.tier ? ` ${filter.tier}` : "";
            return res.json({
                reply: ranked.length > 0
                    ? `Here are your${tierLabel} contacts ranked by AI score:`
                    : `No${tierLabel} contacts found.`,
                data: ranked.map(formatContact),
                type: "contact_list",
                total: ranked.length
            });
        }

        res.json({ reply: "I couldn't process that request. Type **help** for examples!", type: "error" });
    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).json({ reply: "Something went wrong. Please try again.", type: "error" });
    }
};
