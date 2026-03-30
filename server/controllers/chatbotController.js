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

// ── Format helpers (list cards) ───────────────────────────────
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

// ── Summary formatters (bullet-point detail) ──────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";

const summarizeDeal = (d) => {
    const owner = d.ownerId ? `${d.ownerId.firstName || ""} ${d.ownerId.lastName || ""}`.trim() : "Unassigned";
    const company = d.companyId?.name || d.companyName || "—";
    const contact = d.contactId ? `${d.contactId.firstName || ""} ${d.contactId.lastName || ""}`.trim() : "—";
    const lines = [
        `📌 **${d.name}**`,
        `• **Value:** ${d.currency || "$"}${(d.value || 0).toLocaleString()}`,
        `• **Stage:** ${d.stage || "—"}`,
        `• **Probability:** ${d.probability ?? "—"}%`,
        `• **Expected Close:** ${fmtDate(d.expectedCloseDate)}`,
        `• **Company:** ${company}`,
        `• **Contact:** ${contact}`,
        `• **Owner:** ${owner}`,
        `• **Source:** ${d.source || "—"}`,
        `• **Remarks:** ${d.remarks?.length || 0} note(s)`,
        `• **Attachments:** ${d.attachments?.length || 0} file(s)`,
        `• **Created:** ${fmtDate(d.createdAt)}`,
        `• **Updated:** ${fmtDate(d.updatedAt)}`,
        `• **AI Score:** ${d.aiScore} (${d.aiTier})`
    ];
    if (d.notes) lines.push(`• **Notes:** ${d.notes.length > 100 ? d.notes.slice(0, 100) + "…" : d.notes}`);
    return lines.join("\n");
};

const summarizeCompany = (c) => {
    const owner = c.ownerId ? `${c.ownerId.firstName || ""} ${c.ownerId.lastName || ""}`.trim() : "Unassigned";
    const lines = [
        `🏢 **${c.name}**`,
        `• **Industry:** ${c.industry || "—"}`,
        `• **Status:** ${c.status || "—"}`,
        `• **Size:** ${c.size || "—"}`,
        `• **Revenue:** $${(c.revenueRange || 0).toLocaleString()}`,
        `• **Website:** ${c.website || "—"}`,
        `• **Phone:** ${c.phone || "—"}`,
        `• **Address:** ${c.address || "—"}`,
        `• **Owner:** ${owner}`,
        `• **Active Deals:** ${c.dealCount || 0}`,
        `• **Contacts:** ${c.contactCount || 0}`,
        `• **Created:** ${fmtDate(c.createdAt)}`,
        `• **Updated:** ${fmtDate(c.updatedAt)}`,
        `• **AI Score:** ${c.aiScore} (${c.aiTier})`
    ];
    if (c.notes) lines.push(`• **Notes:** ${c.notes.length > 100 ? c.notes.slice(0, 100) + "…" : c.notes}`);
    return lines.join("\n");
};

const summarizeContact = (c) => {
    const owner = c.ownerId ? `${c.ownerId.firstName || ""} ${c.ownerId.lastName || ""}`.trim() : "Unassigned";
    const company = c.companyId?.name || c.companyName || "—";
    const lines = [
        `👤 **${c.firstName || ""} ${c.lastName || ""}**`,
        `• **Job Title:** ${c.jobTitle || "—"}`,
        `• **Email:** ${c.email || "—"}`,
        `• **Phone:** ${c.phone || "—"}`,
        `• **Mobile:** ${c.mobile || "—"}`,
        `• **Company:** ${company}`,
        `• **LinkedIn:** ${c.linkedin || "Not available"}`,
        `• **Owner:** ${owner}`,
        `• **Deals:** ${c.dealCount || 0} associated deal(s)`,
        `• **Remarks:** ${c.remarks?.length || 0} note(s)`,
        `• **Created:** ${fmtDate(c.createdAt)}`,
        `• **Updated:** ${fmtDate(c.updatedAt)}`,
        `• **AI Score:** ${c.aiScore} (${c.aiTier})`
    ];
    if (c.notes) lines.push(`• **Notes:** ${c.notes.length > 100 ? c.notes.slice(0, 100) + "…" : c.notes}`);
    return lines.join("\n");
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

        const ownerFilter = await buildOwnerFilter(req.user);
        const { entity, filter } = intent;

        // ── CROSS-ENTITY SEARCH (entity === "all") ────────────
        if (entity === "all" && intent.action === "detail" && filter.name) {
            const nameLower = filter.name.toLowerCase();

            // Search deals by name
            const deals = await Deal.find({ isDeleted: false, name: { $regex: nameLower, $options: "i" }, ...ownerFilter })
                .populate("ownerId", "firstName lastName email role")
                .populate("companyId", "name")
                .populate("contactId", "firstName lastName")
                .lean();

            if (deals.length > 0) {
                const maxValue = Math.max(...deals.map(d => d.value || 0), 1);
                const { score, tier } = scoreDeal(deals[0], maxValue);
                const d = { ...deals[0], aiScore: score, aiTier: tier };
                return res.json({ reply: summarizeDeal(d), type: "detail", total: 1 });
            }

            // Search contacts by name
            const contacts = await Contact.find({
                isDeleted: false, ...ownerFilter,
                $or: [
                    { firstName: { $regex: nameLower, $options: "i" } },
                    { lastName: { $regex: nameLower, $options: "i" } }
                ]
            }).populate("ownerId", "firstName lastName email role").populate("companyId", "name").lean();

            if (contacts.length > 0) {
                const contactIds = contacts.map(c => c._id);
                const dealAgg = await Deal.aggregate([
                    { $match: { contactId: { $in: contactIds }, isDeleted: false } },
                    { $group: { _id: "$contactId", count: { $sum: 1 } } }
                ]);
                const dealCount = dealAgg[0]?.count || 0;
                const { score, tier } = scoreContact(contacts[0], dealCount);
                const c = { ...contacts[0], aiScore: score, aiTier: tier, dealCount };
                return res.json({ reply: summarizeContact(c), type: "detail", total: 1 });
            }

            // Search companies by name
            const companies = await Company.find({ isDeleted: false, name: { $regex: nameLower, $options: "i" }, ...ownerFilter })
                .populate("ownerId", "firstName lastName email role").lean();

            if (companies.length > 0) {
                const compId = companies[0]._id;
                const [dAgg, cAgg] = await Promise.all([
                    Deal.aggregate([{ $match: { companyId: compId, isDeleted: false, stage: { $nin: ["Closed Won", "Closed Lost"] } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                    Contact.aggregate([{ $match: { companyId: compId, isDeleted: false } }, { $group: { _id: null, count: { $sum: 1 } } }])
                ]);
                const dealCount = dAgg[0]?.count || 0;
                const contactCount = cAgg[0]?.count || 0;
                const maxRev = companies[0].revenueRange || 1;
                const { score, tier } = scoreCompany(companies[0], dealCount, contactCount, maxRev);
                const co = { ...companies[0], aiScore: score, aiTier: tier, dealCount, contactCount };
                return res.json({ reply: summarizeCompany(co), type: "detail", total: 1 });
            }

            // Search users/owners by name — show their deals summary
            const matchedUsers = await User.find({
                $or: [
                    { firstName: { $regex: nameLower, $options: "i" } },
                    { lastName: { $regex: nameLower, $options: "i" } }
                ]
            }).select("_id firstName lastName email role").lean();

            if (matchedUsers.length > 0) {
                const u = matchedUsers[0];
                const userDeals = await Deal.find({ ownerId: u._id, isDeleted: false })
                    .populate("companyId", "name").lean();
                const userContacts = await Contact.find({ ownerId: u._id, isDeleted: false }).lean();
                const userCompanies = await Company.find({ ownerId: u._id, isDeleted: false }).lean();

                const totalValue = userDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                const wonDeals = userDeals.filter(d => d.stage === "Closed Won").length;
                const lostDeals = userDeals.filter(d => d.stage === "Closed Lost").length;
                const activeDeals = userDeals.filter(d => !["Closed Won", "Closed Lost"].includes(d.stage)).length;

                const lines = [
                    `👤 **${u.firstName} ${u.lastName}**`,
                    `• **Email:** ${u.email}`,
                    `• **Role:** ${u.role === "admin" ? "Admin" : u.role === "sales_manager" ? "Sales Manager" : "Sales Rep"}`,
                    `• **Total Deals:** ${userDeals.length} (Active: ${activeDeals}, Won: ${wonDeals}, Lost: ${lostDeals})`,
                    `• **Pipeline Value:** $${totalValue.toLocaleString()}`,
                    `• **Contacts:** ${userContacts.length}`,
                    `• **Companies:** ${userCompanies.length}`
                ];
                return res.json({ reply: lines.join("\n"), type: "detail", total: 1 });
            }

            return res.json({ reply: `No deals, contacts, companies, or users found matching **"${filter.name}"**.`, type: "error" });
        }

        // ── DEALS ─────────────────────────────────────────────
        if (entity === "deals") {
            const deals = await Deal.find({ isDeleted: false, ...ownerFilter })
                .populate("ownerId", "firstName lastName email role")
                .populate("companyId", "name")
                .populate("contactId", "firstName lastName")
                .lean();

            const maxValue = Math.max(...deals.map(d => d.value || 0), 1);
            let ranked = deals.map(deal => {
                const { score, tier } = scoreDeal(deal, maxValue);
                return { ...deal, aiScore: score, aiTier: tier };
            });

            if (filter.tier) ranked = ranked.filter(d => d.aiTier === filter.tier);
            if (filter.name) {
                const nameLower = filter.name.toLowerCase();
                ranked = ranked.filter(d => {
                    const dealName = (d.name || "").toLowerCase();
                    const ownerName = `${d.ownerId?.firstName || ""} ${d.ownerId?.lastName || ""}`.trim().toLowerCase();
                    return dealName.includes(nameLower) || ownerName.includes(nameLower);
                });
            }

            ranked.sort((a, b) => b.aiScore - a.aiScore);

            // DETAIL action — summary of the top match
            if (intent.action === "detail" && ranked.length > 0) {
                return res.json({ reply: summarizeDeal(ranked[0]), type: "deal_detail", total: 1 });
            }

            if (filter.limit) ranked = ranked.slice(0, filter.limit);

            if (intent.action === "count") {
                const tierLabel = filter.tier ? ` ${filter.tier}` : "";
                return res.json({
                    reply: `You have **${ranked.length}${tierLabel} deal(s)** in your pipeline.`,
                    type: "count", count: ranked.length
                });
            }

            if (intent.action === "aggregate") {
                const total = ranked.reduce((sum, d) => sum + (d.value || 0), 0);
                return res.json({
                    reply: `Total pipeline value: **$${total.toLocaleString()}** across ${ranked.length} deal(s).`,
                    type: "aggregate", value: total
                });
            }

            const tierLabel = filter.tier ? ` ${filter.tier}` : "";
            const ownerLabel = filter.name ? ` matching "${filter.name}"` : "";
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
            if (filter.name) {
                const nameLower = filter.name.toLowerCase();
                ranked = ranked.filter(c => (c.name || "").toLowerCase().includes(nameLower));
            }

            ranked.sort((a, b) => b.aiScore - a.aiScore);

            // DETAIL action
            if (intent.action === "detail" && ranked.length > 0) {
                return res.json({ reply: summarizeCompany(ranked[0]), type: "company_detail", total: 1 });
            }

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

            // DETAIL action
            if (intent.action === "detail" && ranked.length > 0) {
                return res.json({ reply: summarizeContact(ranked[0]), type: "contact_detail", total: 1 });
            }

            if (filter.limit) ranked = ranked.slice(0, filter.limit);

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
