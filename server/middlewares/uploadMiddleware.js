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
    return new Promise((resolve, reject) => {
        // Sanitize filename: letters, numbers, _ or - only (no spaces), preserve extension
        const cleanBaseName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[^\w.-]+/g, '_');
        const extension = file.originalname.split('.').pop();
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        // Handle resource type
        const isImage = file.mimetype.startsWith("image/");
        const isVideo = file.mimetype.startsWith("video/");
        const resourceType = isImage ? "image" : (isVideo ? "video" : "raw");

        // Use extension in public_id ONLY for raw files to avoid double extension for images/videos
        const customPublicId = resourceType === "raw" 
            ? `${cleanBaseName}_${timestamp}.${extension}` 
            : `${cleanBaseName}_${timestamp}`;

        const uploadOptions = {
            folder,
            public_id: customPublicId,
            resource_type: resourceType,
            timestamp: timestamp
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return reject(error);
                }
                
                // For raw files, we don't apply transformations in the standard URL usually,
                // but fl_attachment can be appended if the URL structure allows it.
                // However, for raw files on some Cloudinary setups, the secure_url is best used as is.
                let finalUrl = result.secure_url;
                
                resolve({
                    url: finalUrl,
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
