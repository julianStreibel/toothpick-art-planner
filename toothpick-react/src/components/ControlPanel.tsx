import { Download, Eye, Grid, Palette, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const clusterEnabled = useStore(state => state.clusterEnabled);
  const kValue = useStore(state => state.kValue);
  const setPatternType = useStore(state => state.setPatternType);
  const setToothpickCount = useStore(state => state.setToothpickCount);
  const colorPickerMode = useStore(state => state.colorPickerMode);
  // NOTE: already declared above
  const setColorPickerMode = useStore(state => state.setColorPickerMode);
  const set2DMode = useStore(state => state.set2DMode);
  const setBackgroundColor = useStore(state => state.setBackgroundColor);
  const setCardboardColor = useStore(state => state.setCardboardColor);
  const toothpicks = useStore(state => state.toothpicks);
  const setClusterEnabled = useStore(state => state.setClusterEnabled);
  const setKValue = useStore(state => state.setKValue);
  const setColorPalette = useStore(state => state.setColorPalette);
  const highlightColor = useStore(state => state.highlightColor);

  // Build list of palette colors with counts, sorted descending by count
  const paletteWithCounts = useMemo(() => {
    if (!clusterEnabled) return [] as { color: [number, number, number]; count: number }[];
    const items: { color: [number, number, number]; count: number }[] = colorPalette.map((c) => ({ color: c, count: 0 }));
    // Make a quick lookup from string to index
    const indexByKey = new Map<string, number>();
    items.forEach((it, idx) => indexByKey.set(it.color.join(','), idx));
    for (const tp of toothpicks) {
      const key = `${tp.color[0]},${tp.color[1]},${tp.color[2]}`;
      const idx = indexByKey.get(key);
      if (idx !== undefined) items[idx].count++;
    }
    items.sort((a, b) => b.count - a.count);
    return items;
  }, [clusterEnabled, colorPalette, toothpicks]);

  // Export modal state
  const [exportOpen, setExportOpen] = useState(false);
  const [targetWidth, setTargetWidth] = useState<number>(300); // mm
  const [paper, setPaper] = useState<'A4' | 'Letter' | 'A3' | 'Custom'>('A4');
  const [paperW, setPaperW] = useState<number>(210);
  const [paperH, setPaperH] = useState<number>(297);
  // Margin fixed at 0.5 cm (5 mm) – no user control per request
  const [overlap, setOverlap] = useState<number>(5);
  // Grid and legend removed; always no grid, legend always included
  const setHighlightColor = useStore(state => state.setHighlightColor);
  
  const [updateTimer, setUpdateTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pendingK, setPendingK] = useState<number>(kValue);
  const quantCache = useRef<{
    imageData: ImageData | null;
    k: number;
    quantized: ImageData;
    palette: [number, number, number][];
  } | null>(null);
  const reqIdRef = useRef(0);
  
  const updateToothpicks = useCallback(async (overrideK?: number) => {
    if (!imageData) return;
    
    // Decide which image data to draw from: clustered or original
    let currentImageData = imageData;
    const kNow = overrideK ?? (useStore.getState().kValue);
    const clusterNow = useStore.getState().clusterEnabled;
    if (clusterNow && kNow > 1) {
      // Use cached quantization if available
      const cached = quantCache.current;
      if (cached && cached.imageData === imageData && cached.k === kNow) {
        currentImageData = cached.quantized;
        setColorPalette(cached.palette);
      } else {
        const myReq = ++reqIdRef.current;
        try {
          const { quantizeImportantColors } = await import('../utils/imageProcessor');
          const { quantizedData, palette } = quantizeImportantColors(imageData, Math.max(2, Math.min(500, kNow)));
          if (myReq !== reqIdRef.current) return; // stale
          quantCache.current = { imageData, k: kNow, quantized: quantizedData, palette };
          currentImageData = quantizedData;
          setColorPalette(palette);
        } catch {
          // fall back to original image on error
          currentImageData = imageData;
        }
      }
    } else {
      // Rebuild palette from original image (sampled up to 256 unique colors)
      const unique = new Set<string>();
      const pal: [number, number, number][] = [];
      const src = imageData.data;
      for (let i = 0; i < src.length; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const key = `${r},${g},${b}`;
        if (!unique.has(key)) {
          unique.add(key);
          pal.push([r, g, b]);
          if (pal.length >= 256) break;
        }
      }
      setColorPalette(pal);
    }
    
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
  }, [imageData, patternType, toothpickCount, imageWidth, imageHeight, setToothpicks, clusterEnabled, kValue, setColorPalette]);
  
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
    // In color picker mode, switch to 2D top-down with fit-to-window
    set2DMode(newMode);
    // Preserve toothpicks array (avoid transient clearing)
    // Recompute only if image/pattern changed – here just re-assign current list
    setToothpicks([...toothpicks]);
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
            className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
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
              className="px-3 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300 cursor-pointer"
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
              className="px-3 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300 cursor-pointer"
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
                  setExportOpen(true);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer"
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
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 cursor-pointer"
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
          {/* Clustering controls */}
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm text-gray-700">Color Reduction</label>
            <input
              type="checkbox"
              checked={clusterEnabled}
              onChange={(e) => setClusterEnabled(e.target.checked)}
            />
          </div>
          {clusterEnabled && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Colors: {pendingK}
            </label>
            <input
              type="range"
              min={2}
              max={500}
              step={1}
              value={pendingK}
              onChange={(e) => setPendingK(parseInt(e.target.value, 10))}
              onMouseUp={() => { setKValue(pendingK); updateToothpicks(pendingK); }}
              onTouchEnd={() => { setKValue(pendingK); updateToothpicks(pendingK); }}
              className="w-full"
              disabled={!clusterEnabled}
            />
          </div>
          )}
          {clusterEnabled ? (
            <div className="space-y-0 overflow-auto max-h-[60vh] pb-2">
              {paletteWithCounts.map(({ color, count }, i) => {
                const [r, g, b] = color;
                const isSelected = !!highlightColor && highlightColor[0] === r && highlightColor[1] === g && highlightColor[2] === b;
                return (
                  <button
                    key={`${r}-${g}-${b}-${i}`}
                    onClick={() => setHighlightColor(isSelected ? null : [r, g, b])}
                    className={`w-full flex items-center justify-between px-2 ${isSelected ? 'py-3 scale-[1.03] bg-gray-100' : 'py-2'} rounded-md hover:bg-gray-50 transition-all cursor-pointer`}
                    title={`RGB(${r}, ${g}, ${b})`}
                  >
                    <span className="flex items-center space-x-3">
                      <span className={`inline-block ${isSelected ? 'w-10 h-10' : 'w-5 h-5'} rounded border`} style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
                      <span className={`text-sm ${isSelected ? 'font-medium' : 'text-gray-700'}`}>{`RGB(${r}, ${g}, ${b})`}</span>
                    </span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {colorPalette.length > 32 && (
            <p className="text-xs text-gray-500 mt-1">
              +{colorPalette.length - 32} more colors
            </p>
          )}
        </div>
      )}
      </div>
      {/* Export modal */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white w-[560px] max-w-[95vw] rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Export Template</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setExportOpen(false)}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Width (mm)</label>
                <input type="number" value={targetWidth} onChange={(e)=>setTargetWidth(parseFloat(e.target.value)||0)} className="w-full border rounded px-2 py-1" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper</label>
                <select value={paper} onChange={(e)=>setPaper(e.target.value as 'A4'|'Letter'|'A3'|'Custom')} className="w-full border rounded px-2 py-1">
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="A3">A3</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              {paper === 'Custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Width (mm)</label>
                    <input type="number" value={paperW} onChange={(e)=>setPaperW(parseFloat(e.target.value)||0)} className="w-full border rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Height (mm)</label>
                    <input type="number" value={paperH} onChange={(e)=>setPaperH(parseFloat(e.target.value)||0)} className="w-full border rounded px-2 py-1" />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Overlap (mm)</label>
                <input type="number" value={overlap} onChange={(e)=>setOverlap(parseFloat(e.target.value)||0)} className="w-full border rounded px-2 py-1" />
                <p className="text-xs text-gray-500 mt-1">Pages include a small overlap so you can tape sheets together accurately—trim or align by the page frame lines.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button className="px-3 py-2 rounded border" onClick={()=>setExportOpen(false)}>Cancel</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={()=>{
                // convert units to mm
                const toMM = (v:number)=> v; // fixed to millimeters
                const cfg = {
                  targetWidthMM: toMM(targetWidth),
                  dotSizeMM: 2.0,
                  paper,
                  paperWMM: toMM(paperW),
                  paperHMM: toMM(paperH),
                  marginMM: 5, // fixed 0.5 cm
                  overlapMM: toMM(overlap),
                  legend: clusterEnabled
                };
                try {
                  // Defer to next frame to keep this within a user gesture but after DOM updates
                  requestAnimationFrame(() => {
                    try {
                      exportTemplate(toothpicks, imageWidth, imageHeight, 'toothpick_template.pdf', cfg);
                    } catch (err) {
                      console.error('Export failed:', err);
                      alert('Export failed. Please check the console for details.');
                    }
                  });
                } finally {
                  setExportOpen(false);
                }
              }}>Export</button>
            </div>
          </div>
        </div>
      )}
      
      {/* About Section */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          React Edition • 60+ FPS with 10k+ toothpicks • Exact Colors
        </p>
      </div>
    </div>
  );
}
