import mongoose from "mongoose";
import { Deal } from "../models/dealSchema.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import User from "../models/userSchema.js";
import fs from "fs";
import path from "path";
import { scoreDeal, scoreCompany, scoreContact } from "../utils/rankingService.js";
import { parseIntent, getHelpMessage } from "../utils/intentParser.js";
import { getAIIntent } from "../services/aiService.js";
import os from "os";

const getVisibilityFilter = async (user, entity, filter = {}) => {
    const { _id: id, role } = user;
    const isTrash = !!(filter.trash || filter.isDeleted);
    
    // Base filter for all roles ($ne: true matches both false and undefined)
    let baseFilter = { isDeleted: isTrash ? true : { $ne: true } };

    // Resolve owner if provided as a name
    if (filter.owner && !["me", "my"].includes(filter.owner.toLowerCase())) {
        const ownerUser = await User.findOne({
            $or: [
                { firstName: { $regex: filter.owner, $options: "i" } },
                { lastName: { $regex: filter.owner, $options: "i" } }
            ]
        }).select("_id");
        if (ownerUser) {
            filter.ownerId = ownerUser._id;
        }
    }

    if (filter.own || (filter.owner && ["me", "my"].includes(filter.owner.toLowerCase()))) {
        filter.ownerId = id;
    }

    // Identify team members for Managers, or just self for Reps
    let ownerIdObj = null;
    try {
        if (filter.ownerId) {
            ownerIdObj = typeof filter.ownerId === "string" ? new mongoose.Types.ObjectId(filter.ownerId) : filter.ownerId;
        }
    } catch (e) {
        // Carry on if not a valid ObjectId
    }

    // Role-based constraints
    if (role === "admin") {
        if (ownerIdObj) {
            baseFilter.ownerId = ownerIdObj;
        }
        return baseFilter;
    }

    // Identify team members for Managers, or just self for Reps
    let teamIds = [id];
    if (role === "sales_manager") {
        const teamUsers = await User.find({
            $or: [{ _id: id }, { managerId: id }]
        }).select("_id");

        const teamIds = teamUsers.map(u => u._id);
        const visibilityFilter = {
            $and: [
                baseFilter,
                { ownerId: { $in: teamIds } }
            ]
        };

        // If a specific owner was requested within the team
        if (ownerIdObj) {
            const requestedOwnerIdStr = ownerIdObj.toString();
            const isTeamMember = teamIds.some(tid => tid.toString() === requestedOwnerIdStr);
            if (isTeamMember) {
                visibilityFilter.$and.push({ ownerId: ownerIdObj });
            }
        }

        return visibilityFilter;
    }

    if (role === "sales_rep") {
        return {
            $and: [
                baseFilter,
                { ownerId: id }
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

const summarizeDeal = (d) => {
    const valueStr = (d.value || 0).toLocaleString();
    let insight = "";
    if (d.aiTier === "Hot") insight = "🔥 This item is high-priority and shows great potential!";
    else if (d.stage === "Negotiation") insight = "🤝 You're in the final stretch! This deal is currently in the negotiation phase.";
    else if (d.stage === "Closed Won") insight = "🎉 Brilliant work! This deal is successfully completed.";
    
    return `
**Deal:** ${d.name}
**Value:** $${valueStr}
**Current Stage:** ${d.stage}
**Ownership:** ${d.ownerId ? `${d.ownerId.firstName} ${d.ownerId.lastName}` : "Unassigned"}
**Associated Company:** ${d.companyId?.name || "None"}
**AI Priority:** ${d.aiTier}

${insight ? `*Assistant's Insight:* ${insight}` : "This deal is progressing through the pipeline. Do you need any specific follow-up actions?"}
    `.trim();
};

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

const summarizeCompany = (c) => {
    let insight = "";
    if (c.dealCount > 0) insight = `This is an active partner with ${c.dealCount} ongoing deal(s).`;
    else insight = "This company is in your network, but has no active deals yet. It might be a good time to reach out!";

    return `
**Company:** ${c.name}
**Industry:** ${c.industry || "General"}
**Account Owner:** ${c.ownerId ? `${c.ownerId.firstName} ${c.ownerId.lastName}` : "Unassigned"}
**Active Deals:** ${c.dealCount}
**Total Contacts:** ${c.contactCount}

*Assistant's Perspective:* ${insight}
    `.trim();
};

const formatContact = (c) => ({
    id: c._id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    jobTitle: c.jobTitle,
    company: c.companyId?.name || "Direct",
    deals: c.dealCount,
    score: c.aiScore,
    tier: c.aiTier
});

const summarizeContact = (c) => {
    const contactName = `${c.firstName} ${c.lastName}`;
    return `
**Contact:** ${contactName}
**Position:** ${c.jobTitle || "Lead"}
**Email Address:** ${c.email || "N/A"}
**Company Attachment:** ${c.companyId?.name || "Direct Relationship"}
**Active Deal Count:** ${c.dealCount}
**Priority Level:** ${c.aiTier}

*Note:* I've found ${contactName} to be a ${c.aiTier === 'Hot' ? 'key stakeholder' : 'valuable contact'} in your network. Let me know if you'd like to see their associated deals!
    `.trim();
};

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

    // ── GREETING HANDLER ──
    if (action === "greet") {
        return res.json({
            reply: `Hello ${user.firstName}! 👋 I'm your AI Sales Assistant. I can help you find deals, contacts, companies, or even generate reports for you. What's on your mind today?`,
            type: "greeting"
        });
    }
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

    // 2. Ranking & Tiering Logic
    const isTrash = !!(filter.trash || filter.isDeleted);
    const isTrashFilter = isTrash ? true : { $ne: true };
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
            Deal.aggregate([{ $match: { companyId: { $in: companyIds }, isDeleted: isTrashFilter } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
            Contact.aggregate([{ $match: { companyId: { $in: companyIds }, isDeleted: isTrashFilter } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }])
        ]);
        const dealCountMap = Object.fromEntries(dealAgg.map(d => [d._id?.toString(), d.count]));
        const contactCountMap = Object.fromEntries(contactAgg.map(c => [c._id?.toString(), c.count]));

        // Correct max Revenue for normalized scoring
        const maxRevResult = await Company.aggregate([{ $match: { isDeleted: isTrashFilter } }, { $group: { _id: null, max: { $max: "$revenueRange" } } }]);
        const maxRev = maxRevResult[0]?.max || 1;

        ranked = items.map(c => {
            const dc = dealCountMap[c._id.toString()] || 0;
            const cc = contactCountMap[c._id.toString()] || 0;
            const { score, tier } = scoreCompany(c, dc, cc, maxRev);
            return { ...c, aiScore: score, aiTier: tier, dealCount: dc, contactCount: cc };
        });
    } else if (entity === "contacts") {
        const contactIds = items.map(c => new mongoose.Types.ObjectId(c._id));
        const dealAgg = await Deal.aggregate([{ $match: { contactId: { $in: contactIds }, isDeleted: isTrashFilter } }, { $group: { _id: "$contactId", count: { $sum: 1 } } }]);
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
    // Note: Most logic moved to getVisibilityFilter for database-level optimization.
    // We only keep this if name resolution failed or for additional safety.
    if (!filter.ownerId && (filter.owner || filter.own)) {
        const ownerLower = String(filter.owner || (filter.own ? "me" : "")).toLowerCase();
        const userIdStr = user._id.toString();

        if (ownerLower === "me" || ownerLower === "my") {
            ranked = ranked.filter(i => {
                const oid = i.ownerId?._id ? i.ownerId._id.toString() : (i.ownerId ? i.ownerId.toString() : null);
                return oid === userIdStr;
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
        if (ranked.length > 0) return res.json({ reply: `Here's a detailed look at **${ranked[0].name || ranked[0].firstName + ' ' + ranked[0].lastName}**:`, detail: config.summaryFn(ranked[0]), type: `${config.type}_detail`, total: 1 });
        return res.json({ reply: `I'm sorry, I couldn't find any ${config.type} matching that name. Would you like me to try a broader search?`, type: "not_found" });
    }

    if (action === "count") {
        const tierLabel = filter.tier ? ` **${filter.tier}**` : "";
        const entityLabel = ranked.length === 1 ? config.type : (config.type === "company" ? "companies" : `${config.type}s`);
        
        let reply = `You currently have **${ranked.length}**${tierLabel} ${entityLabel} in your system.`;
        if (ranked.length === 0) {
            reply = `I couldn't find any${tierLabel} ${entityLabel} matching your request. Is there anything else I can check?`;
        }
        return res.json({ reply, type: "count", count: ranked.length });
    }

    if (action === "aggregate" && entity === "deals") {
        const total = ranked.reduce((sum, d) => sum + (d.value || 0), 0);
        return res.json({ 
            reply: `The total value for these **${ranked.length} deals** is **$${total.toLocaleString()}**. Your pipeline is looking strong! 📈`, 
            type: "aggregate", 
            value: total 
        });
    }

    // Suggestions / Followup custom reply
    const pluralType = config.type === "company" ? "companies" : `${config.type}s`;
    let reply = `I've found some ${pluralType} for you! Here they are sorted by priority:`;
    
    if (action === "suggestions") {
        reply = `I've highlighted **${ranked.length} high-priority ${config.type}(s)** that could use some immediate attention:`;
    } else if (action === "followup") {
        reply = `Here are **${ranked.length} ${config.type}(s)** that might need a quick follow-up or check-in today:`;
    } else if (filter.tier) {
        reply = `I've retrieved your **${filter.tier} ${pluralType}** from the system:`;
    } else if (filter.team && entity === "users") {
        reply = `I've retrieved your **team members** for you:`;
    } else if (filter.noDeals) {
        reply = `I've identified these companies that currently have **no associated deals**:`;
    } else if (filter.withDeals) {
        reply = `Here are the companies in your network with **active deals**:`;
    }

    if (filter.limit) ranked = ranked.slice(0, filter.limit);

    // Graceful Empty States
    if (ranked.length === 0) {
        let emptyMsg = `I'm sorry, I couldn't find any ${pluralType} matching those specific criteria right now.`;
        if (filter.tier === "Hot") emptyMsg = `I searched, but there are no **Hot ${pluralType}** at the moment. You might want to check your "Warm" leads!`;
        else if (filter.trash) emptyMsg = `Your **trash for ${pluralType}** is currently empty — that's a clean slate!`;
        else emptyMsg += ` You may want to try a broader search or check your overall lists.`;
        return res.json({ reply: emptyMsg, type: "empty" });
    }

    return res.json({
        reply,
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
            return res.status(400).json({ reply: "Hello there! 👋 Is there anything specific you'd like me to look up for you? You can ask about deals, contacts, or companies!", type: "info" });
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

        if (intent.action === "unknown") {
            return res.json({
                reply: `I'm sorry, I didn't quite catch that. Try asking something like **'show my hot deals'**, **'list top companies'**, or type **'help'** for more ideas!`,
                type: "unknown"
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
            return res.json({ 
                reply: `I searched through your deals, contacts, and companies, but I couldn't find anything matching **"${filter.name}"**. You might want to double-check the name or try a broader search phrase!`, 
                type: "not_found" 
            });
        }

        return await handleUniversalQuery(intent, req.user, res);
    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).json({ reply: "Oops! Something went wrong on my end. Please try again in a moment.", type: "error" });
    }
};
