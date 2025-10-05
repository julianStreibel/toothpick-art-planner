import { create } from 'zustand';
import type { PatternType, ToothpickPosition } from '../types';

interface AppStore {
  // Image state
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  imageData: ImageData | null;
  // Optional quantized image for clustering
  // Stored here for reuse across toggles
  
  // Clustering controls
  clusterEnabled: boolean;
  kValue: number;
  
  // Pattern state
  patternType: PatternType;
  toothpickCount: number;
  toothpicks: ToothpickPosition[];
  
  // View state
  backgroundColor: [number, number, number];
  cardboardColor: [number, number, number];
  colorPickerMode: boolean;
  is2DMode: boolean;
  hoveredToothpick: ToothpickPosition | null;
  selectedToothpick: ToothpickPosition | null;
  
  // Colors
  colorPalette: [number, number, number][];
  
  // Actions
  setImage: (url: string, width: number, height: number, data: ImageData) => void;
  setClusterEnabled: (enabled: boolean) => void;
  setKValue: (k: number) => void;
  setPatternType: (pattern: PatternType) => void;
  setToothpickCount: (count: number) => void;
  setToothpicks: (toothpicks: ToothpickPosition[]) => void;
  setBackgroundColor: (color: [number, number, number]) => void;
  setCardboardColor: (color: [number, number, number]) => void;
  setColorPickerMode: (enabled: boolean) => void;
  set2DMode: (enabled: boolean) => void;
  setHoveredToothpick: (toothpick: ToothpickPosition | null) => void;
  setSelectedToothpick: (toothpick: ToothpickPosition | null) => void;
  setColorPalette: (palette: [number, number, number][]) => void;
}

export const useStore = create<AppStore>((set) => ({
  // Initial state
  imageUrl: null,
  imageWidth: 100,
  imageHeight: 100,
  imageData: null,
  clusterEnabled: false,
  kValue: 16,
  
  patternType: 'grid',
  toothpickCount: 400,
  toothpicks: [],
  
  backgroundColor: [0.95, 0.95, 0.95],
  cardboardColor: [0.8, 0.6, 0.4],
  colorPickerMode: false,
  is2DMode: false,
  hoveredToothpick: null,
  selectedToothpick: null,
  
  colorPalette: [],
  
  // Actions
  setImage: (url, width, height, data) => set({ 
    imageUrl: url, 
    imageWidth: width, 
    imageHeight: height,
    imageData: data
  }),
  setClusterEnabled: (enabled) => set({ clusterEnabled: enabled }),
  setKValue: (k) => set({ kValue: k }),
  setPatternType: (pattern) => set({ patternType: pattern }),
  setToothpickCount: (count) => set({ toothpickCount: count }),
  setToothpicks: (toothpicks) => set({ toothpicks }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setCardboardColor: (color) => set({ cardboardColor: color }),
  setColorPickerMode: (enabled) => set({ colorPickerMode: enabled }),
  set2DMode: (enabled) => set({ is2DMode: enabled }),
  setHoveredToothpick: (toothpick) => set({ hoveredToothpick: toothpick }),
  setSelectedToothpick: (toothpick) => set({ selectedToothpick: toothpick }),
  setColorPalette: (palette) => set({ colorPalette: palette }),
}));
