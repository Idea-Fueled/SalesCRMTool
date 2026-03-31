import mongoose from "mongoose";
import { Deal } from "../models/dealSchema.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import User from "../models/userSchema.js";
import { scoreDeal, scoreCompany, scoreContact } from "../utils/rankingService.js";
import { parseIntent, getHelpMessage } from "../utils/intentParser.js";
import { getAIIntent } from "../services/aiService.js";
import os from "os";
import path from "path";
import fs from "fs";

const getVisibilityFilter = async (user, entity, filter = {}) => {
    const { _id: id, role } = user;
    const isTrash = !!(filter.trash || filter.isDeleted);
    let baseFilter = { isDeleted: isTrash };

    if (role === "admin") {
        if (entity === "users" && !isTrash) return { isDeleted: false };
        return baseFilter;
    }

    const teamUsers = await User.find({ $or: [{ _id: id }, { managerId: id }] }).select("_id");
    const teamIds = teamUsers.map(u => u._id);
    const ownershipRef = role === "sales_manager" ? { ownerId: { $in: teamIds } } : { ownerId: id };

    if (entity === "users") {
        const userBase = { isDeleted: isTrash };
        if (role === "sales_manager") return { ...userBase, managerId: id };
        return { ...userBase, _id: id };
    }

    if (entity === "deals") {
        const [myCompanies, myContacts] = await Promise.all([
            Company.find(ownershipRef).select("_id"),
            Contact.find(ownershipRef).select("_id")
        ]);
        const companyIds = myCompanies.map(c => c._id);
        const contactIds = myContacts.map(c => c._id);

        return {
            ...baseFilter,
            $or: [
                ownershipRef,
                { companyId: { $in: companyIds } },
                { contactId: { $in: contactIds } }
            ]
        };
    }

    if (entity === "contacts") {
        const [myDeals, myCompanies] = await Promise.all([
            Deal.find(ownershipRef).select("contactId"),
            Company.find(ownershipRef).select("_id")
        ]);
        const dealContactIds = myDeals.map(d => d.contactId).filter(Boolean);
        const companyIds = myCompanies.map(c => c._id);

        return {
            ...baseFilter,
            $or: [
                ownershipRef,
                { _id: { $in: dealContactIds } },
                { companyId: { $in: companyIds } },
                { "companies.companyId": { $in: companyIds } }
            ]
        };
    }

    if (entity === "companies") {
        const [myDeals, myContacts] = await Promise.all([
            Deal.find(ownershipRef).select("companyId"),
            Contact.find(ownershipRef).select("companyId companies")
        ]);

        const dealCompanyIds = myDeals.map(d => d.companyId).filter(Boolean);
        const contactCompanyIds = [];
        myContacts.forEach(c => {
            if (c.companyId) contactCompanyIds.push(c.companyId);
            if (c.companies) c.companies.forEach(assoc => { if (assoc.companyId) contactCompanyIds.push(assoc.companyId); });
        });

        return {
            ...baseFilter,
            $or: [
                ownershipRef,
                { _id: { $in: dealCompanyIds } },
                { _id: { $in: contactCompanyIds } }
            ]
        };
    }

    return baseFilter;
};

// ── Formatters & Summarizers ─────────────────────────────────
const formatDeal = (d) => ({
    id: d._id,
    name: d.name,
    value: d.value,
    stage: d.stage,
    owner: d.ownerId ? `${d.ownerId.firstName} ${d.ownerId.lastName}` : "Unassigned",
    company: d.companyId?.name || "None",
    score: d.aiScore,
    tier: d.aiTier
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
    status: c.status || "Active",
    location: c.city || "Global",
    owner: c.ownerId ? `${c.ownerId.firstName} ${c.ownerId.lastName}` : "Unassigned",
    deals: c.dealCount,
    contacts: c.contactCount,
    score: c.aiScore,
    tier: c.aiTier
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
    score: c.aiScore,
    tier: c.aiTier
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
        searchFields: ["name", "ownerId.firstName", "ownerId.lastName", "companyName", "companyId.name", "contactId.firstName", "contactId.lastName"],
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
    },
    users: {
        model: User,
        populates: [{ path: "managerId", select: "firstName lastName email" }],
        formatFn: (u) => {
            let roleLabel = u.role?.toUpperCase().replace("_", " ") || "USER";
            if (roleLabel === "SALES MANAGER") roleLabel = "SALES MGR";
            return {
                id: u._id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                role: roleLabel,
                manager: u.managerId ? `${u.managerId.firstName} ${u.managerId.lastName}` : "None"
            };
        },
        summaryFn: (u) => `
**User:** ${u.firstName} ${u.lastName}
**Email:** ${u.email}
**Role:** ${u.role}
**Manager:** ${u.managerId ? `${u.managerId.firstName} ${u.managerId.lastName}` : "None"}
        `.trim(),
        searchFields: ["firstName", "lastName", "email", "role"],
        type: "user"
    }
};

// ── Reporting Logic ──────────────────────────────────────────
const handleReportingQuery = async (user, intent, res) => {
    try {
        const filter = intent.filter || intent.filters || {};
        const isTrash = !!(filter.trash || filter.isDeleted);
        const entitySearch = String(intent.originalMessage || "").toLowerCase();
        const hasDealKeyword = entitySearch.includes("deal");
        const hasContactKeyword = entitySearch.includes("contact");
        const hasCompanyKeyword = entitySearch.includes("compan");

        // If no categories mentioned, show all. If some mentioned, show ONLY those.
        const showAll = !hasDealKeyword && !hasContactKeyword && !hasCompanyKeyword;
        const showDeals = showAll || hasDealKeyword;
        const showContacts = showAll || hasContactKeyword;
        const showCompanies = showAll || hasCompanyKeyword;

        const [dealFilter, contactFilter, companyFilter] = await Promise.all([
            getVisibilityFilter(user, "deals", filter),
            getVisibilityFilter(user, "contacts", filter),
            getVisibilityFilter(user, "companies", filter)
        ]);

        const [dealStats, contactCount, companyCount] = await Promise.all([
            showDeals ? Deal.aggregate([
                { $match: dealFilter },
                {
                    $group: {
                        _id: "$stage",
                        count: { $sum: 1 },
                        totalValue: { $sum: "$value" }
                    }
                }
            ]) : [],
            showContacts ? Contact.countDocuments(contactFilter) : 0,
            showCompanies ? Company.countDocuments(companyFilter) : 0
        ]);

        let reply = `### 📊 ${isTrash ? 'Trash/Archive' : 'CRM Overview'} Report\n\n`;
        
        if (showDeals) {
            const totalDeals = dealStats.reduce((acc, s) => acc + s.count, 0);
            const totalValue = dealStats.reduce((acc, s) => acc + s.totalValue, 0);
            const stageSummary = dealStats.map(s => `• **${s._id}:** ${s.count} deals ($${s.totalValue.toLocaleString()})`).join("\n");
            reply += `**Deals:** ${totalDeals} total ($${totalValue.toLocaleString()} pipeline)\n`;
            if (stageSummary) reply += `${stageSummary}\n\n`;
        }

        if (showContacts) reply += `**Contacts:** ${contactCount} ${isTrash ? 'deleted' : 'active'} individuals\n`;
        if (showCompanies) reply += `**Companies:** ${companyCount} ${isTrash ? 'deleted' : 'active'} accounts\n`;

        if (user.role === "sales_manager" || user.role === "admin") {
            const teamSize = await User.countDocuments({ managerId: user._id, isDeleted: false });
            if (teamSize > 0) reply += `\n**Team:** You are managing ${teamSize} active members.`;
        }

        return res.json({ 
            reply, 
            type: "report", 
            stats: { deals: showDeals, contacts: showContacts, companies: showCompanies } 
        });
    } catch (error) {
        console.error("Reporting Error:", error);
        return res.json({ reply: "I encountered an error while generating your report.", type: "error" });
    }
};

// ── Universal Query Handler ───────────────────────────────────
const handleUniversalQuery = async (intent, user, res) => {
    let { entity, action } = intent;
    const filter = intent.filter || intent.filters || {};
    
    // Normalize AI root-level properties
    if (intent.limit) filter.limit = intent.limit;
    if (intent.detail && action === "list") action = "detail";

    if (entity === "reports") return await handleReportingQuery(user, intent, res);

    const config = SCHEMA_CONFIG[entity];
    if (!config) return res.json({ reply: "I'm not sure how to handle that entity yet.", type: "error" });

    const visibilityFilter = await getVisibilityFilter(user, entity, filter);
    
    // 1. Fetch base data
    let query = config.model.find(visibilityFilter);
    config.populates.forEach(p => query.populate(p));
    let items = await query.lean();

    // 2. Ranking & Counts (Relational)
    const isTrash = !!(filter.trash || filter.isDeleted);
    let ranked = [];
    if (entity === "deals") {
        const maxValue = Math.max(...items.map(d => d.value || 0), 1);
        ranked = items.map(d => {
            const { score, tier } = scoreDeal(d, maxValue);
            return { ...d, aiScore: score, aiTier: tier };
        });
    } else if (entity === "companies") {
        const companyIds = items.map(c => new mongoose.Types.ObjectId(c._id));
        const [dealAgg, contactAgg] = await Promise.all([
            Deal.aggregate([{ $match: { companyId: { $in: companyIds }, isDeleted: isTrash } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
            Contact.aggregate([{ $match: { companyId: { $in: companyIds }, isDeleted: isTrash } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }])
        ]);
        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id?.toString(), d.count]));
        const contactCountMap = Object.fromEntries(contactAgg.map(c => [c._id?.toString(), c.count]));

        // Correct max Revenue for normalized scoring
        const maxRevResult = await Company.aggregate([{ $match: { isDeleted: isTrash } }, { $group: { _id: null, max: { $max: "$revenueRange" } } }]);
        const maxRev = maxRevResult[0]?.max || 1;

        ranked = items.map(c => {
            const dc = dealCountMap[c._id.toString()] || 0;
            const cc = contactCountMap[c._id.toString()] || 0;
            const { score, tier } = scoreCompany(c, dc, cc, maxRev);
            return { ...c, aiScore: score, aiTier: tier, dealCount: dc, contactCount: cc };
        });
    } else if (entity === "contacts") {
        const contactIds = items.map(c => new mongoose.Types.ObjectId(c._id));
        const dealAgg = await Deal.aggregate([{ $match: { contactId: { $in: contactIds }, isDeleted: isTrash } }, { $group: { _id: "$contactId", count: { $sum: 1 } } }]);
        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id?.toString(), d.count]));
        ranked = items.map(c => {
            const dc = dealCountMap[c._id.toString()] || 0;
            const { score, tier } = scoreContact(c, dc);
            return { ...c, aiScore: score, aiTier: tier, dealCount: dc };
        });
    } else if (entity === "users") {
        ranked = [...items];
    }

    // 3. Filters
    if (filter.active === true || filter.active === false) {
        ranked = ranked.filter(i => i.isActive === filter.active);
    }

    if (filter.tier) {
        const tierLower = String(filter.tier).toLowerCase();
        ranked = ranked.filter(i => (i.aiTier || "").toLowerCase() === tierLower);
    }
    if (filter.valueAbove) ranked = ranked.filter(i => (i.value || 0) >= filter.valueAbove);
    if (filter.stageName) ranked = ranked.filter(i => (i.stage || "").toLowerCase() === filter.stageName.toLowerCase());
    if (filter.noDeals) ranked = ranked.filter(i => (i.dealCount || 0) === 0);
    if (filter.withDeals) ranked = ranked.filter(i => (i.dealCount || 0) > 0);
    if (filter.inactive && entity === "deals") {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        ranked = ranked.filter(d => (d.remarks?.length || 0) === 0 || new Date(d.updatedAt) < fourteenDaysAgo);
    }

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

    // 5a. Explicit Owner Filter (Handles "me", "my", or specific names)
    if (filter.owner || filter.own) {
        const ownerLower = String(filter.owner || (filter.own ? "me" : "")).toLowerCase();
        if (ownerLower === "me" || ownerLower === "my") {
            // Strict personal ownership override
            ranked = ranked.filter(i => (i.ownerId?._id?.toString() || i.ownerId?.toString()) === user._id.toString());
        } else {
            ranked = ranked.filter(i => {
                const ownerName = `${i.ownerId?.firstName || ""} ${i.ownerId?.lastName || ""}`.toLowerCase();
                return ownerName.includes(ownerLower);
            });
        }
    }

    // 5b. Explicit Contact Filter
    if (filter.contact && entity === "deals") {
        const contactLower = String(filter.contact).toLowerCase();
        ranked = ranked.filter(i => {
            const contactName = `${i.contactId?.firstName || ""} ${i.contactId?.lastName || ""}`.toLowerCase();
            return contactName.includes(contactLower);
        });
    }

    // 5c. Explicit Company Filter
    if (filter.company) {
        const companyLower = String(filter.company).toLowerCase();
        ranked = ranked.filter(i => {
            const companyName = `${i.companyId?.name || i.companyName || ""}`.toLowerCase();
            return companyName.includes(companyLower);
        });
    }

    // 5d. Generic Name Search (Robust cross-field fallback)
    if (filter.name) {
        const nl = String(filter.name).toLowerCase();
        ranked = ranked.filter(i => {
            return config.searchFields.some(field => {
                const val = field.split('.').reduce((obj, key) => obj?.[key], i);
                return (val?.toString() || "").toLowerCase().includes(nl);
            });
        });
    }

    // 6. Sorting
    if (entity !== "users") {
        ranked.sort((a, b) => b.aiScore - a.aiScore);
    }

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
    const pluralType = config.type === "company" ? "companies" : `${config.type}s`;
    let reply = `Here are your ${pluralType}:`;
    if (entity !== "users") reply = `Here are your ${pluralType} ranked by AI score:`;
    if (action === "suggestions") reply = `I've found **${ranked.length} high-priority ${config.type}(s)** that haven't had recent activity:`;
    if (action === "followup") reply = `Here are **${ranked.length} ${config.type}(s)** that might need a follow-up (no recent activity or notes):`;
    if (filter.tier) reply = `Here are your **${filter.tier} ${config.type}(s)**:`;
    if (filter.team && entity === "users") reply = `Here are your **team members**:`;
    if (filter.noDeals) reply = `Here are your companies with **no associated deals**:`;
    if (filter.withDeals) reply = `Here are your companies with **active deals**:`;

    if (filter.limit) ranked = ranked.slice(0, filter.limit);

    return res.json({
        reply: ranked.length > 0 ? reply : `No ${pluralType} found matching your criteria.`,
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

        // Try AI Parser first, fallback to rule-based
        let intent;
        try {
            intent = await getAIIntent(message);
            console.log("🤖 AI Parsed Intent:", intent);
        } catch (aiError) {
            console.log("⚠️ AI Parser failed, using rule-based fallback.");
            intent = parseIntent(message);
        }

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

        const filter = intent.filter || intent.filters || {};
        const { entity } = intent;

        // ── CROSS-ENTITY SEARCH (entity === "all") ────────────
        if (entity === "all" && intent.action === "detail" && filter.name) {
            for (const ent of ["deals", "contacts", "companies"]) {
                const mockRes = {
                    json: (data) => data,
                    status: function() { return this; }
                };
                const result = await handleUniversalQuery({ ...intent, entity: ent }, req.user, mockRes);
                if (result && result.total > 0) return res.json(result);
            }
            return res.json({ reply: `I couldn't find any details for "${filter.name}" across deals, contacts, or companies.`, type: "not_found" });
        }


        return await handleUniversalQuery(intent, req.user, res);
    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).json({ reply: "Something went wrong. Please try again.", type: "error" });
    }
};
