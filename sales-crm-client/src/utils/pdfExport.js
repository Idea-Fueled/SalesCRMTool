import html2pdf from 'html2pdf.js';
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
        el.setAttribute('data-original-display', el.style.display);
        el.style.display = 'none';
    });

    const opt = {
        margin: [10, 10, 10, 10], // top, left, bottom, right
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const loadingToast = toast.loading("Generating PDF...");

    try {
        await html2pdf().set(opt).from(element).save();
        toast.success("PDF Downloaded successfully", { id: loadingToast });
    } catch (error) {
        console.error("PDF generation error:", error);
        toast.error("Failed to generate PDF", { id: loadingToast });
    } finally {
        // Restore hidden elements
        noPrintElements.forEach(el => {
            el.style.display = el.getAttribute('data-original-display') || '';
            el.removeAttribute('data-original-display');
        });
    }
};
