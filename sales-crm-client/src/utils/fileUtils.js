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
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'download.pdf';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        toast.success("Download started", { id: toastId });
    } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to download file. Please try opening it first.", { id: toastId });
    }
};
