import { useEffect, useRef, useState } from 'react';

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [r, g, b];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, v];
}

interface Props {
  label: string;
  color: [number, number, number]; // 0..1
  onChange: (rgb: [number, number, number]) => void;
  size?: number;
}

export function ColorWheel({ label, color, onChange, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgbToHsv(color[0], color[1], color[2]));
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setHsv(rgbToHsv(color[0], color[1], color[2]));
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const img = ctx.createImageData(size, size);
    const cx = size / 2; const cy = size / 2; const rad = size / 2 - 1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx; const dy = y - cy; const dist = Math.sqrt(dx*dx + dy*dy);
        const idx = (y * size + x) * 4;
        if (dist <= rad) {
          let h = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1; // angle
          const s = Math.min(1, dist / rad);
          const [rr, gg, bb] = hsvToRgb(h, s, hsv[2]);
          img.data[idx]   = Math.round(rr * 255);
          img.data[idx+1] = Math.round(gg * 255);
          img.data[idx+2] = Math.round(bb * 255);
          img.data[idx+3] = 255;
        } else {
          img.data[idx+3] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    // draw selector dot
    const angle = hsv[0] * 2 * Math.PI; const radius = hsv[1] * rad;
    const sx = cx + Math.cos(angle) * radius; const sy = cy + Math.sin(angle) * radius;
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff'; ctx.stroke();
  }, [hsv, size]);

  const handlePick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const cx = size / 2; const cy = size / 2; const dx = x - cx; const dy = y - cy;
    const rad = size / 2 - 1; const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rad);
    const h = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1;
    const s = dist / rad;
    const v = hsv[2];
    const next: [number, number, number] = [h, s, v];
    setHsv(next);
    onChange(hsvToRgb(next[0], next[1], next[2]));
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex items-start space-x-4">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={(e)=>{ setDragging(true); handlePick(e); }}
          onMouseMove={(e)=>{ if (dragging) handlePick(e); }}
          onMouseUp={()=>setDragging(false)}
          onMouseLeave={()=>setDragging(false)}
          style={{ cursor: 'crosshair', borderRadius: '50%', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
        />
        <div className="w-40">
          <label className="block text-xs text-gray-600 mb-1">Brightness</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(hsv[2]*100)}
            onChange={(e)=>{
              const v = parseInt(e.target.value,10)/100; const next:[number,number,number]=[hsv[0],hsv[1],v]; setHsv(next); onChange(hsvToRgb(next[0], next[1], next[2]));
            }}
          />
          <div className="mt-3 text-xs text-gray-600">Live preview updates immediately.</div>
        </div>
      </div>
    </div>
  );
}


