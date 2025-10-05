import { type ToothpickPosition } from '../types';

export interface Position2D {
  x: number;
  y: number;
}

export function generateGridPattern(
  rows: number,
  cols: number,
  spacing: number,
  baseWidth: number,
  baseHeight: number
): Position2D[] {
  const positions: Position2D[] = [];
  
  // Calculate offsets to center the grid
  const totalWidth = (cols - 1) * spacing;
  const totalHeight = (rows - 1) * spacing;
  const offsetX = (baseWidth - totalWidth) / 2;
  const offsetY = (baseHeight - totalHeight) / 2;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: offsetX + col * spacing,
        y: offsetY + row * spacing
      });
    }
  }
  
  return positions;
}

export function generateOffsetGridPattern(
  rows: number,
  cols: number,
  spacing: number,
  baseWidth: number,
  baseHeight: number
): Position2D[] {
  const positions: Position2D[] = [];
  
  // Calculate offsets to center the grid
  const totalWidth = (cols - 1) * spacing + (spacing / 2);
  const totalHeight = (rows - 1) * spacing;
  const offsetX = (baseWidth - totalWidth) / 2;
  const offsetY = (baseHeight - totalHeight) / 2;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = offsetX + col * spacing;
      if (row % 2 === 1) {
        x += spacing / 2;
      }
      const y = offsetY + row * spacing;
      
      if (x >= 0 && x <= baseWidth && y >= 0 && y <= baseHeight) {
        positions.push({ x, y });
      }
    }
  }
  
  return positions;
}

export function generateHexagonalPattern(
  rows: number,
  cols: number,
  spacing: number,
  baseWidth: number,
  baseHeight: number
): Position2D[] {
  const positions: Position2D[] = [];
  const hexHeight = spacing * Math.sqrt(3) / 2;
  
  // Calculate offsets
  const totalWidth = (cols - 1) * spacing + (spacing / 2);
  const totalHeight = (rows - 1) * hexHeight;
  const offsetX = (baseWidth - totalWidth) / 2;
  const offsetY = (baseHeight - totalHeight) / 2;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = offsetX + col * spacing;
      if (row % 2 === 1) {
        x += spacing / 2;
      }
      const y = offsetY + row * hexHeight;
      
      if (x >= 0 && x <= baseWidth && y >= 0 && y <= baseHeight) {
        positions.push({ x, y });
      }
    }
  }
  
  return positions;
}

export function generateCircularPattern(
  rings: number,
  spacing: number,
  baseWidth: number,
  baseHeight: number
): Position2D[] {
  const positions: Position2D[] = [];
  const centerX = baseWidth / 2;
  const centerY = baseHeight / 2;
  
  // Add center point
  positions.push({ x: centerX, y: centerY });
  
  // Add rings
  for (let ring = 1; ring <= rings; ring++) {
    const radius = ring * spacing;
    const numPoints = Math.max(6, Math.floor(2 * Math.PI * radius / spacing));
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (x >= 0 && x <= baseWidth && y >= 0 && y <= baseHeight) {
        positions.push({ x, y });
      }
    }
  }
  
  return positions;
}

export function calculatePatternDimensions(
  totalCount: number,
  aspectRatio: number,
  patternType: string
): { rows: number; cols: number } {
  if (patternType === 'circular') {
    const rings = Math.floor(Math.sqrt(totalCount / Math.PI));
    return { rows: rings, cols: rings };
  }
  
  // For grid patterns
  const cols = Math.floor(Math.sqrt(totalCount * aspectRatio));
  let rows = Math.floor(totalCount / cols);
  
  // Adjust to match total count better
  if (rows * cols < totalCount) {
    rows++;
  }
  
  return { rows, cols };
}

export function createToothpicksFromPattern(
  positions: Position2D[],
  colorFunction: (x: number, y: number) => [number, number, number],
  toothpickHeight: number = 30
): ToothpickPosition[] {
  return positions.map(pos => ({
    x: pos.x,
    y: pos.y,
    z: toothpickHeight / 2,
    color: colorFunction(pos.x, pos.y),
    angle: 90
  }));
}
