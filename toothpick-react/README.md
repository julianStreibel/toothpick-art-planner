## Toothpick Art Simulator (React)

Create large-format toothpick art from any image with live 3D preview, exact-color rendering, fast color reduction, and print‑perfect PDF templates.
All of it is vibe coded.

---

### Demo


---

### Highlights

- Exact color rendering (or reduced palette) for realistic preview
- 60+ FPS with thousands of toothpicks via instanced rendering
- Color Picker Mode with live hover info and dot highlighting
- Fast, high‑quality color reduction (median‑cut + refinement)
- Print‑perfect PDF export with tiling, fixed margins, overlap guides, and legend

---

### Features

- Image import: PNG / JPG (drag & drop)
- Patterns: Grid, Offset Grid, Hexagonal, Circular
- Density: 1 – 10,000+ toothpicks
- Color modes:
  - Exact Colors (default)
  - Color Reduction (“Color Reduction” toggle) with 2–500 colors
  - Palette list sorted by frequency; click a color to highlight in Color Picker Mode
- Background & Cardboard color pickers (modal color wheel with live preview)
- Camera:
  - 3D orbit view (rotate/zoom/pan)
  - 2D top‑down in Color Picker Mode (fits to window)
- Export (PDF):
  - Units fixed to mm; margins fixed to 5 mm (0.5 cm)
  - Choose Target Width (mm), Paper (A4/Letter/A3/Custom), Overlap (mm)
  - Auto tiling with page frames and dashed “overlap end” indicators
  - Dots are printed in color only (no stroke) at ~2.0 mm diameter
  - Legend page auto‑included when Color Reduction is on

---

### Getting Started

1) Install

```bash
npm install
npm run dev
```

2) Open the app

- Navigate to the dev server URL printed in your terminal (typically `http://localhost:5173`).

3) Load an image

- Use the “Image” panel to drag & drop or click to select an image.

4) Choose a pattern and density

- Set “Pattern Type” and the “Total Toothpicks” slider.

5) Colors

- Optional: enable “Color Reduction” to choose a palette size (2–500). The palette list is sorted by usage; click a color to highlight in Color Picker Mode.
- Optional: set Background and Cardboard colors using the color‑wheel modal buttons.

6) Inspect colors

- Click “Color Picker Mode (C)” to switch to 2D. Hover dots to inspect RGB/HEX and names; click palette items to draw a red border around matching dots.

7) Export PDF

- Click “Export Template” and set:
  - Target Width (mm): physical width of the final template
  - Paper: A4 / Letter / A3 / Custom (mm)
  - Overlap (mm): small area repeated on adjacent pages for easy taping
- The export creates a multi‑page PDF with:
  - Page frames (solid) and dashed lines marking the end of overlap areas
  - Color dots at exact scaled positions (no stroke)
  - A 50 mm scale bar and “Print at 100%” reminder
  - Legend page (if Color Reduction is enabled)

Assembly tip: print at 100% with no scaling; align pages by the frames. The dashed line indicates where the overlap ends.

---

### Controls & Shortcuts

- Color Picker Mode: press `C` or click the button
- Orbit Controls (3D): mouse/touch to rotate/zoom/pan
- 2D mode (Picker): camera fits the image area; hover to inspect

---

### Tech Stack

- React + TypeScript + Vite
- Three.js + React Three Fiber (@react-three/fiber) + @react-three/drei
- Zustand (state), Tailwind CSS (styles), jsPDF (PDF export)

---

### Development

```bash
npm install
npm run dev

# Lint
npm run lint

# Build
npm run build
```

---


