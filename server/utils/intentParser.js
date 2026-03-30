/**
 * Intent Parser — Rule-based NLP for chatbot queries.
 * Parses user messages into structured intents.
 */

export const parseIntent = (message) => {
    const input = message.trim().toLowerCase();

    // Help intent
    if (input === "help" || input === "?" || input.includes("what can you do")) {
        return { action: "help" };
    }

    // Greeting
    if (/^(hi|hello|hey|sup|yo)\b/.test(input)) {
        return { action: "greet" };
    }

    // Determine entity
    let entity = null;
    if (/deal/i.test(input)) entity = "deals";
    else if (/compan/i.test(input)) entity = "companies";
    else if (/contact/i.test(input)) entity = "contacts";

    // Determine tier filter
    let tier = null;
    if (/\bhot\b/i.test(input)) tier = "Hot";
    else if (/\bwarm\b/i.test(input)) tier = "Warm";
    else if (/\bcold\b/i.test(input)) tier = "Cold";

    // Determine action
    let action = "list"; // default

    // Count queries
    if (/\b(how many|count|total number)\b/i.test(input)) {
        action = "count";
    }
    // Aggregate queries — allows "total deal value", "total value", "sum", etc.
    else if (/\btotal\s+(\w+\s+)?value\b/i.test(input) || /\b(total worth|sum of|pipeline value)\b/i.test(input)) {
        action = "aggregate";
    }
    // Detail queries  
    else if (/\b(detail|details|info|information|about)\b/i.test(input) || /\bgive\b.*\b(detail|info)\b/i.test(input)) {
        action = "detail";
    }
    // Top queries
    else if (/\btop\b/i.test(input)) {
        action = "list";
    }

    // ── Extract name ────────────────────────────────────────
    // Handles: "deals of Anirudh", "detail of Idea Fueled deal",
    //          "contact Sandeep Kumar details", "deal Enterprise License info"
    let name = null;
    const stopWords = ["the", "all", "my", "hot", "warm", "cold", "deals", "contacts", "companies",
        "deal", "contact", "company", "show", "get", "list", "give", "me", "detail", "details",
        "info", "information", "about", "top", "ranked", "of", "for", "by", "from", "sum",
        "total", "value", "how", "many", "count"];

    const cleanName = (raw) => {
        if (!raw) return null;
        // Remove stop words from the edges and entity keywords
        const words = raw.trim().split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
        return words.length > 0 ? words.join(" ") : null;
    };

    // Pattern 1: "of/for/by <name>" — greedy, captures multi-word names
    const ofMatch = input.match(/\b(?:of|for|by|from)\s+(.+?)(?:\s+(?:deal|contact|company|details?|info)|\s*$)/i);
    if (ofMatch) name = cleanName(ofMatch[1]);

    // Pattern 2: "contact/deal/company <name> details/info"
    if (!name) {
        const entityNameMatch = input.match(/\b(?:contact|company|deal)\s+(.+?)(?:\s+(?:details?|info|information)|\s*$)/i);
        if (entityNameMatch) name = cleanName(entityNameMatch[1]);
    }

    // Pattern 3: "<name> contact/deal/company details"
    if (!name) {
        const nameEntityMatch = input.match(/^(?:show|get|give|list|me|the|\s)*(.+?)\s+(?:contact|company|deal)\s+(?:details?|info)/i);
        if (nameEntityMatch) name = cleanName(nameEntityMatch[1]);
    }

    // Pattern 4: "detail/details/info of <name>" (without entity keyword)
    if (!name && action === "detail") {
        const detailOfMatch = input.match(/\b(?:details?|info|about)\s+(?:of\s+)?(.+)/i);
        if (detailOfMatch) name = cleanName(detailOfMatch[1]);
    }

    // Extract limit for "top N" queries
    let limit = null;
    const topMatch = input.match(/\btop\s+(\d+)/i);
    if (topMatch) {
        limit = parseInt(topMatch[1]);
    } else if (/\btop\b/i.test(input)) {
        limit = 5; // default top 5
    }

    // "my deals" → own filter
    let own = false;
    if (/\bmy\b/i.test(input)) {
        own = true;
    }

    // If no entity detected, try to infer
    if (!entity) {
        if (name && action === "detail") {
            entity = "all"; // search across all entities for the name
        } else if (action === "aggregate") {
            entity = "deals"; // "total value" → deals
        } else {
            return {
                action: "unknown",
                originalMessage: message
            };
        }
    }

    return {
        action,
        entity,
        filter: {
            tier,
            name,
            limit,
            own
        }
    };
};

export const getHelpMessage = () => {
    return `Here's what I can do:

**Deals:**
• "show my deals" — List your deals ranked by AI score
• "show hot deals" — Filter deals by Hot/Warm/Cold tier
• "show deals of Anirudh" — Filter deals by owner name
• "deal Enterprise License details" — Summary of a specific deal
• "top 5 deals" — Show highest ranked deals
• "how many hot deals?" — Count deals by tier
• "total deal value" — Sum of all deal values

**Contacts:**
• "show contacts" — List all contacts ranked by score
• "contact Sandeep details" — Summary of a specific contact
• "top contacts" — Top 5 ranked contacts

**Companies:**
• "show companies" — List all companies ranked by score
• "company Idea Fueled details" — Summary of a specific company
• "top companies" — Top 5 ranked companies
• "hot companies" — Filter companies by tier

**Quick Detail:**
• "details of Anirudh" — Search across all entities by name`;
};
