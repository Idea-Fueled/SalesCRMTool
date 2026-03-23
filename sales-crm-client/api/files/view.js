export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch the file' });
        }

        const buffer = await response.arrayBuffer();
        
        // Detect if it's a PDF to set appropriate headers
        const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
        
        res.setHeader('Content-Type', isPdf ? 'application/pdf' : (response.headers.get('content-type') || 'application/octet-stream'));
        res.setHeader('Content-Disposition', 'inline');
        
        // Send the buffer as the response body
        res.status(200).send(Buffer.from(buffer));
    } catch (error) {
        console.error('PDF Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
