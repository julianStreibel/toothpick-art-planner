import jsPDF from 'jspdf';
import type { ToothpickPosition } from '../types';

type ExportConfig = {
  targetWidthMM?: number; // desired physical width
  dotSizeMM?: number; // dot diameter
  paper?: 'A4' | 'Letter' | 'A3' | 'Custom';
  paperWMM?: number; // for Custom
  paperHMM?: number; // for Custom
  marginMM?: number;
  overlapMM?: number;
  gridMM?: number; // 0 off, otherwise spacing
  legend?: boolean;
};

export function exportTemplate(
  toothpicks: ToothpickPosition[],
  imageWidth: number,
  imageHeight: number,
  filename: string = 'toothpick_template.pdf',
  config: ExportConfig = {}
): void {
  // Page sizes in mm
  const presetSizes: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    Letter: { w: 215.9, h: 279.4 },
    A3: { w: 297, h: 420 }
  };
  const paper = config.paper || 'A4';
  const pageWidth = paper === 'Custom' ? (config.paperWMM || 210) : presetSizes[paper].w;
  const pageHeight = paper === 'Custom' ? (config.paperHMM || 297) : presetSizes[paper].h;
  const margin = 5; // fixed 5 mm (0.5 cm)
  const overlap = config.overlapMM ?? 5;
  const dotSize = 2.0; // standard toothpick ~2.0 mm
  const grid = 0; // grid disabled
  
  // Compute scale based on target width
  const targetWidthMM = config.targetWidthMM ?? Math.min(pageWidth - 2 * margin, (pageHeight - 2 * margin) * (imageWidth / imageHeight));
  const scale = targetWidthMM / imageWidth; // mm per image unit
  
  // Tiling: compute drawable box per page (minus margins and overlap)
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const innerW = pageWidth - 2 * margin;
  const innerH = pageHeight - 2 * margin;
  const tileW = innerW - overlap;
  const tileH = innerH - overlap;
  const cols = Math.max(1, Math.ceil((drawWidth + overlap) / tileW));
  const rows = Math.max(1, Math.ceil((drawHeight + overlap) / tileH));
  
  const pdf = new jsPDF({ orientation: pageWidth > pageHeight ? 'landscape' : 'portrait', unit: 'mm', format: [pageWidth, pageHeight] });
  
  const drawHeader = (_pageX: number, _pageY: number, pageIndex: number, totalPages: number) => {
    pdf.setFontSize(10);
    pdf.text(`Toothpick Template  •  Page ${pageIndex + 1}/${totalPages}  •  Print at 100%`, margin, margin - 2);
    // scale bar 50mm
    pdf.setDrawColor(0); pdf.setLineWidth(0.2);
    const barX = pageWidth - margin - 60; const barY = margin - 4;
    pdf.line(barX, barY, barX + 50, barY);
    pdf.text('50 mm', barX + 20, barY - 1);
  };
  // grid disabled – function removed
  
  // Iterate tiles
  const totalPages = cols * rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r !== 0 || c !== 0) pdf.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? 'landscape' : 'portrait');
      drawHeader(c, r, r * cols + c, totalPages);
      const originX = c * (tileW);
      const originY = r * (tileH);
      const pageOx = margin - (c > 0 ? overlap : 0);
      const pageOy = margin - (r > 0 ? overlap : 0);
      const pageW = innerW + (c > 0 ? overlap : 0);
      const pageH = innerH + (r > 0 ? overlap : 0);
      // page frame
      pdf.setDrawColor(0); pdf.setLineWidth(0.2);
      pdf.rect(pageOx, pageOy, pageW, pageH);
      // Mark overlay boundary lines (end of overlap) so assembly is clear
      pdf.setDrawColor(150); pdf.setLineWidth(0.2); pdf.setLineDash([1.5, 1.5], 0);
      if (c > 0 && overlap > 0) {
        const xBound = pageOx + overlap;
        pdf.line(xBound, pageOy, xBound, pageOy + pageH);
      }
      if (r > 0 && overlap > 0) {
        const yBound = pageOy + overlap;
        pdf.line(pageOx, yBound, pageOx + pageW, yBound);
      }
      pdf.setLineDash([] as any, 0);

      // dots on this tile
      toothpicks.forEach((tp) => {
        const px = tp.x * scale; const py = tp.y * scale;
        if (px >= originX - overlap && px <= originX + tileW && py >= originY - overlap && py <= originY + tileH) {
          const xPos = pageOx + (px - originX);
          const yPos = pageOy + (py - originY);
          pdf.setFillColor(tp.color[0], tp.color[1], tp.color[2]);
          pdf.circle(xPos, yPos, dotSize / 2, 'F'); // no border
        }
      });
    }
  }
  
  // Legend page
  if (config.legend) {
    pdf.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? 'landscape' : 'portrait');
    pdf.setFontSize(14); pdf.text('Color Legend', margin, margin);
    const counts = new Map<string, { rgb: [number, number, number]; n: number }>();
    toothpicks.forEach(tp => {
      const key = tp.color.join(',');
      const e = counts.get(key);
      if (e) e.n++; else counts.set(key, { rgb: tp.color, n: 1 });
    });
    const entries = Array.from(counts.values()).sort((a,b)=>b.n-a.n);
    const xStart = margin; let y = margin + 8; const rowH = 8; const sw = 10;
    pdf.setFontSize(9);
    for (const e of entries) {
      if (y > pageHeight - margin) { pdf.addPage([pageWidth,pageHeight]); y = margin; }
      pdf.setFillColor(e.rgb[0], e.rgb[1], e.rgb[2]);
      pdf.rect(xStart, y-5, sw, sw, 'F');
      const hex = '#'+e.rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
      pdf.text(`${hex}  •  ${e.n}`, xStart + sw + 4, y);
      y += rowH;
    }
  }
  
  // Save the PDF
  pdf.save(filename);
}
