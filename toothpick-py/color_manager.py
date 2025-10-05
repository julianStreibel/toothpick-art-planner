"""Color management module for toothpick art."""

import colorsys
from typing import Dict, List, Tuple


class ColorManager:
    """Manage color palettes and provide color information."""

    def __init__(self):
        """Initialize color manager."""
        self.palette: List[Tuple[int, int, int]] = []
        self.color_names: Dict[Tuple[int, int, int], str] = {}

    def set_palette(self, colors: List[Tuple[int, int, int]]):
        """Set the color palette.

        Args:
            colors: List of RGB color tuples (0-255)
        """
        self.palette = colors
        self._generate_color_names()

    def _generate_color_names(self):
        """Generate descriptive names for colors."""
        # Basic color naming based on HSV
        for color in self.palette:
            name = self._get_color_name(color)
            self.color_names[color] = name

    def _get_color_name(self, rgb: Tuple[int, int, int]) -> str:
        """Generate a descriptive name for a color.

        Args:
            rgb: RGB color tuple (0-255)

        Returns:
            Color name string
        """
        r, g, b = [x / 255.0 for x in rgb]
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        h = h * 360  # Convert to degrees

        # Determine base color
        if s < 0.1:  # Low saturation = grayscale
            if v < 0.2:
                return "Black"
            elif v < 0.4:
                return "Dark Gray"
            elif v < 0.6:
                return "Gray"
            elif v < 0.8:
                return "Light Gray"
            else:
                return "White"

        # Determine hue-based color
        if h < 10 or h >= 350:
            base = "Red"
        elif h < 40:
            base = "Orange"
        elif h < 65:
            base = "Yellow"
        elif h < 150:
            base = "Green"
        elif h < 200:
            base = "Cyan"
        elif h < 260:
            base = "Blue"
        elif h < 300:
            base = "Purple"
        else:
            base = "Magenta"

        # Add brightness modifier
        if v < 0.3:
            base = f"Dark {base}"
        elif v > 0.8 and s > 0.3:
            base = f"Bright {base}"
        elif s < 0.3:
            base = f"Pale {base}"

        return base

    def get_color_info(self, color: Tuple[int, int, int]) -> Dict[str, str]:
        """Get detailed information about a color.

        Args:
            color: RGB color tuple (0-255)

        Returns:
            Dictionary with color information
        """
        r, g, b = color

        # Calculate different color representations
        hex_color = f"#{r:02x}{g:02x}{b:02x}"

        # HSV values
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        hsv = f"H:{int(h * 360)}° S:{int(s * 100)}% V:{int(v * 100)}%"

        # Get or generate name
        name = self.color_names.get(color, self._get_color_name(color))

        return {
            "name": name,
            "rgb": f"RGB({r}, {g}, {b})",
            "hex": hex_color,
            "hsv": hsv,
        }

    def find_closest_color(
        self, target: Tuple[int, int, int], available_colors: List[Tuple[int, int, int]]
    ) -> Tuple[int, int, int]:
        """Find the closest color from available options.

        Args:
            target: Target RGB color
            available_colors: List of available RGB colors

        Returns:
            Closest available color
        """
        if not available_colors:
            return target

        min_distance = float("inf")
        closest = available_colors[0]

        for color in available_colors:
            # Calculate Euclidean distance in RGB space
            distance = sum((a - b) ** 2 for a, b in zip(target, color)) ** 0.5

            if distance < min_distance:
                min_distance = distance
                closest = color

        return closest

    def get_palette_statistics(self) -> Dict[str, any]:
        """Get statistics about the current palette.

        Returns:
            Dictionary with palette statistics
        """
        if not self.palette:
            return {"count": 0}

        # Calculate average brightness
        brightnesses = []
        for r, g, b in self.palette:
            # Perceived brightness formula
            brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            brightnesses.append(brightness)

        return {
            "count": len(self.palette),
            "avg_brightness": sum(brightnesses) / len(brightnesses),
            "color_distribution": self._get_color_distribution(),
        }

    def _get_color_distribution(self) -> Dict[str, int]:
        """Get distribution of colors by base hue.

        Returns:
            Dictionary mapping base colors to counts
        """
        distribution = {}

        for color in self.palette:
            name = self._get_color_name(color)
            base = name.split()[-1]  # Get the last word (base color)
            distribution[base] = distribution.get(base, 0) + 1

        return distribution
