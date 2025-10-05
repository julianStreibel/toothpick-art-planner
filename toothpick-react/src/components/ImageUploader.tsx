import { Upload } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../store/useStore';
import { loadImageData } from '../utils/imageProcessor';

export function ImageUploader() {
  const setImage = useStore(state => state.setImage);
  const setColorPalette = useStore(state => state.setColorPalette);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    
    try {
      // Load image data
      const { width, height, data } = await loadImageData(url);
      
      // Update store with original image
      setImage(url, width, height, data);
      
      // Extract unique colors for the palette display
      const uniqueColors = new Set<string>();
      const colorArray: [number, number, number][] = [];
      
      for (let i = 0; i < data.data.length; i += 4) {
        const colorStr = `${data.data[i]},${data.data[i + 1]},${data.data[i + 2]}`;
        if (!uniqueColors.has(colorStr)) {
          uniqueColors.add(colorStr);
          colorArray.push([data.data[i], data.data[i + 1], data.data[i + 2]]);
          
          // Limit to 256 colors for performance
          if (colorArray.length >= 256) break;
        }
      }
      
      setColorPalette(colorArray);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }, [setImage, setColorPalette]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    multiple: false
  });
  
  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-600">
        {isDragActive
          ? 'Drop the image here...'
          : 'Drag & drop an image, or click to select'
        }
      </p>
    </div>
  );
}
