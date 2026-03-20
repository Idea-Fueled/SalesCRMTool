import { toast } from "react-hot-toast";

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
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://sales-crm-tool-nu.vercel.app/api'; 
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
