// K-means clustering implementation for color quantization
export function kMeansQuantize(
  imageData: ImageData,
  k: number,
  maxIterations: number = 10
): { palette: [number, number, number][]; quantizedData: ImageData } {
  const data = imageData.data;
  const pixels: [number, number, number][] = [];
  
  // Extract RGB values
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  
  // Initialize centroids using k-means++ algorithm
  const centroids = initializeCentroidsKMeansPlusPlus(pixels, k);
  
  const assignments = new Array(pixels.length).fill(0);
  let changed = true;
  let iteration = 0;
  
  while (changed && iteration < maxIterations) {
    changed = false;
    
    // Assignment step
    for (let i = 0; i < pixels.length; i++) {
      const closestIndex = findClosestCentroid(pixels[i], centroids);
      if (assignments[i] !== closestIndex) {
        assignments[i] = closestIndex;
        changed = true;
      }
    }
    
    // Update step
    const newCentroids = updateCentroids(pixels, assignments, k);
    for (let i = 0; i < k; i++) {
      centroids[i] = newCentroids[i];
    }
    
    iteration++;
  }
  
  // Create quantized image data
  const quantizedData = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < pixels.length; i++) {
    const centroid = centroids[assignments[i]];
    const idx = i * 4;
    quantizedData.data[idx] = centroid[0];
    quantizedData.data[idx + 1] = centroid[1];
    quantizedData.data[idx + 2] = centroid[2];
    quantizedData.data[idx + 3] = 255; // Alpha
  }
  
  return { palette: centroids, quantizedData };
}

// Fast median-cut quantization (MMCQ-like)
// - Builds a histogram in 5 bits/channel (32^3 bins)
// - Recursively splits the color space boxes by the widest channel at weighted median
// - Returns k representative colors (centroids) and a quantized image using those colors
export function quantizeImportantColors(
  imageData: ImageData,
  k: number
): { palette: [number, number, number][]; quantizedData: ImageData } {
  const data = imageData.data;
  const reduceBits = 5; // 5 bits per channel -> 32 bins per channel
  const shift = 8 - reduceBits;
  const histSize = 1 << (reduceBits * 3); // 32768

  const histogram = new Uint32Array(histSize);

  // Optional sampling for very large images for speed (every 2nd pixel)
  const step = data.length > 2_000_000 ? 8 : 4; // 2M RGBA bytes ≈ 500k px
  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const ri = r >> shift;
    const gi = g >> shift;
    const bi = b >> shift;
    const idx = (ri << (reduceBits * 2)) | (gi << reduceBits) | bi;
    histogram[idx]++;
  }

  type Bin = { r: number; g: number; b: number; count: number };

  // Build list of non-empty bins with their representative 8-bit color (center of bin)
  const bins: Bin[] = [];
  for (let ri = 0; ri < 32; ri++) {
    for (let gi = 0; gi < 32; gi++) {
      for (let bi = 0; bi < 32; bi++) {
        const idx = (ri << 10) | (gi << 5) | bi;
        const count = histogram[idx];
        if (count === 0) continue;
        // Expand to 8-bit centered within the bin
        const r = (ri << shift) + (1 << (shift - 1));
        const g = (gi << shift) + (1 << (shift - 1));
        const b = (bi << shift) + (1 << (shift - 1));
        bins.push({ r, g, b, count });
      }
    }
  }

  if (bins.length === 0) {
    return { palette: [[0, 0, 0]], quantizedData: new ImageData(imageData.width, imageData.height) };
  }

  type Box = {
    rMin: number; rMax: number;
    gMin: number; gMax: number;
    bMin: number; bMax: number;
    bins: Bin[];
    count: number;
  };

  function makeBox(items: Bin[]): Box {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, count = 0;
    for (const it of items) {
      if (it.r < rMin) rMin = it.r; if (it.r > rMax) rMax = it.r;
      if (it.g < gMin) gMin = it.g; if (it.g > gMax) gMax = it.g;
      if (it.b < bMin) bMin = it.b; if (it.b > bMax) bMax = it.b;
      count += it.count;
    }
    return { rMin, rMax, gMin, gMax, bMin, bMax, bins: items, count };
  }

  function splitBox(box: Box): [Box, Box] | null {
    const rRange = box.rMax - box.rMin;
    const gRange = box.gMax - box.gMin;
    const bRange = box.bMax - box.bMin;
    let channel: 'r' | 'g' | 'b' = 'r';
    if (gRange >= rRange && gRange >= bRange) channel = 'g';
    else if (bRange >= rRange && bRange >= gRange) channel = 'b';

    // Sort by chosen channel
    const sorted = box.bins.slice().sort((a, b) => (channel === 'r' ? a.r - b.r : channel === 'g' ? a.g - b.g : a.b - b.b));
    const total = box.count;
    let acc = 0;
    let cut = 0;
    for (let i = 0; i < sorted.length; i++) {
      acc += sorted[i].count;
      if (acc >= total / 2) { cut = i; break; }
    }
    if (cut <= 0 || cut >= sorted.length - 1) return null; // cannot split
    const left = makeBox(sorted.slice(0, cut + 1));
    const right = makeBox(sorted.slice(cut + 1));
    return [left, right];
  }

  // Priority split: keep splitting the box with the largest range*count (heuristic)
  const boxes: Box[] = [makeBox(bins)];
  while (boxes.length < k) {
    // choose box to split
    let bestIdx = -1;
    let bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      const bx = boxes[i];
      const score = (bx.rMax - bx.rMin + bx.gMax - bx.gMin + bx.bMax - bx.bMin) * Math.log2(bx.count + 1);
      if (score > bestScore && bx.bins.length > 1) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    const chosen = boxes.splice(bestIdx, 1)[0];
    const sp = splitBox(chosen);
    if (!sp) { boxes.push(chosen); break; }
    boxes.push(sp[0], sp[1]);
  }

  // Compute centroids weighted by counts
  let palette: [number, number, number][] = boxes.map(bx => {
    let rSum = 0, gSum = 0, bSum = 0, cSum = 0;
    for (const it of bx.bins) {
      rSum += it.r * it.count; gSum += it.g * it.count; bSum += it.b * it.count; cSum += it.count;
    }
    if (cSum === 0) return [0, 0, 0];
    return [Math.round(rSum / cSum), Math.round(gSum / cSum), Math.round(bSum / cSum)] as [number, number, number];
  });

  // If we didn't reach k because boxes became atomic, refine with a quick weighted k-means on bins
  if (palette.length < k) {
    const targetK = Math.min(k, Math.max(2, bins.length));
    // k-means++ init (weighted by counts)
    const cents: [number, number, number][] = [];
    // pick first centroid by weight
    let totalW = 0; for (const b of bins) totalW += b.count;
    const r = Math.random() * totalW; let accum = 0;
    for (const b of bins) { accum += b.count; if (accum >= r) { cents.push([b.r, b.g, b.b]); break; } }
    while (cents.length < targetK) {
      const dists = bins.map(b => {
        let minD = Infinity; for (const c of cents) {
          const d = (b.r - c[0]) ** 2 + (b.g - c[1]) ** 2 + (b.b - c[2]) ** 2; if (d < minD) minD = d;
        }
        return minD * b.count;
      });
      const sumD = dists.reduce((a, b) => a + b, 0) || 1;
      const t = Math.random() * sumD; let a2 = 0, pick = 0;
      for (let i = 0; i < bins.length; i++) { a2 += dists[i]; if (a2 >= t) { pick = i; break; } }
      cents.push([bins[pick].r, bins[pick].g, bins[pick].b]);
    }
    // few iterations
    const iters = 3;
    for (let it = 0; it < iters; it++) {
      const sums = Array.from({ length: targetK }, () => ({ r: 0, g: 0, b: 0, w: 0 }));
      for (const b of bins) {
        let best = 0; let bestD = Infinity;
        for (let i = 0; i < targetK; i++) {
          const c = cents[i];
          const d = (b.r - c[0]) ** 2 + (b.g - c[1]) ** 2 + (b.b - c[2]) ** 2;
          if (d < bestD) { bestD = d; best = i; }
        }
        sums[best].r += b.r * b.count; sums[best].g += b.g * b.count; sums[best].b += b.b * b.count; sums[best].w += b.count;
      }
      for (let i = 0; i < targetK; i++) {
        if (sums[i].w > 0) cents[i] = [Math.round(sums[i].r / sums[i].w), Math.round(sums[i].g / sums[i].w), Math.round(sums[i].b / sums[i].w)];
      }
    }
    palette = cents;
  }

  // Precompute nearest centroid for every reduced bin for fast mapping
  const nearest = new Uint16Array(histSize);
  for (let ri = 0; ri < 32; ri++) {
    for (let gi = 0; gi < 32; gi++) {
      for (let bi = 0; bi < 32; bi++) {
        const idx = (ri << 10) | (gi << 5) | bi;
        const r = (ri << shift) + (1 << (shift - 1));
        const g = (gi << shift) + (1 << (shift - 1));
        const b = (bi << shift) + (1 << (shift - 1));
        let best = 0; let bestD = Infinity;
        for (let p = 0; p < palette.length; p++) {
          const pr = palette[p][0], pg = palette[p][1], pb = palette[p][2];
          const d = (pr - r) * (pr - r) + (pg - g) * (pg - g) + (pb - b) * (pb - b);
          if (d < bestD) { bestD = d; best = p; }
        }
        nearest[idx] = best as number;
      }
    }
  }

  // Build quantized image quickly using nearest map
  const out = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < data.length; i += 4) {
    const ri = data[i] >> shift;
    const gi = data[i + 1] >> shift;
    const bi = data[i + 2] >> shift;
    const idx = (ri << 10) | (gi << 5) | bi;
    const pi = nearest[idx];
    const pr = palette[pi][0];
    const pg = palette[pi][1];
    const pb = palette[pi][2];
    out.data[i] = pr; out.data[i + 1] = pg; out.data[i + 2] = pb; out.data[i + 3] = 255;
  }

  return { palette, quantizedData: out };
}

function initializeCentroidsKMeansPlusPlus(
  pixels: [number, number, number][],
  k: number
): [number, number, number][] {
  const centroids: [number, number, number][] = [];
  
  // Choose first centroid randomly
  const firstIndex = Math.floor(Math.random() * pixels.length);
  centroids.push([...pixels[firstIndex]]);
  
  // Choose remaining centroids
  for (let i = 1; i < k; i++) {
    const distances = pixels.map(pixel => {
      const minDist = Math.min(...centroids.map(c => euclideanDistance(pixel, c)));
      return minDist * minDist;
    });
    
    // Choose next centroid with probability proportional to squared distance
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalDist;
    
    for (let j = 0; j < pixels.length; j++) {
      random -= distances[j];
      if (random <= 0) {
        centroids.push([...pixels[j]]);
        break;
      }
    }
  }
  
  return centroids;
}

function findClosestCentroid(
  pixel: [number, number, number],
  centroids: [number, number, number][]
): number {
  let minDist = Infinity;
  let closestIndex = 0;
  
  for (let i = 0; i < centroids.length; i++) {
    const dist = euclideanDistance(pixel, centroids[i]);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }
  
  return closestIndex;
}

function updateCentroids(
  pixels: [number, number, number][],
  assignments: number[],
  k: number
): [number, number, number][] {
  const sums: number[][] = Array(k).fill(0).map(() => [0, 0, 0]);
  const counts = new Array(k).fill(0);
  
  for (let i = 0; i < pixels.length; i++) {
    const cluster = assignments[i];
    sums[cluster][0] += pixels[i][0];
    sums[cluster][1] += pixels[i][1];
    sums[cluster][2] += pixels[i][2];
    counts[cluster]++;
  }
  
  return sums.map((sum, i) => {
    if (counts[i] === 0) {
      // If cluster is empty, reinitialize randomly
      const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
      return [...randomPixel];
    }
    return [
      Math.round(sum[0] / counts[i]),
      Math.round(sum[1] / counts[i]),
      Math.round(sum[2] / counts[i])
    ] as [number, number, number];
  });
}

function euclideanDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

// Get color at specific position
export function getColorAtPosition(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number] {
  // Clamp coordinates
  x = Math.max(0, Math.min(imageData.width - 1, Math.floor(x)));
  y = Math.max(0, Math.min(imageData.height - 1, Math.floor(y)));
  
  const index = (y * imageData.width + x) * 4;
  return [
    imageData.data[index],
    imageData.data[index + 1],
    imageData.data[index + 2]
  ];
}

// Load image and get ImageData
export async function loadImageData(url: string): Promise<{
  width: number;
  height: number;
  data: ImageData;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      resolve({
        width: img.width,
        height: img.height,
        data: imageData
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
