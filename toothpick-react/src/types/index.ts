export interface ToothpickPosition {
  x: number;
  y: number;
  z: number;
  color: [number, number, number];
  angle: number;
}

export type PatternType = 'grid' | 'offset-grid' | 'hexagonal' | 'circular';

export interface AppState {
  // Image
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  kValue: number;
  
  // Pattern
  patternType: PatternType;
  toothpickCount: number;
  toothpicks: ToothpickPosition[];
  
  // View
  backgroundColor: [number, number, number];
  cardboardColor: [number, number, number];
  colorPickerMode: boolean;
  is2DMode: boolean;
  
  // Colors
  colorPalette: [number, number, number][];
}
