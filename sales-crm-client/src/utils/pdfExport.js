import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { toast } from 'react-hot-toast';

/**
 * Exports a specific DOM element to a beautifully formatted PDF.
 * @param {string} elementId - The ID of the DOM element to export
 * @param {string} filename - The desired output filename
 */
export const exportToPDF = async (elementId, filename = 'export.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        toast.error("Export failed: Content not found");
        return;
    }

    // Hide elements with the 'no-print' class temporarily
    const noPrintElements = element.querySelectorAll('.no-print');
    noPrintElements.forEach(el => {
        el.setAttribute('data-original-display', el.style.display || '');
        el.style.display = 'none';
    });

    const loadingToast = toast.loading("Generating PDF...");

    try {
        // To prevent tiny text on wide screens, we force the element to a specific width 
        // that scales beautifully to A4. 900px is a sweet spot for A4 layout.
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        
        element.style.width = '900px';
        element.style.maxWidth = '900px';

        // html-to-image's toCanvas handles modern CSS (oklch, oklab) much better
        const canvas = await toCanvas(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 3, // Increased for higher resolution text
            skipFonts: false,
        });

        // Restore original styles
        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;

        // Calculate PDF dimensions
        // A4 page dimensions in mm (portrait)
        const pdfWidth = 210;
        const pdfHeight = 297;
        const margin = 10;
        
        // Canvas dimensions in pixels
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate the height of the image on the PDF based on the width
        const imgWidth = pdfWidth - (margin * 2); 
        const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // Handle page breaks if content is taller than one page
        let heightLeft = imgHeight;
        let position = margin; 

        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - (margin * 2));

        while (heightLeft > 0) {
            pdf.addPage();
            // Move position to show the next section of the same image
            // Note: This logic for multi-page images in jsPDF can be tricky with single imgData
            // Typically calculating the clip or using negative position works
            position = heightLeft - imgHeight + margin; 
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - (margin * 2));
        }

        // Save PDF
        pdf.save(filename);
        toast.success("PDF Downloaded successfully", { id: loadingToast });
        
    } catch (error) {
        console.error("PDF generation error:", error);
        toast.error("Failed to generate PDF", { id: loadingToast });
    } finally {
        // Restore hidden elements
        noPrintElements.forEach(el => {
            el.style.display = el.getAttribute('data-original-display');
            el.removeAttribute('data-original-display');
        });
    }
};
