/**
 * AI Ranking Service — Rule-based scoring engine for Deals, Companies, and Contacts.
 * Each function returns { score: 0–100, tier: "Hot" | "Warm" | "Cold" }
 */

// ── Tier mapping ──────────────────────────────────────────────
const getTier = (score) => {
    if (score >= 80) return "Hot";
    if (score >= 50) return "Warm";
    return "Cold";
};

// ── Deal Scoring ──────────────────────────────────────────────
const STAGE_SCORES = {
    "Lead": 10,
    "Qualified": 30,
    "Proposal": 50,
    "Negotiation": 75,
    "Closed Won": 100,
    "Closed Lost": 0
};

export const scoreDeal = (deal, maxValue = 1) => {
    // 1. Stage progress (35%)
    const stageScore = STAGE_SCORES[deal.stage] ?? 10;

    // 2. Deal value (25%) — normalized against max
    const safeMax = Math.max(maxValue, 1);
    const valueScore = Math.min(((deal.value || 0) / safeMax) * 100, 100);

    // 3. Close date urgency (20%) — closer = higher
    let urgencyScore = 50; // default
    if (deal.expectedCloseDate) {
        const daysUntilClose = Math.ceil(
            (new Date(deal.expectedCloseDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilClose <= 0) urgencyScore = 10; // past due
        else if (daysUntilClose <= 7) urgencyScore = 100;
        else if (daysUntilClose <= 14) urgencyScore = 80;
        else if (daysUntilClose <= 30) urgencyScore = 60;
        else urgencyScore = 30;
    }

    // 4. Activity / engagement (10%) — based on remarks count
    const remarksCount = deal.remarks?.length || 0;
    const activityScore = Math.min(remarksCount * 20, 100); // 5+ remarks = max

    // 5. Probability (10%) — direct value
    const probabilityScore = deal.probability ?? 50;

    // Weighted total
    const score = Math.round(
        stageScore * 0.35 +
        valueScore * 0.25 +
        urgencyScore * 0.20 +
        activityScore * 0.10 +
        probabilityScore * 0.10
    );

    const finalScore = Math.max(0, Math.min(100, score));
    return { score: finalScore, tier: getTier(finalScore) };
};

// ── Company Scoring ───────────────────────────────────────────
const SIZE_SCORES = {
    "1-10": 20,
    "11-50": 40,
    "51-200": 60,
    "201-500": 80,
    "500+": 100
};

const STATUS_SCORES = {
    "Active": 100,
    "Prospect": 50,
    "Inactive": 10
};

export const scoreCompany = (company, dealCount = 0, contactCount = 0, maxRevenue = 1) => {
    // 1. Revenue (25%)
    const safeMaxRev = Math.max(maxRevenue, 1);
    const revenueScore = Math.min(((company.revenueRange || 0) / safeMaxRev) * 100, 100);

    // 2. Company size (20%)
    const sizeScore = SIZE_SCORES[company.size] ?? 20;

    // 3. Deal count (25%) — more active deals = higher
    const dealScore = Math.min(dealCount * 20, 100); // 5+ deals = max

    // 4. Contact density (15%)
    const contactScore = Math.min(contactCount * 15, 100); // 7+ contacts = max

    // 5. Status (15%)
    const statusScore = STATUS_SCORES[company.status] ?? 50;

    const score = Math.round(
        revenueScore * 0.25 +
        sizeScore * 0.20 +
        dealScore * 0.25 +
        contactScore * 0.15 +
        statusScore * 0.15
    );

    const finalScore = Math.max(0, Math.min(100, score));
    return { score: finalScore, tier: getTier(finalScore) };
};

// ── Contact Scoring ───────────────────────────────────────────
const SENIORITY_MAP = {
    // C-level
    "ceo": 100, "cto": 100, "cfo": 100, "coo": 100, "cmo": 100, "chief": 100,
    "founder": 100, "co-founder": 100, "president": 95,
    // VP
    "vp": 80, "vice president": 80,
    // Director
    "director": 60, "head": 60,
    // Manager
    "manager": 40, "supervisor": 40,
    // Lead / Senior
    "lead": 30, "senior": 30, "team lead": 30,
    // Default handled below
};

const getSeniorityScore = (jobTitle) => {
    if (!jobTitle) return 20;
    const lower = jobTitle.toLowerCase();
    for (const [keyword, score] of Object.entries(SENIORITY_MAP)) {
        if (lower.includes(keyword)) return score;
    }
    return 20; // default for generic titles
};

export const scoreContact = (contact, dealCount = 0) => {
    // 1. Deal associations (30%)
    const dealScore = Math.min(dealCount * 25, 100); // 4+ deals = max

    // 2. Job title seniority (25%)
    const seniorityScore = getSeniorityScore(contact.jobTitle);

    // 3. LinkedIn presence (15%)
    const linkedinScore = contact.linkedin ? 100 : 0;

    // 4. Multi-company reach (10%)
    const companyCount = contact.companies?.length || (contact.companyId ? 1 : 0);
    const reachScore = Math.min(companyCount * 40, 100); // 3+ companies = max

    // 5. Recency (20%)
    let recencyScore = 30;
    if (contact.updatedAt) {
        const daysSinceUpdate = Math.ceil(
            (new Date() - new Date(contact.updatedAt)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceUpdate <= 7) recencyScore = 100;
        else if (daysSinceUpdate <= 30) recencyScore = 60;
        else if (daysSinceUpdate <= 90) recencyScore = 30;
        else recencyScore = 10;
    }

    const score = Math.round(
        dealScore * 0.30 +
        seniorityScore * 0.25 +
        linkedinScore * 0.15 +
        reachScore * 0.10 +
        recencyScore * 0.20
    );

    const finalScore = Math.max(0, Math.min(100, score));
    return { score: finalScore, tier: getTier(finalScore) };
};

export default { scoreDeal, scoreCompany, scoreContact, getTier };
