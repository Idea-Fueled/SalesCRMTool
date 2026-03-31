import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `
You are an intelligent AI assistant for a Sales CRM system. Your job is to understand any user query written in natural language and convert it into structured JSON for backend processing.

Extract:
- action: "list", "detail", "count", "aggregate"
- entity: "deals", "contacts", "companies", "users", "reports"
- filters: optional object (tier, value, stage, owner, name, activity, trash, team, etc.)
- limit: number (if user says top N)
- detail: true if user asks for details of multiple items (e.g. "show all user details")

Rules:
- "each", "every", "all" → means ALL items (NOT a name)
- "owner": Map person names here when referring to whoever owns/has the deals (e.g. "Sandeep", "Rahul"). DO NOT put owner names in 'name'.
- "name": ONLY use this for specific deal titles (e.g. "Enterprise License"), contact titles (if entity is contacts), or company titles (if entity is companies).
- If user asks for "deleted", "trash", or "archive" → set "trash": true in filters.
- If user asks for "my team", "members", or "colleagues" → use entity="users" and filter "team": true.
- If user asks for stats, totals, or dashboard info → use entity="reports" and action="aggregate".
- Never assume random words as names
- Understand flexible queries

Return ONLY valid JSON. No explanation.

Examples:

Input: "give detail of each deal"
Output:
{
  "action": "list",
  "entity": "deals",
  "detail": true
}

Input: "top 5 deals"
Output:
{
  "action": "list",
  "entity": "deals",
  "limit": 5
}
`;

export const getAIIntent = async (message) => {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is missing");
    }

    try {
        const res = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "mistralai/mistral-7b-instruct:free",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: message }
                ],
                temperature: 0.1
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 8000
            }
        );

        const content = res.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");

        // Clean markdown if present
        const cleaned = content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        // ✅ FINAL NORMALIZED OUTPUT
        const normalized = {
            action: parsed.action || "list",
            entity: parsed.entity || "deals",
            filters: parsed.filters || {},
            detail: parsed.detail || false,
            limit: parsed.limit || null,
            originalMessage: message
        };

        // Optional mapping
        if (normalized.filters.value === "high") {
            normalized.filters.valueAbove = 50000;
        }

        if (
            normalized.filters.activity === "inactive" ||
            message.toLowerCase().includes("inactive")
        ) {
            normalized.filters.inactive = true;
        }

        // Handle "my" queries explicitly (as personal ownership)
        if (message.toLowerCase().includes("my ")) {
            normalized.filters.owner = "me";
        }

        // Handle "trash/deleted" queries
        if (message.toLowerCase().match(/\b(trash|deleted|archived|archive)\b/i)) {
            normalized.filters.trash = true;
        }

        // Handle "active/deactivated" queries
        if (message.toLowerCase().match(/\b(deactivated|inactive)\b/i)) {
            normalized.filters.active = false;
        } else if (message.toLowerCase().match(/\bactive\b/i)) {
            normalized.filters.active = true;
        }

        // Handle "team" queries
        if (message.toLowerCase().match(/\b(team|members|colleagues)\b/i)) {
            normalized.entity = "users";
            normalized.filters.team = true;
        }

        // Handle "stats/reports" queries
        if (message.toLowerCase().match(/\b(stats|report|dashboard|summary|total)\b/i) && !message.toLowerCase().includes("total value")) {
            normalized.entity = "reports";
            normalized.action = "aggregate";
        }

        return normalized;

    } catch (error) {
        console.error("AI Intent Error:", error.message);
        throw error; // Let the caller (chatbotController) fall back to rule-based parser
    }
};