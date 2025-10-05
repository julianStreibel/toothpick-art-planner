import { Download, Eye, Grid, Palette, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import type { PatternType } from '../types';
import { getColorAtPosition } from '../utils/imageProcessor';
import {
    calculatePatternDimensions,
    createToothpicksFromPattern,
    generateCircularPattern,
    generateGridPattern,
    generateHexagonalPattern,
    generateOffsetGridPattern
} from '../utils/patternGenerator';
import { exportTemplate } from '../utils/templateExporter';
import { ImageUploader } from './ImageUploader';

export function ControlPanel() {
  // Use individual selectors to avoid object creation on every render
  const imageData = useStore(state => state.imageData);
  const patternType = useStore(state => state.patternType);
  const toothpickCount = useStore(state => state.toothpickCount);
  const imageWidth = useStore(state => state.imageWidth);
  const imageHeight = useStore(state => state.imageHeight);
  const setToothpicks = useStore(state => state.setToothpicks);
  const imageUrl = useStore(state => state.imageUrl);
  const colorPalette = useStore(state => state.colorPalette);
  const setPatternType = useStore(state => state.setPatternType);
  const setToothpickCount = useStore(state => state.setToothpickCount);
  const colorPickerMode = useStore(state => state.colorPickerMode);
  const setColorPickerMode = useStore(state => state.setColorPickerMode);
  const set2DMode = useStore(state => state.set2DMode);
  const setBackgroundColor = useStore(state => state.setBackgroundColor);
  const setCardboardColor = useStore(state => state.setCardboardColor);
  const toothpicks = useStore(state => state.toothpicks);
  
  const [updateTimer, setUpdateTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const updateToothpicks = useCallback(() => {
    if (!imageData) return;
    
    // Always use exact colors from the original image
    const currentImageData = imageData;
    
    // Calculate pattern dimensions
    const aspectRatio = imageWidth / imageHeight;
    const { rows, cols } = calculatePatternDimensions(toothpickCount, aspectRatio, patternType);
    
    // Calculate spacing
    let spacing: number;
    if (patternType === 'circular') {
      const minDim = Math.min(imageWidth, imageHeight);
      spacing = minDim / (rows * 2);
    } else {
      const spacingX = imageWidth / cols;
      const spacingY = imageHeight / rows;
      spacing = Math.min(spacingX, spacingY);
    }
    
    // Generate pattern positions
    let positions;
    switch (patternType) {
      case 'grid':
        positions = generateGridPattern(rows, cols, spacing, imageWidth, imageHeight);
        break;
      case 'offset-grid':
        positions = generateOffsetGridPattern(rows, cols, spacing, imageWidth, imageHeight);
        break;
      case 'hexagonal':
        positions = generateHexagonalPattern(rows, cols, spacing, imageWidth, imageHeight);
        break;
      case 'circular':
        positions = generateCircularPattern(rows, spacing, imageWidth, imageHeight);
        break;
      default:
        positions = generateGridPattern(rows, cols, spacing, imageWidth, imageHeight);
    }
    
    // Trim to exact count
    if (positions.length > toothpickCount) {
      positions = positions.slice(0, toothpickCount);
    }
    
    // Create toothpicks with exact colors from the original image
    const colorFunction = (x: number, y: number) => getColorAtPosition(currentImageData, x, y);
    const toothpicks = createToothpicksFromPattern(positions, colorFunction);
    
    setToothpicks(toothpicks);
  }, [imageData, patternType, toothpickCount, imageWidth, imageHeight, setToothpicks]);
  
  // Debounced update for toothpick count
  const handleToothpickCountChange = (count: number) => {
    setToothpickCount(count);
    
    if (updateTimer) {
      clearTimeout(updateTimer);
    }
    
    const timer = setTimeout(() => {
      updateToothpicks();
    }, 150);
    
    setUpdateTimer(timer);
  };
  
  // Update when pattern type changes
  useEffect(() => {
    updateToothpicks();
  }, [patternType, updateToothpicks]);
  
  // Update when image data changes
  useEffect(() => {
    if (imageData) {
      updateToothpicks();
    }
  }, [imageData, updateToothpicks]);
  
  const toggleColorPicker = () => {
    const newMode = !colorPickerMode;
    setColorPickerMode(newMode);
    set2DMode(newMode);
  };
  
  return (
    <div className="w-80 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
      {/* Image Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Image
        </h2>
        <ImageUploader />
        {imageUrl && (
          <div className="mt-3">
            <p className="text-sm text-gray-600">
              {imageWidth} × {imageHeight}px
            </p>
          </div>
        )}
      </div>
      
      {/* Pattern Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center">
          <Grid className="w-5 h-5 mr-2" />
          Pattern
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Type
            </label>
            <select
              value={patternType}
              onChange={(e) => setPatternType(e.target.value as PatternType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="grid">Grid</option>
              <option value="offset-grid">Offset Grid</option>
              <option value="hexagonal">Hexagonal</option>
              <option value="circular">Circular</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Toothpicks: {toothpickCount}
            </label>
            <input
              type="range"
              min="1"
              max="10000"
              step="10"
              value={toothpickCount}
              onChange={(e) => handleToothpickCountChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
      
      {/* View Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          View
        </h2>
        <div className="space-y-3">
          <button
            onClick={toggleColorPicker}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              colorPickerMode
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Color Picker Mode (C)
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const color = prompt('Enter RGB values (0-1) separated by commas:', '0.95,0.95,0.95');
                if (color) {
                  const [r, g, b] = color.split(',').map(v => parseFloat(v.trim()));
                  setBackgroundColor([r, g, b]);
                }
              }}
              className="px-3 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300"
            >
              Background
            </button>
            
            <button
              onClick={() => {
                const color = prompt('Enter RGB values (0-1) separated by commas:', '0.8,0.6,0.4');
                if (color) {
                  const [r, g, b] = color.split(',').map(v => parseFloat(v.trim()));
                  setCardboardColor([r, g, b]);
                }
              }}
              className="px-3 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300"
            >
              Cardboard
            </button>
          </div>
        </div>
      </div>
      
      {/* Export Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Export
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => {
              if (toothpicks.length === 0) {
                alert('Please generate a pattern first');
                return;
              }
              
              exportTemplate(
                toothpicks,
                imageWidth,
                imageHeight,
                'toothpick_template.pdf'
              );
            }}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Export Template
          </button>
          
          <button
            onClick={() => {
              // Export color list
              if (colorPalette.length === 0) {
                alert('Please load an image first');
                return;
              }
              
              let text = 'Toothpick Art Color Palette\n';
              text += '=' .repeat(40) + '\n\n';
              
              colorPalette.forEach((color, i) => {
                const [r, g, b] = color;
                const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
                text += `Color ${i + 1}: RGB(${r}, ${g}, ${b}) ${hex}\n`;
              });
              
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'color_palette.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Export Color List
          </button>
        </div>
      </div>
      
      {/* Color Palette Display */}
      {colorPalette.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Color Palette ({colorPalette.length})
          </h2>
          <div className="grid grid-cols-8 gap-1">
            {colorPalette.slice(0, 32).map((color, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }}
                title={`RGB(${color[0]}, ${color[1]}, ${color[2]})`}
              />
            ))}
          </div>
          {colorPalette.length > 32 && (
            <p className="text-xs text-gray-500 mt-1">
              +{colorPalette.length - 32} more colors
            </p>
          )}
        </div>
      )}
      </div>
      
      {/* About Section */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          React Edition • 60+ FPS with 10k+ toothpicks • Exact Colors
        </p>
      </div>
    </div>
  );
}
