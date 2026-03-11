import cloudinary from "./config/cloudinary.js";
import fs from "fs";
import path from "path";

const testUpload = async () => {
    try {
        console.log("Starting test upload...");
        
        // Create a dummy PDF content
        const dummyPdfContent = "%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";
        const tempPath = path.join(process.cwd(), "test.pdf");
        fs.writeFileSync(tempPath, dummyPdfContent);

        const isImage = false;
        const uploadOptions = {
            folder: "test_folder",
            resource_type: isImage ? "image" : "raw",
            flags: "attachment",
            timestamp: Math.round(new Date().getTime() / 1000)
        };

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(fs.readFileSync(tempPath));
        });

        console.log("Upload Success!");
        console.log("URL:", result.secure_url);
        console.log("Resource Type:", result.resource_type);
        
        fs.unlinkSync(tempPath);
        process.exit(0);
    } catch (error) {
        console.error("Upload Failed:", error);
        process.exit(1);
    }
};

testUpload();
