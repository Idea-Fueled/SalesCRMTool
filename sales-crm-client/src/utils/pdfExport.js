import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
        // Render the element to a canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Calculate PDF dimensions
        // A4 page dimensions in mm (portrait)
        const pdfWidth = 210;
        const pdfHeight = 297;
        
        // Canvas dimensions in pixels
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate the height of the image on the PDF based on the width
        const imgWidth = pdfWidth - 20; // 10mm margins on both sides
        const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // Handle page breaks if content is taller than one page
        let heightLeft = imgHeight;
        let position = 10; // 10mm top margin

        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20); // 10mm top & bottom margins

        while (heightLeft > 0) {
            position = heightLeft - imgHeight; 
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 10, position + 10, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);
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
