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
    // Aggregate queries
    else if (/\b(total value|total worth|sum|pipeline value)\b/i.test(input)) {
        action = "aggregate";
    }
    // Detail queries  
    else if (/\b(detail|details|info|information|about)\b/i.test(input)) {
        action = "detail";
    }
    // Top queries
    else if (/\btop\b/i.test(input)) {
        action = "list";
    }

    // Extract name — look for patterns like:
    // "deals of Anirudh", "contact Anirudh details", "show Anirudh deals"
    let name = null;
    
    // Pattern: "of <name>", "for <name>", "by <name>"
    const ofMatch = input.match(/\b(?:of|for|by|from)\s+([a-z]+(?:\s+[a-z]+)?)/i);
    if (ofMatch) {
        const candidate = ofMatch[1].trim();
        // Don't treat common words as names
        const stopWords = ["the", "all", "my", "hot", "warm", "cold", "deals", "contacts", "companies", "deal", "contact", "company"];
        if (!stopWords.includes(candidate)) {
            name = candidate;
        }
    }

    // Pattern: "contact <name> details" or "<name> contact details"
    if (!name) {
        const nameDetailMatch = input.match(/(?:contact|company|deal)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:details?|info)/i);
        if (nameDetailMatch) {
            const candidate = nameDetailMatch[1].trim();
            const stopWords = ["the", "all", "my", "hot", "warm", "cold"];
            if (!stopWords.includes(candidate)) {
                name = candidate;
            }
        }
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
            entity = "contacts"; // "Anirudh details" → contacts
        } else if (action === "aggregate") {
            entity = "deals"; // "total value" → deals
        } else {
            // fallback
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
• "top 5 deals" — Show highest ranked deals
• "how many hot deals?" — Count deals by tier
• "total deal value" — Sum of all deal values

**Contacts:**
• "show contacts" — List all contacts ranked by score
• "contact Sandeep details" — Show details for a specific contact
• "top contacts" — Top 5 ranked contacts

**Companies:**
• "show companies" — List all companies ranked by score
• "top companies" — Top 5 ranked companies
• "hot companies" — Filter companies by tier`;
};
