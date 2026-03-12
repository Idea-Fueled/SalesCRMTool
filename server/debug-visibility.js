import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models (ensure paths are correct)
import User from './models/userSchema.js';
import { Company } from './models/companySchema.js';
import { Contact } from './models/contactSchema.js';

dotenv.config();

async function debugManagerVisibility() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'firstName lastName role managerId email');
        console.log('\n--- USERS ---');
        users.forEach(u => {
            console.log(`${u.firstName} ${u.lastName} (${u.email}) - Role: ${u.role}, Manager: ${u.managerId || 'None'}`);
        });

        const companies = await Company.find({}, 'name ownerId').limit(10);
        console.log('\n--- COMPANIES (Sample) ---');
        companies.forEach(c => {
            const owner = users.find(u => u._id.toString() === c.ownerId?.toString());
            console.log(`Company: ${c.name}, Owner: ${owner ? `${owner.firstName} (${owner.role})` : c.ownerId}`);
        });

        const contacts = await Contact.find({}, 'firstName lastName ownerId').limit(10);
        console.log('\n--- CONTACTS (Sample) ---');
        contacts.forEach(c => {
            const owner = users.find(u => u._id.toString() === c.ownerId?.toString());
            console.log(`Contact: ${c.firstName} ${c.lastName}, Owner: ${owner ? `${owner.firstName} (${owner.role})` : c.ownerId}`);
        });

        const { Deal } = await import('./models/dealSchema.js');
        const deals = await Deal.find({}, 'name ownerId').limit(10);
        console.log('\n--- DEALS (Sample) ---');
        deals.forEach(d => {
            const owner = users.find(u => u._id.toString() === d.ownerId?.toString());
            console.log(`Deal: ${d.name}, Owner: ${owner ? `${owner.firstName} (${owner.role})` : d.ownerId}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

debugManagerVisibility();
