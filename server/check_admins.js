import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const logFile = path.join(__dirname, 'admin_check_results.txt');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function checkAdmins() {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to MongoDB.');

        const UserSchema = new mongoose.Schema({
            role: String,
            isActive: Boolean,
            email: String,
            firstName: String,
            lastName: String
        }, { collection: 'users' }); // Ensure correct collection name

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const admins = await User.find({ role: 'admin' });
        log(`Found ${admins.length} total users with role: 'admin'`);
        admins.forEach(a => {
            log(`- ${a.firstName} ${a.lastName} (${a.email}) | isActive: ${a.isActive}`);
        });

        const activeAdmins = admins.filter(a => a.isActive === true);
        log(`Found ${activeAdmins.length} active admins for notifications.`);

        await mongoose.disconnect();
    } catch (err) {
        log('Error: ' + err.message);
    }
}

checkAdmins();
