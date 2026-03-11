import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

export const uploadToCloudinary = async (file, folder = "deals") => {
    console.log("--- Cloudinary Upload Debug ---");
    console.log("Current Server Time:", new Date().toString());
    console.log("Current Timestamp (s):", Math.round(new Date().getTime() / 1000));
    console.log("Config Cloud Name:", cloudinary.config().cloud_name);
    console.log("Config API Key:", cloudinary.config().api_key ? "Present" : "Missing");
    console.log("Config API Secret:", cloudinary.config().api_secret ? "Present" : "Missing");

    const isImage = file.mimetype.startsWith("image/");
    
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder,
            resource_type: isImage ? "image" : "raw",
            flags: "attachment", // Force download headers to avoid browser rendering errors
            timestamp: Math.round(new Date().getTime() / 1000)
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return reject(error);
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                });
            }
        );
        uploadStream.end(file.buffer);
    });
};

export const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
    }
};
