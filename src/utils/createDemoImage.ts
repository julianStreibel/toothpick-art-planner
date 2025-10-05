// Create a demo gradient image
export function createDemoImage(): ImageData {
  const width = 100;
  const height = 100;
  const imageData = new ImageData(width, height);
  
  // Create a colorful gradient
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      
      // Create a diagonal gradient with multiple colors
      
      // Red to Blue gradient horizontally
      const r = Math.floor(255 * (1 - x / width));
      // Green peaks in the middle
      const g = Math.floor(255 * Math.sin(Math.PI * x / width) * Math.sin(Math.PI * y / height));
      // Blue to Red gradient vertically
      const b = Math.floor(255 * (y / height));
      
      imageData.data[index] = r;
      imageData.data[index + 1] = g;
      imageData.data[index + 2] = b;
      imageData.data[index + 3] = 255; // Alpha
    }
  }
  
  return imageData;
}
