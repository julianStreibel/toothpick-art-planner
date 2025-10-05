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
