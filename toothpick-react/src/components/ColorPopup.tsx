import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = max === 0 ? 0 : diff / max;
  let v = max;
  
  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }
  
  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(v * 100)
  ];
}

function getColorName(r: number, g: number, b: number): string {
  // Simple color naming based on HSV
  const [h, s, v] = rgbToHsv(r, g, b);
  
  if (s < 10 && v > 90) return 'White';
  if (v < 10) return 'Black';
  if (s < 10) return 'Gray';
  
  // Hue-based names
  if (h < 15 || h >= 345) return 'Red';
  if (h < 45) return 'Orange';
  if (h < 75) return 'Yellow';
  if (h < 150) return 'Green';
  if (h < 210) return 'Cyan';
  if (h < 270) return 'Blue';
  if (h < 330) return 'Purple';
  
  return 'Color';
}

export function ColorPopup() {
  const hoveredToothpick = useStore(state => state.hoveredToothpick);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  useEffect(() => {
    if (hoveredToothpick) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [hoveredToothpick]);
  
  if (!visible || !hoveredToothpick) return null;
  
  const [r, g, b] = hoveredToothpick.color;
  const [h, s, v] = rgbToHsv(r, g, b);
  const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  const colorName = getColorName(r, g, b);
  
  // Calculate popup position
  const popupX = mousePos.x + 20;
  const popupY = mousePos.y - 100;
  
  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none"
      style={{
        left: `${popupX}px`,
        top: `${popupY}px`,
        minWidth: '200px'
      }}
    >
      <div className="flex items-start space-x-3">
        <div
          className="w-12 h-12 rounded border-2 border-gray-300 flex-shrink-0"
          style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
        />
        <div className="text-sm space-y-1">
          <div className="font-semibold">{colorName}</div>
          <div className="text-gray-600">RGB: {r}, {g}, {b}</div>
          <div className="text-gray-600">{hex}</div>
          <div className="text-gray-600">HSV: {h}°, {s}%, {v}%</div>
        </div>
      </div>
    </div>
  );
}
