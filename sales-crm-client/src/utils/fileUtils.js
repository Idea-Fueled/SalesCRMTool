import { toast } from "react-hot-toast";

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".webp", ".png", ".pdf", ".doc", ".docx"];
export const ALLOWED_EXTENSIONS_STRING = ALLOWED_EXTENSIONS.join(",");

/**
 * Validates files based on allowed extensions.
 * @param {File[]} files - Selected files
 * @returns {File[]} - Array of valid files
 */
export const validateFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
        const fileName = file.name.toLowerCase();
        const isValid = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
        
        if (isValid) {
            validFiles.push(file);
        } else {
            invalidFiles.push(file.name);
        }
    });

    if (invalidFiles.length > 0) {
        toast.error(`Unsupported file(s): ${invalidFiles.join(", ")}. Allowed: ${ALLOWED_EXTENSIONS_STRING}`);
    }

    return validFiles;
};


/**
 * Downloads a file from a URL by fetching it and creating a blob.
 * This is more reliable than simple clicks for cross-origin resources.
 * @param {string} url - The URL of the file to download
 * @param {string} fileName - The name to save the file as
 */
export const downloadFile = async (url, fileName) => {
    if (!url) {
        toast.error("Invalid file URL");
        return;
    }

    const toastId = toast.loading(`Preparing ${fileName || 'download'}...`);

    try {
        // Use the backend proxy for downloads to bypass CORS and Cloudinary bucket restrictions.
        // This ensures the custom fileName is applied via Content-Disposition headers.
        const apiBaseUrl =
            import.meta.env.MODE === "development"
                ? "http://localhost:8000/api"
                : `${(import.meta.env.VITE_BASE_URL || "").trim()}/api`;
        const proxyUrl = `${apiBaseUrl}/files/download?url=${encodeURIComponent(url)}&fileName=${encodeURIComponent(fileName)}`;

        // We use window.location.assign because the proxy handles the attachment headers.
        // This triggers the browser's native download dialog reliably.
        window.location.assign(proxyUrl);
        
        setTimeout(() => {
            toast.success("Download started", { id: toastId });
        }, 1500);

    } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to download file. Please try opening it first.", { id: toastId });
    }
};

/**
 * Opens a file in a new tab using window.open.
 * This is the preferred way for PDFs to avoid iframe/CORS issues.
 * @param {string} url - The URL of the file to view
 */
export const viewFile = (url) => {
    if (!url || url === "#") {
        toast.error("Invalid file URL");
        return;
    }

    // If the file lives in Cloudinary, use our backend proxy.
    // This avoids `401 Unauthorized` for private/authenticated Cloudinary assets.
    if (url.includes("cloudinary.com") || url.includes("res.cloudinary.com")) {
        const apiBaseUrl =
            import.meta.env.MODE === "development"
                ? "http://localhost:8000/api"
                : `${(import.meta.env.VITE_BASE_URL || "").trim()}/api`;
        const proxyUrl = `${apiBaseUrl}/files/view?url=${encodeURIComponent(url)}`;
        window.open(proxyUrl, "_blank", "noopener,noreferrer");
        return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
};
