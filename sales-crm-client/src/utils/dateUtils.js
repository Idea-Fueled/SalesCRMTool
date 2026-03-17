/**
 * Utility functions for date-related logic in the CRM.
 */

/**
 * Checks if a deal is considered overdue.
 * A deal is overdue if its expected close date is in the past
 * and it is not in a closed stage (Won or Lost).
 * 
 * @param {Object} deal - The deal object
 * @returns {boolean} - True if overdue, false otherwise
 */
export const isDealOverdue = (deal) => {
    if (!deal || !deal.expectedCloseDate || deal.stage === 'Closed Won' || deal.stage === 'Closed Lost') {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Check context of the day
    
    const closeDate = new Date(deal.expectedCloseDate);
    closeDate.setHours(0, 0, 0, 0);

    return closeDate < today;
};
