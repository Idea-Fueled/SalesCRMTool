import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

const missingKeys = [];
if (!process.env.CLOUDINARY_CLOUD_NAME) missingKeys.push("CLOUDINARY_CLOUD_NAME");
if (!process.env.CLOUDINARY_API_KEY) missingKeys.push("CLOUDINARY_API_KEY");
if (!process.env.CLOUDINARY_API_SECRET) missingKeys.push("CLOUDINARY_API_SECRET");

if (missingKeys.length > 0) {
    console.error(`FATAL: Missing Cloudinary configuration: ${missingKeys.join(", ")}`);
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

export default cloudinary;