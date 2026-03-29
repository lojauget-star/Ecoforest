
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { PlanResponse } from '../types';

interface PdfTranslations {
    title: string;
    recommendation_title: string;
    sketch_title: string;
    schedule_title: string;
    schedule_col_species: string;
    schedule_col_year: string;
    schedule_col_strata: string;
    schedule_year_prefix: string;
    references_title: string;
}

// Helper to add wrapped text to the PDF, returns the new Y position
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    // 11pt font size, estimate line height to be around 5mm
    return y + (lines.length * 5);
};

export const generatePlanPdf = async (
    plan: PlanResponse, 
    sketchElement: HTMLElement | null,
    translations: PdfTranslations
): Promise<void> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    const checkPageBreak = () => {
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    // --- Title ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(translations.title, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // --- Explanations Section ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(translations.recommendation_title, margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    // jsPDF doesn't render some unicode characters like bullet points well
    const sanitizedExplanation = plan.explanations.replace(/•/g, '-');
    y = addWrappedText(doc, sanitizedExplanation, margin, y, contentWidth);
    y += 10;
    
    checkPageBreak();

    // --- Sketch Section ---
    if (sketchElement) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(translations.sketch_title, margin, y);
        y += 8;

        try {
            const canvas = await html2canvas(sketchElement, { 
                scale: 2, // Increase resolution for better quality
                backgroundColor: '#ffffff' // Ensure a solid background
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (y + imgHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
            y += imgHeight + 10;

        } catch (error) {
            console.error("Could not generate canvas from sketch element:", error);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('Error generating sketch image.', margin, y);
            y += 10;
        }
    }
    
    checkPageBreak();

    // --- Schedule Section ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(translations.schedule_title, margin, y);
    y += 8;

    // Table Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(translations.schedule_col_species, margin, y);
    doc.text(translations.schedule_col_year, margin + 80, y);
    doc.text(translations.schedule_col_strata, margin + 120, y);
    y += 7;
    doc.setDrawColor(180); // light grey line
    doc.line(margin, y - 2.5, pageWidth - margin, y - 2.5);

    // Table Body
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    plan.succession_schedule.forEach(step => {
        checkPageBreak();
        doc.text(step.species, margin, y);
        doc.text(`${translations.schedule_year_prefix} ${step.plant_year}`, margin + 80, y);
        const strata = step.strata ? step.strata.charAt(0).toUpperCase() + step.strata.slice(1) : 'N/A';
        doc.text(strata, margin + 120, y);
        y += 7;
    });
    y += 5;
    
    checkPageBreak();

    // --- References Section ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(translations.references_title, margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    plan.references.forEach(ref => {
        checkPageBreak();
        // Add bullet point manually
        doc.text('-', margin, y);
        y = addWrappedText(doc, ref.title, margin + 3, y, contentWidth - 3);
        y += 1; // small gap between refs
    });

    // --- Save the PDF ---
    doc.save(`agroforestry-plan-${plan.plan_id}.pdf`);
};