import cron from "node-cron";
import { Deal } from "../models/dealSchema.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";

/**
 * Cleanup job to permanently delete records that have been archived (isDeleted: true)
 * for more than 30 days.
 */
const cleanupArchivedRecords = async () => {
    try {
        console.log("[Archive Cleanup] Starting daily cleanup job...");
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const query = {
            isDeleted: true,
            deletedAt: { $lt: thirtyDaysAgo }
        };

        const [deletedDeals, deletedCompanies, deletedContacts] = await Promise.all([
            Deal.deleteMany(query),
            Company.deleteMany(query),
            Contact.deleteMany(query)
        ]);

        console.log(`[Archive Cleanup] Completed. Permanently deleted: 
            - Deals: ${deletedDeals.deletedCount}
            - Companies: ${deletedCompanies.deletedCount}
            - Contacts: ${deletedContacts.deletedCount}`);

    } catch (error) {
        console.error("[Archive Cleanup] Error during cleanup:", error);
    }
};

/**
 * Initializes the cron job to run every day at midnight.
 */
export const initArchiveCleanupJob = () => {
    // Run every day at 00:00 (midnight)
    cron.schedule("0 0 * * *", () => {
        cleanupArchivedRecords();
    });

    console.log("[Archive Cleanup] Scheduled task initialized (Daily at Midnight)");
    
    // Optional: Run once on startup to catch any missed jobs if the server was down
    // cleanupArchivedRecords(); 
};
