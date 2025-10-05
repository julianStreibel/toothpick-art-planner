import { useEffect } from 'react';
import { ColorPopup } from './components/ColorPopup';
import { ControlPanel } from './components/ControlPanel';
import { ToothpickRenderer } from './components/ToothpickRenderer';
import { useStore } from './store/useStore';
import { createDemoImage } from './utils/createDemoImage';

function App() {
  // Initialize with a demo gradient image
  useEffect(() => {
    // Small delay to ensure the components are mounted
    setTimeout(() => {
      const demoImageData = createDemoImage();
      const { setImage, setColorPalette } = useStore.getState();
      
      // Set the demo image
      setImage('demo', 100, 100, demoImageData);
      
      // Extract some colors for the palette display
      const colors: [number, number, number][] = [];
      for (let i = 0; i < 16; i++) {
        const idx = i * 4 * 256; // Sample some colors
        if (idx < demoImageData.data.length) {
          colors.push([
            demoImageData.data[idx],
            demoImageData.data[idx + 1],
            demoImageData.data[idx + 2]
          ]);
        }
      }
      setColorPalette(colors);
    }, 100);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        const { colorPickerMode, setColorPickerMode, set2DMode } = useStore.getState();
        const newMode = !colorPickerMode;
        setColorPickerMode(newMode);
        set2DMode(newMode);
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);
  
  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <h1 className="text-2xl font-bold text-center py-4 bg-white shadow-sm">
        Toothpick Art Simulator
      </h1>
      <div className="flex flex-1 overflow-hidden">
        <ControlPanel />
        <div className="flex-1 relative">
          <div className="w-full h-full">
            <ToothpickRenderer />
          </div>
          <ColorPopup />
        </div>
      </div>
    </div>
  );
}

export default App;