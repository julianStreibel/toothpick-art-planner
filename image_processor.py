"""Image processing module for toothpick art simulator."""

from typing import List, Optional, Tuple

import numpy as np
from PIL import Image
from scipy.cluster.vq import kmeans2


class ImageProcessor:
    """Handles image loading, resizing, and color quantization."""

    def __init__(self, target_colors: int = 16):
        """Initialize image processor.

        Args:
            target_colors: Number of colors to quantize to
        """
        self.target_colors = target_colors
        self.image: Optional[Image.Image] = None
        self.quantized_image: Optional[np.ndarray] = None
        self.color_palette: Optional[List[Tuple[int, int, int]]] = None
        self.gradient_mode = False
        self.original_array: Optional[np.ndarray] = None

    def load_image(self, path: str, max_size: Optional[Tuple[int, int]] = None) -> None:
        """Load and resize image.

        Args:
            path: Path to image file
            max_size: Maximum dimensions (width, height), None to keep original size
        """
        self.image = Image.open(path)

        # Only resize if max_size is specified
        if max_size is not None:
            self.image.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Convert to RGB and store original array
        if self.image.mode != "RGB":
            self.image = self.image.convert("RGB")
        self.original_array = np.array(self.image)

    def quantize_colors(self) -> np.ndarray:
        """Quantize image colors to limited palette.

        Returns:
            Quantized image array
        """
        if self.image is None:
            raise ValueError("No image loaded")

        # Convert to RGB if necessary
        if self.image.mode != "RGB":
            self.image = self.image.convert("RGB")

        # Convert to numpy array
        img_array = np.array(self.image)
        pixels = img_array.reshape(-1, 3).astype(float)

        # Use k-means clustering to find dominant colors
        centroids, labels = kmeans2(pixels, self.target_colors, minit="++")

        # Store color palette
        self.color_palette = [(int(r), int(g), int(b)) for r, g, b in centroids]

        # Create quantized image
        quantized_pixels = centroids[labels]
        self.quantized_image = quantized_pixels.reshape(img_array.shape).astype(
            np.uint8
        )

        return self.quantized_image

    def get_color_at_position(self, x: int, y: int) -> Tuple[int, int, int]:
        """Get color at specific position in quantized image.

        Args:
            x: X coordinate
            y: Y coordinate

        Returns:
            RGB color tuple
        """
        if self.gradient_mode and self.original_array is not None:
            # In gradient mode, return original color
            return tuple(self.original_array[y, x])
        elif self.quantized_image is not None:
            return tuple(self.quantized_image[y, x])
        else:
            raise ValueError("No image data available")

    def get_image_dimensions(self) -> Tuple[int, int]:
        """Get dimensions of loaded image.

        Returns:
            (width, height) tuple
        """
        if self.image is None:
            raise ValueError("No image loaded")

        return self.image.size

    def enable_gradient_mode(self):
        """Enable gradient mode to use original colors instead of quantized."""
        self.gradient_mode = True

        # For gradient mode, populate palette with unique colors found
        if self.original_array is not None:
            # Get unique colors (limiting to reasonable number)
            pixels = self.original_array.reshape(-1, 3)
            unique_colors = np.unique(pixels, axis=0)

            # If too many unique colors, sample them
            if len(unique_colors) > 256:
                indices = np.linspace(0, len(unique_colors) - 1, 256, dtype=int)
                unique_colors = unique_colors[indices]

            self.color_palette = [tuple(color) for color in unique_colors]

    def disable_gradient_mode(self):
        """Disable gradient mode and use quantized colors."""
        self.gradient_mode = False
