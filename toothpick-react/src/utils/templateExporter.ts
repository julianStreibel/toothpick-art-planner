import jsPDF from 'jspdf';
import type { ToothpickPosition } from '../types';

export function exportTemplate(
  toothpicks: ToothpickPosition[],
  imageWidth: number,
  imageHeight: number,
  filename: string = 'toothpick_template.pdf'
): void {
  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  
  // Calculate scale to fit on page
  const maxWidth = pageWidth - 2 * margin;
  const maxHeight = pageHeight - 2 * margin;
  
  const scaleX = maxWidth / imageWidth;
  const scaleY = maxHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);
  
  // Center the drawing
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = margin + (maxWidth - drawWidth) / 2;
  const offsetY = margin + (maxHeight - drawHeight) / 2;
  
  // Create PDF
  const pdf = new jsPDF({
    orientation: drawWidth > drawHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Title
  pdf.setFontSize(16);
  pdf.text('Toothpick Art Template', pageWidth / 2, margin / 2, { align: 'center' });
  
  // Info text
  pdf.setFontSize(10);
  pdf.text(`Dimensions: ${imageWidth} x ${imageHeight} units`, margin, margin - 2);
  pdf.text(`Total toothpicks: ${toothpicks.length}`, margin, margin + 2);
  pdf.text(`Scale: 1:${(1 / scale).toFixed(2)}`, pageWidth - margin, margin - 2, { align: 'right' });
  
  // Draw border
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.rect(offsetX, offsetY, drawWidth, drawHeight);
  
  // Draw grid lines (every 10 units)
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.1);
  
  // Vertical lines
  for (let x = 10; x < imageWidth; x += 10) {
    const drawX = offsetX + x * scale;
    pdf.line(drawX, offsetY, drawX, offsetY + drawHeight);
  }
  
  // Horizontal lines
  for (let y = 10; y < imageHeight; y += 10) {
    const drawY = offsetY + y * scale;
    pdf.line(offsetX, drawY, offsetX + drawWidth, drawY);
  }
  
  // Draw toothpick positions
  pdf.setDrawColor(0);
  toothpicks.forEach((toothpick, index) => {
    const x = offsetX + toothpick.x * scale;
    const y = offsetY + toothpick.y * scale;
    
    // Draw dot for position
    pdf.setFillColor(
      toothpick.color[0],
      toothpick.color[1],
      toothpick.color[2]
    );
    pdf.circle(x, y, 0.5, 'F');
    
    // Add number for first few toothpicks (to show order)
    if (index < 20) {
      pdf.setFontSize(6);
      pdf.text((index + 1).toString(), x + 1, y - 1);
    }
  });
  
  // Color legend (if space permits)
  if (pageHeight - (offsetY + drawHeight) > 30) {
    const legendY = offsetY + drawHeight + 10;
    pdf.setFontSize(10);
    pdf.text('Color Legend:', margin, legendY);
    
    // Get unique colors
    const uniqueColors = new Map<string, [number, number, number]>();
    toothpicks.forEach(tp => {
      const key = tp.color.join(',');
      if (!uniqueColors.has(key)) {
        uniqueColors.set(key, tp.color);
      }
    });
    
    // Draw color swatches
    let colorX = margin;
    let colorY = legendY + 5;
    let colorIndex = 0;
    
    uniqueColors.forEach((color, key) => {
      if (colorIndex > 0 && colorIndex % 10 === 0) {
        colorY += 6;
        colorX = margin;
      }
      
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(colorX, colorY, 5, 5, 'F');
      
      colorX += 6;
      colorIndex++;
      
      // Limit to 30 colors
      if (colorIndex >= 30) return;
    });
  }
  
  // Save the PDF
  pdf.save(filename);
}
