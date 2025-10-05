# Toothpick Art Simulator

A 3D visualization tool for creating toothpick artwork. This application helps artists plan and visualize colored toothpick arrangements on cardboard before physical creation.

## Features

### 1. **3D Interactive Rendering**
- Load any image and convert it into a toothpick art visualization
- Full 3D camera controls (rotate, zoom, pan)
- Real-time rendering with simulated lighting
- Customizable background colors

### 2. **Pattern Generation**
- **Grid Pattern**: Regular rectangular arrangement
- **Hexagonal Pattern**: Honeycomb-style arrangement  
- **Circular Pattern**: Radial/concentric circle arrangement
- Adjustable density slider for pattern spacing

### 3. **Color Management**
- Automatic color quantization from source images
- Color palette display with names and codes
- RGB, Hex, and HSV color information
- Export color lists for paint mixing reference

### 4. **Export Tools**
- **Printable Templates**: PDF templates showing exact toothpick positions
- **Color Guides**: Detailed color breakdown with counts and percentages
- **Color Lists**: Text files with all color specifications

## Installation

1. Make sure you have Python 3.12 or higher installed
2. Install dependencies using uv:
   ```bash
   uv sync
   ```

## Usage

Run the application:
```bash
uv run python main.py
```

### Workflow

1. **Load an Image**: Click "Load Image" and select a photo or artwork
2. **Choose Pattern**: Select Grid, Hexagonal, or Circular pattern
3. **Adjust Density**: Use the slider to control toothpick spacing
4. **View in 3D**: Rotate and zoom the 3D view to examine your artwork
5. **Export**: Generate templates and color guides for physical creation

### Controls

- **Mouse**: Click and drag to rotate the 3D view
- **Scroll**: Zoom in/out
- **Right-click + drag**: Pan the view

## Technical Details

- Built with Python using PyQt6 for the UI
- Vispy for hardware-accelerated 3D rendering
- PIL/Pillow for image processing
- Matplotlib for template generation
- K-means clustering for color quantization

## Tips for Best Results

- Use images with distinct colors for better quantization
- Start with lower density patterns for easier physical assembly
- Export the color guide first to gather materials
- Print templates at 100% scale for accurate positioning
