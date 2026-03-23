import fetch from "node-fetch";
import cloudinary from "../config/cloudinary.js";

/**
 * Cloudinary can serve some resources as authenticated/private.
 * If that happens, opening the raw Cloudinary delivery URL directly in the browser
 * can fail with `401 Unauthorized`.
 *
 * For our PDFs we upload to `/raw/upload/...`, so we can generate a signed URL
 * server-side and then proxy-fetch it.
 */
const getCloudinaryRawUploadSignedUrlCandidates = (url) => {
    try {
        if (!url || typeof url !== "string") return null;

        const parsed = new URL(url);
        const seg = parsed.pathname.split("/").filter(Boolean);

        // We expect a shape like:
        //   /<cloud_name>/raw/upload/<optional-delivery-flags...>/v<version>/<public_id...>
        // The optional flags (e.g. `fl_attachment:<name>`) may appear between upload and version.
        if (seg.length < 5) return null;
        if ((seg[1] || "").toLowerCase() !== "raw") return null;
        if ((seg[2] || "").toLowerCase() !== "upload") return null;

        const cloudName = seg[0];
        if (cloudName !== cloudinary.config().cloud_name) return null;

        const versionIndex = seg.findIndex((s, idx) => idx >= 3 && /^v?\d+$/i.test(s));
        if (versionIndex < 0) return null;
        if (versionIndex + 1 >= seg.length) return null;

        const versionSeg = seg[versionIndex];
        const publicIdFromUrl = seg.slice(versionIndex + 1).join("/");

        const version = String(versionSeg).replace(/^v/i, "");
        const candidates = [];

        // Candidate 1: keep full public_id exactly as it appears in the URL
        candidates.push(
            cloudinary.url(publicIdFromUrl, {
                resource_type: "raw",
                type: "upload",
                version,
                secure: true,
                sign_url: true,
            })
        );

        // Candidate 2: if the public_id ends with `.pdf`, try moving the extension to `format`.
        // Some Cloudinary raw setups expect format to be separated from public_id for correct signing.
        const pdfMatch = publicIdFromUrl.match(/^(.*)\\.pdf$/i);
        if (pdfMatch) {
            const publicIdNoExt = pdfMatch[1];
            candidates.push(
                cloudinary.url(publicIdNoExt, {
                    resource_type: "raw",
                    type: "upload",
                    version,
                    format: "pdf",
                    secure: true,
                    sign_url: true,
                })
            );
        }

        // De-dupe and filter falsy values
        return [...new Set(candidates)].filter(Boolean);
    } catch {
        return null;
    }
};

export const proxyDownload = async (req, res) => {
    try {
        const { url, fileName } = req.query;
        if (!url) return res.status(400).json({ message: "URL is required" });

        const candidates = getCloudinaryRawUploadSignedUrlCandidates(url) || [];
        // Always try the original URL first, then any signed candidates
        const urlsToTry = [url, ...candidates];

        let response = null;
        for (const u of urlsToTry) {
            response = await fetch(u);
            if (response.ok) break;
        }

        if (!response || !response.ok) {
            console.error("Cloudinary proxy download failed", {
                attempted: urlsToTry,
                lastStatus: response?.status,
                lastStatusText: response?.statusText
            });
            throw new Error(`Failed to fetch from Cloudinary: ${response?.status} ${response?.statusText || ""}`.trim());
        }

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

export const proxyView = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ message: "URL is required" });

        const candidates = getCloudinaryRawUploadSignedUrlCandidates(url) || [];
        // Always try the original URL first, then any signed candidates
        const urlsToTry = [url, ...candidates];

        let response = null;
        for (const u of urlsToTry) {
            response = await fetch(u);
            if (response.ok) break;
        }

        if (!response || !response.ok) {
            console.error("Cloudinary proxy view failed", {
                attempted: urlsToTry,
                lastStatus: response?.status,
                lastStatusText: response?.statusText
            });
            throw new Error(`Failed to fetch from Cloudinary: ${response?.status} ${response?.statusText || ""}`.trim());
        }

        // Set headers for inline viewing
        // Forcing application/pdf for PDFs helps browsers open them natively
        // We strip query params before checking extension to make it more robust
        const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Content-Type', isPdf ? 'application/pdf' : (response.headers.get('content-type') || 'application/octet-stream'));

        // Streaming for performance
        response.body.pipe(res);
    } catch (error) {
        console.error("Proxy View Error:", error);
        res.status(500).json({ message: "Failed to proxy view" });
    }
};
