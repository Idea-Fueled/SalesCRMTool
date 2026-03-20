import fetch from "node-fetch";

export const proxyDownload = async (req, res) => {
    try {
        const { url, fileName } = req.query;
        if (!url) return res.status(400).json({ message: "URL is required" });

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from Cloudinary: ${response.statusText}`);

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'download'}"`);
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

        // Streaming for performance
        response.body.pipe(res);
    } catch (error) {
        console.error("Proxy Download Error:", error);
        res.status(500).json({ message: "Failed to proxy download" });
    }
};
