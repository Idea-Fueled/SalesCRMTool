import { jsPDF } from 'jspdf';
import logoImg from '../assets/Logo.png';
import { toCanvas } from 'html-to-image';
import { toast } from 'react-hot-toast';

/**
 * Exports data or a specific DOM element to a beautifully formatted, high-quality PDF.
 * @param {string|object} TypeOrElementId - Either the entity type ('deal', 'company', 'contact') or the ID of the DOM element to fallback on
 * @param {object|string} DataOrFilename - Either the data object of the entity or the desired output filename
 * @param {string} [OptionalFilename] - The desired output filename if data was provided
 */
export const exportToPDF = async (TypeOrElementId, DataOrFilename, OptionalFilename) => {
    // Determine if we're using the new data-based approach or the old element-based approach
    const isDataBased = typeof DataOrFilename === 'object' && DataOrFilename !== null;
    const type = isDataBased ? TypeOrElementId : null;
    const data = isDataBased ? DataOrFilename : null;
    const filename = isDataBased ? OptionalFilename : DataOrFilename || 'export.pdf';
    const elementId = !isDataBased ? TypeOrElementId : null;

    const loadingToast = toast.loading(`Generating ${isDataBased ? type : ''} PDF...`);

    try {
        if (isDataBased) {
            // --- HIGH-QUALITY TEXT-BASED GENERATION ---
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            let y = 15;

            // Brand Header (Logo & Title)
            try {
                // Width 35mm, 0 for auto aspect ratio
                pdf.addImage(logoImg, 'PNG', margin, 10, 35, 0);
            } catch (err) {
                console.warn('PDF Logo error:', err);
            }

            y = 40;
            // Title
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(239, 68, 68); // Red-500
            pdf.text(`${type.toUpperCase()} DETAILS`, margin, y);
            y += 8;

            y += 8;

            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.4);
            pdf.line(margin, y, pageWidth - margin, y);
            y += 12;

            const drawSection = (title, items) => {
                if (y > pageHeight - 40) { pdf.addPage(); y = 20; }
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text(title.toUpperCase(), margin, y);
                y += 6;

                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                items.forEach(([label, value]) => {
                    if (y > pageHeight - 15) { pdf.addPage(); y = 20; }
                    pdf.setTextColor(107, 114, 128);
                    pdf.text(`${label}:`, margin + 2, y);
                    pdf.setTextColor(31, 41, 55);
                    pdf.text(String(value || '—'), margin + 45, y);
                    y += 6;
                });
                y += 6;
            };

            if (type === 'deal') {
                drawSection('Commercial Parameters', [
                    ['Deal Name', data.name],
                    ['Pipeline Stage', data.stage],
                    ['Deal Value', data.value ? `${data.currency || '$'}${Number(data.value).toLocaleString()}` : '—'],
                    ['Win Probability', data.probability ? `${data.probability}%` : '—'],
                    ['Expected Close', data.expectedCloseDate ? new Date(data.expectedCloseDate).toLocaleDateString('en-IN') : '—'],
                    ['Lead Source', data.source || 'Direct Identification'],
                ]);
                drawSection('Ownership', [
                    ['Owner', data.ownerId ? `${data.ownerId.firstName} ${data.ownerId.lastName || ''}`.trim() : '—'],
                    ['Company', data.companyId?.name || data.companyName || '—'],
                    ['Primary Contact', data.contactId ? `${data.contactId.firstName} ${data.contactId.lastName || ''}`.trim() : (data.contactName || '—')],
                ]);
            } else if (type === 'company') {
                drawSection('Operational Identity', [
                    ['Company Name', data.name],
                    ['Industry', data.industry || 'General Industry'],
                    ['Website', data.website],
                    ['Email Address', data.email],
                    ['Phone', data.phone],
                    ['Headquarters', data.address],
                    ['Company Size', data.size ? `${data.size} Employees` : '—'],
                    ['Revenue Range', data.revenueRange ? `$${data.revenueRange.toLocaleString()}` : '—'],
                ]);
                drawSection('Ownership', [
                    ['Owner', data.ownerId ? `${data.ownerId.firstName} ${data.ownerId.lastName || ''}`.trim() : '—'],
                    ['Account Status', data.status || 'Prospect'],
                ]);
            } else if (type === 'contact') {
                drawSection('Contact Channels', [
                    ['Full Name', `${data.firstName} ${data.lastName || ''}`.trim()],
                    ['Job Title', data.jobTitle],
                    ['Email', data.email],
                    ['Phone / Mobile', data.phone || data.mobile],
                    ['LinkedIn', data.linkedin || '—'],
                ]);
                drawSection('Executive Ownership', [
                    ['Executive Owner', data.ownerId ? `${data.ownerId.firstName} ${data.ownerId.lastName || ''}`.trim() : '—'],
                    ['Associated Companies', data.companies?.map(c => c.companyId?.name || c.companyName).filter(Boolean).join(', ') || data.companyName || '—'],
                ]);
            }

            // Remarks Section
            if (data.remarks && Array.isArray(data.remarks) && data.remarks.length > 0) {
                if (y > pageHeight - 40) { pdf.addPage(); y = 20; }
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text('REMARK', margin, y);
                y += 8;

                data.remarks.forEach((remark) => {
                    if (y > pageHeight - 30) { pdf.addPage(); y = 20; }
                    
                    // Remark Header (Author & Date)
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(107, 114, 128);
                    const authorName = remark.authorName || (remark.author ? `${remark.author.firstName} ${remark.author.lastName || ''}`.trim() : 'Unknown');
                    pdf.text(`${authorName.toUpperCase()}  •  ${new Date(remark.createdAt).toLocaleString('en-IN')}`, margin + 2, y);
                    y += 5;

                    // Remark Text
                    if (remark.text) {
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'normal');
                        pdf.setTextColor(55, 65, 81);
                        
                        const splitText = pdf.splitTextToSize(remark.text, pageWidth - margin * 2 - 10);
                        pdf.text(splitText, margin + 2, y);
                        y += (splitText.length * 5) + 2;
                    }

                    // Attachments
                    if (remark.files && remark.files.length > 0) {
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'italic');
                        pdf.setTextColor(107, 114, 128);
                        remark.files.forEach(file => {
                            if (y > pageHeight - 15) { pdf.addPage(); y = 20; }
                            pdf.text(`[Attachment: ${file.fileName}]`, margin + 2, y);
                            y += 4;
                        });
                        y += 2;
                    }

                    // Small separator line
                    y += 2;
                    pdf.setDrawColor(243, 244, 246);
                    pdf.setLineWidth(0.2);
                    pdf.line(margin + 2, y - 2, pageWidth - margin - 2, y - 2);
                    y += 2;
                });
            }

            // Footer
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(156, 163, 175);
                pdf.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 10);
            }

            pdf.save(filename);
            toast.success("PDF Downloaded successfully", { id: loadingToast });
            return;
        }

        // --- FALLBACK TO SCREENSHOT ---
        const element = document.getElementById(elementId);
        if (!element) {
            toast.error("Export failed: Content not found", { id: loadingToast });
            return;
        }

        const noPrintElements = element.querySelectorAll('.no-print');
        noPrintElements.forEach(el => {
            el.setAttribute('data-original-display', el.style.display || '');
            el.style.display = 'none';
        });

        const style = document.createElement('style');
        style.innerHTML = `
            #${elementId} *::-webkit-scrollbar { display: none !important; }
            #${elementId} * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        `;
        document.head.appendChild(style);

        const canvas = await toCanvas(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 3, // Increased pixels for better crispness
        });

        document.head.removeChild(style);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210;
        const imgWidth = pdfWidth - 20; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
        pdf.save(filename);

        noPrintElements.forEach(el => {
            el.style.display = el.getAttribute('data-original-display');
            el.removeAttribute('data-original-display');
        });

        toast.success("PDF Downloaded successfully", { id: loadingToast });
    } catch (error) {
        console.error("PDF generation error:", error);
        toast.error("Failed to generate PDF", { id: loadingToast });
    }
};
