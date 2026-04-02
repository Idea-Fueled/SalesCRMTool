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

            // Brand Header (Logo & Title) Focus
            pdf.setFillColor(250, 250, 250); // Very light grey header band
            pdf.rect(0, 0, pageWidth, 35, 'F');
            
            try {
                pdf.addImage(logoImg, 'PNG', margin, 7, 25, 0);
            } catch (err) {
                console.warn('PDF Logo error:', err);
            }

            // Title
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(31, 41, 55); // Dark Slate
            pdf.text(`${type.toUpperCase()} DETAILS`, pageWidth / 2, 26, { align: 'center' });
            
            // Subtitle / Date
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128); // Grey
            pdf.text(`Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN')}`, pageWidth / 2, 32, { align: 'center' });

            // Red dividing baseline
            pdf.setDrawColor(220, 38, 38);
            pdf.setLineWidth(0.8);
            pdf.line(margin, 35, pageWidth - margin, 35);
            
            y = 45;

            const drawSection = (title, items) => {
                if (y > pageHeight - 40) { pdf.addPage(); y = 20; }
                
                // Section Header Background
                pdf.setFillColor(248, 250, 252); // Slate 50
                pdf.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
                
                // Left Accent Border
                pdf.setFillColor(220, 38, 38); // Red 600
                pdf.rect(margin, y - 5, 2, 8, 'F');
                
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text(title.toUpperCase(), margin + 5, y + 0.5);
                y += 7;

                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                
                items.forEach(([label, value], idx) => {
                    if (y > pageHeight - 15) { pdf.addPage(); y = 20; }
                    
                    // Alternating row background for readability
                    if (idx % 2 === 0) {
                        pdf.setFillColor(252, 252, 252);
                        pdf.rect(margin + 2, y - 4, pageWidth - margin * 2 - 4, 6, 'F');
                    }
                    
                    pdf.setTextColor(107, 114, 128); // Lighter Grey
                    pdf.text(`${label}`, margin + 5, y);
                    
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(55, 65, 81); // Darker text
                    pdf.text(String(value || '—'), margin + 55, y);
                    pdf.setFont('helvetica', 'normal');
                    
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
                drawSection('Owner Details', [
                    ['Owner', data.ownerId ? `${data.ownerId.firstName} ${data.ownerId.lastName || ''}`.trim() : '—'],
                    ['Designation', data.ownerId?.role === 'admin' ? 'Admin' : data.ownerId?.role === 'sales_manager' ? 'Sales Manager' : data.ownerId?.role === 'sales_rep' ? 'Sales Representative' : '—'],
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

                if (data.notes) {
                    if (y > pageHeight - 40) { pdf.addPage(); y = 20; }
                    
                    pdf.setFillColor(248, 250, 252);
                    pdf.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
                    pdf.setFillColor(220, 38, 38);
                    pdf.rect(margin, y - 5, 2, 8, 'F');
                    
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(31, 41, 55);
                    pdf.text('OPERATIONAL NOTES', margin + 5, y + 0.5);
                    y += 7;
                    
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(55, 65, 81);
                    const splitNotes = pdf.splitTextToSize(data.notes, pageWidth - margin * 2 - 10);
                    
                    pdf.setFillColor(249, 250, 251); 
                    pdf.rect(margin + 2, y - 3, pageWidth - margin * 2 - 4, (splitNotes.length * 5) + 4, 'F');
                    pdf.setDrawColor(229, 231, 235);
                    pdf.setLineWidth(0.2);
                    pdf.rect(margin + 2, y - 3, pageWidth - margin * 2 - 4, (splitNotes.length * 5) + 4, 'S');

                    pdf.text(splitNotes, margin + 5, y + 2);
                    y += (splitNotes.length * 5) + 8;
                }

                drawSection('Owner Details', [
                    ['Owner', data.ownerId ? `${data.ownerId.firstName} ${data.ownerId.lastName || ''}`.trim() : '—'],
                    ['Designation', data.ownerId?.role === 'admin' ? 'Admin' : data.ownerId?.role === 'sales_manager' ? 'Sales Manager' : data.ownerId?.role === 'sales_rep' ? 'Sales Representative' : '—'],
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
                drawSection('Owner Details', [
                    ['Owner', data.ownerId ? `${data.ownerId.firstName} ${data.ownerId.lastName || ''}`.trim() : '—'],
                    ['Designation', data.ownerId?.role === 'admin' ? 'Admin' : data.ownerId?.role === 'sales_manager' ? 'Sales Manager' : data.ownerId?.role === 'sales_rep' ? 'Sales Representative' : '—'],
                    ['Associated Companies', data.companies?.map(c => c.companyId?.name || c.companyName).filter(Boolean).join(', ') || data.companyName || '—'],
                ]);
            }

            // Remarks Section
            if (data.remarks && Array.isArray(data.remarks) && data.remarks.length > 0) {
                if (y > pageHeight - 40) { pdf.addPage(); y = 20; }
                
                pdf.setFillColor(248, 250, 252);
                pdf.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
                pdf.setFillColor(220, 38, 38);
                pdf.rect(margin, y - 5, 2, 8, 'F');

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text('TIMELINE AND REMARKS', margin + 5, y + 0.5);
                y += 9;

                data.remarks.forEach((remark) => {
                    if (y > pageHeight - 30) { pdf.addPage(); y = 20; }
                    
                    // Boxed styling for remark bubble
                    const authorName = remark.authorName || (remark.author ? `${remark.author.firstName} ${remark.author.lastName || ''}`.trim() : 'Unknown');
                    let remarkHeight = 4;
                    const splitText = remark.text ? pdf.splitTextToSize(remark.text, pageWidth - margin * 2 - 14) : [];
                    remarkHeight += remark.text ? (splitText.length * 5) + 2 : 0;
                    remarkHeight += (remark.files && remark.files.length > 0) ? (remark.files.length * 4) + 4 : 0;
                    
                    if (y + remarkHeight + 6 > pageHeight - 15) { pdf.addPage(); y = 20; }

                    // Card shadow/border emulation
                    pdf.setDrawColor(229, 231, 235);
                    pdf.setLineWidth(0.3);
                    pdf.setFillColor(255, 255, 255);
                    pdf.roundedRect(margin + 2, y, pageWidth - margin * 2 - 4, remarkHeight + 6, 2, 2, 'FD');
                    
                    // Left quote accent
                    pdf.setFillColor(209, 213, 219); // Gray 300
                    pdf.line(margin + 5, y + 2, margin + 5, y + remarkHeight + 4);

                    y += 4;
                    
                    // Header
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(156, 163, 175);
                    pdf.text(`${authorName.toUpperCase()}  •  ${new Date(remark.createdAt).toLocaleString('en-IN')}`, margin + 8, y);
                    y += 6;

                    // Text
                    if (remark.text) {
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'normal');
                        pdf.setTextColor(55, 65, 81);
                        pdf.text(splitText, margin + 8, y);
                        y += (splitText.length * 5) + 2;
                    }

                    // Attachments
                    if (remark.files && remark.files.length > 0) {
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'italic');
                        pdf.setTextColor(99, 102, 241); // Indigo color for attachments
                        remark.files.forEach(file => {
                            pdf.text(`🔗 ${file.fileName}`, margin + 8, y);
                            y += 4;
                        });
                        y += 2;
                    }
                    
                    y += 4; // Space to next remark
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
