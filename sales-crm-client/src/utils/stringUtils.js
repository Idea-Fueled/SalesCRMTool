/**
 * Truncates a name based on the following rules:
 * - If the name has 5 or more words, show only the first 3 words followed by "..."
 * - Otherwise, return the full name.
 * 
 * @param {string} name - The name to truncate
 * @returns {string} - The truncated name
 */
export const truncateName = (name) => {
    if (!name) return "";
    const words = name.trim().split(/\s+/);
    if (words.length >= 5) {
        return words.slice(0, 3).join(" ") + "...";
    }
    return name;
};
