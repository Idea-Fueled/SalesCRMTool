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

    let action = "list"; // default actions
    let entity = null;

    // Determine entity (Priority to Reports)
    if (/\b(report|reports|stat|stats|statistic|statistics|dashboard|summary)\b/i.test(input)) {
        entity = "reports";
        action = "aggregate";
    }
    else if (/\b(company|companies|compan)\b/i.test(input)) entity = "companies";
    else if (/\b(contact|contacts)\b/i.test(input)) entity = "contacts";
    else if (/\b(user|users|member|members|team|colleague|colleagues)\b/i.test(input)) entity = "users";
    else if (/\b(deal|deals|negotiation|lead|pipeline)\b/i.test(input)) entity = "deals";

    // Determine tier filter
    let tier = null;
    if (/\bhot\b/i.test(input)) tier = "Hot";
    else if (/\bwarm\b/i.test(input)) tier = "Warm";
    else if (/\bcold\b/i.test(input)) tier = "Cold";
    else if (/\bhigh\s+priority\b/i.test(input)) tier = "Hot";

    // Determine remaining action logic... (action already defined)

    // Suggestions / Proactive items
    if (/\b(suggestion|suggestions|proactive|priority|priority base|what should i do|highlight)\b/i.test(input)) {
        action = "suggestions";
        entity = entity || "deals"; // default suggestions to deals
    }
    // Follow-ups
    else if (/\b(follow-up|followup|follow up|pending|no activity|need attention|waiting)\b/i.test(input)) {
        action = "followup";
        entity = entity || "deals";
    }
    // Count queries
    if (/\b(how many|count|total number)\b/i.test(input)) {
        action = "count";
    }
    // Aggregate queries — allows "total deal value", "total value", "sum", etc.
    else if (/\btotal\s+(\w+\s+)?value\b/i.test(input) || /\b(total worth|sum of|pipeline value)\b/i.test(input)) {
        action = "aggregate";
    }
    // Detail queries  
    else if (/\b(details?|info(rmation)?|about)\b/i.test(input) || /\bgive\b.*\b(details?|info)\b/i.test(input) || /^(details?|info|about)\s+/i.test(input)) {
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
        "total", "value", "how", "many", "count", "in", "stage", "above", "worth", "valued", "at",
        "is", "are", "there", "what", "who", "which", "number", "has", "have"];

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
        // Exclude common filter triggers from being captured as names
        const entityNameMatch = input.match(/\b(?:contacts?|compan(?:y|ies)|deals?)\s+(?!in\s+|above\s+|worth\s+|no\s+|with\s+)(.+?)(?:\s+(?:details?|info(rmation)?|about|stage)|\s*$)/i);
        if (entityNameMatch) name = cleanName(entityNameMatch[1]);
    }

    // Pattern 3: "<name> contact/deal/company details"
    if (!name) {
        const nameEntityMatch = input.match(/^(?:show|get|give|list|me|the|\s)*(.+?)\s+(?:contacts?|compan(?:y|ies)|deals?)\s+(?:details?|info(rmation)?|about)/i);
        if (nameEntityMatch) name = cleanName(nameEntityMatch[1]);
    }

    // Pattern 4: "detail/details/info of <name>" (without entity keyword)
    if (!name && action === "detail") {
        const detailOfMatch = input.match(/\b(?:details?|info|about|information)\s+(?:of\s+)?(.+)/i);
        if (detailOfMatch) name = cleanName(detailOfMatch[1]);
    }

    // Pattern 5: Generic detail search (if line starts with detail/info)
    if (!name && /^(detail|details|info|about)\s+(.+)$/i.test(input)) {
        const match = input.match(/^(?:detail|details|info|about)\s+(.+)$/i);
        if (match) name = cleanName(match[1]);
    }

    // ── Advanced Filters ──────────────────────────────────────
    let valueAbove = null;
    let stageName = null;
    let noDeals = false;

    // 1. Value Above (Handles: "above 1 lakh", "greater than 50k", "more than 10000")
    const valueMatch = input.match(/\b(?:above|greater than|more than|worth|valued at)\s+([\d,.]+)\s*(k|lakh|lakhs|m|million|cr|crore)?\b/i);
    if (valueMatch) {
        let val = parseFloat(valueMatch[1].replace(/,/g, ''));
        const unit = (valueMatch[2] || "").toLowerCase();
        if (unit.startsWith("k")) val *= 1000;
        else if (unit.startsWith("lakh")) val *= 100000;
        else if (unit.startsWith("m")) val *= 1000000;
        else if (unit.startsWith("cr")) val *= 10000000;
        valueAbove = val;
    }

    // 2. Stage Name (Handles: "negotiation stage", "lead stage", "in proposal")
    const stageKeywords = ["lead", "qualified", "proposal", "negotiation", "closed won", "closed lost"];
    for (const s of stageKeywords) {
        if (new RegExp(`\\b${s}\\b.*stage`, "i").test(input) || new RegExp(`in\\s+${s}`, "i").test(input)) {
            stageName = s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            break;
        }
    }

    // 3. Relational Filters (Deals)
    if (/\b(no|zero|without)\s+deal(s)?\b/i.test(input)) {
        noDeals = true;
        if (!entity || entity === "deals") entity = "companies";
    } else if (/\b(with|has|having|at least one)\s+deal(s)?\b/i.test(input)) {
        // "companies with deals" -> inverse of noDeals
        // We'll use a new filter property 'withDeals'
        if (!entity || entity === "deals") entity = "companies";
    }

    let withDeals = /\b(with|has|having|at least one)\s+deal(s)?\b/i.test(input);

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
        } else if (action === "suggestions" || action === "followup") {
            entity = "deals"; 
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
        originalMessage: message,
        filter: {
            tier,
            name,
            limit,
            own,
            valueAbove,
            stageName,
            noDeals,
            withDeals,
            withDeals,
            trash: /\b(trash|deleted|archived|archive)\b/i.test(input),
            team: /\b(team|members|colleagues)\b/i.test(input),
            active: /\bdeactivated|inactive\b/i.test(input) ? false : (/\bactive\b/i.test(input) ? true : null)
        }
    };
};

export const getHelpMessage = () => {
    return `Hello! 👋 I'm your **AI Sales Assistant**, and I'm here to help you manage your pipeline more efficiently.

Think of me as a teammate who knows your CRM inside and out. You don't need to use specific commands — just talk to me naturally!

**Here are some things you can ask me to do:**
• *"Show me my **hot deals**"* — I'll find your highest-priority opportunities.
* *"Who are my **active users**?"* — I'll list your current team members.
* *"Give me the **details of Idea Fueled** company"* — I'll pull up a full profile for you.
* *"How many **contacts** do I have in total?"* — I'll give you a quick count.
* *"What is my **total pipeline value**?"* — I'll calculate your overall deal worth.
* *"Which **companies** have no deals yet?"* — I'll identify potential outreach targets.

If I ever get stuck, I'll do my best to guide you back. What can I help you find today?`;
};
