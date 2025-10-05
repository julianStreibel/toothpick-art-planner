"""Pattern generation module for toothpick placement."""

from dataclasses import dataclass
from typing import List, Literal, Optional, Tuple

import numpy as np


@dataclass
class ToothpickPosition:
    """Represents a single toothpick position and color."""

    x: float
    y: float
    z: float
    color: Tuple[int, int, int]
    angle: float = 90.0  # Angle from surface normal


class PatternGenerator:
    """Generate various toothpick patterns."""

    def __init__(self, base_width: float = 100.0, base_height: float = 100.0):
        """Initialize pattern generator.

        Args:
            base_width: Width of the base cardboard
            base_height: Height of the base cardboard
        """
        self.base_width = base_width
        self.base_height = base_height

    def generate_grid_pattern(
        self, rows: int, cols: int, spacing: float = 5.0
    ) -> List[Tuple[float, float]]:
        """Generate regular grid pattern.

        Args:
            rows: Number of rows
            cols: Number of columns
            spacing: Distance between toothpicks

        Returns:
            List of (x, y) positions
        """
        positions = []

        # Calculate offsets to center the grid
        total_width = (cols - 1) * spacing
        total_height = (rows - 1) * spacing
        offset_x = (self.base_width - total_width) / 2
        offset_y = (self.base_height - total_height) / 2

        for row in range(rows):
            for col in range(cols):
                x = offset_x + col * spacing
                y = offset_y + row * spacing
                positions.append((x, y))

        return positions

    def generate_offset_grid_pattern(
        self, rows: int, cols: int, spacing: float = 5.0
    ) -> List[Tuple[float, float]]:
        """Generate offset grid pattern (brick-like).

        Args:
            rows: Number of rows
            cols: Number of columns
            spacing: Distance between toothpicks

        Returns:
            List of (x, y) positions
        """
        positions = []

        # Calculate offsets to center the grid
        total_width = (cols - 1) * spacing + (spacing / 2 if rows > 1 else 0)
        total_height = (rows - 1) * spacing
        offset_x = (self.base_width - total_width) / 2
        offset_y = (self.base_height - total_height) / 2

        for row in range(rows):
            for col in range(cols):
                x = offset_x + col * spacing
                # Offset every other row by half spacing
                if row % 2 == 1:
                    x += spacing / 2
                y = offset_y + row * spacing

                # Check if position is within bounds
                if 0 <= x <= self.base_width and 0 <= y <= self.base_height:
                    positions.append((x, y))

        return positions

    def generate_hexagonal_pattern(
        self, rows: int, cols: int, spacing: float = 5.0
    ) -> List[Tuple[float, float]]:
        """Generate hexagonal pattern.

        Args:
            rows: Number of rows
            cols: Number of columns
            spacing: Distance between adjacent toothpicks

        Returns:
            List of (x, y) positions
        """
        positions = []
        hex_height = spacing * np.sqrt(3) / 2

        # Calculate offsets
        total_width = (cols - 1) * spacing + (spacing / 2 if rows > 1 else 0)
        total_height = (rows - 1) * hex_height
        offset_x = (self.base_width - total_width) / 2
        offset_y = (self.base_height - total_height) / 2

        for row in range(rows):
            for col in range(cols):
                x = offset_x + col * spacing
                if row % 2 == 1:  # Offset every other row
                    x += spacing / 2
                y = offset_y + row * hex_height

                # Check if position is within bounds
                if 0 <= x <= self.base_width and 0 <= y <= self.base_height:
                    positions.append((x, y))

        return positions

    def generate_circular_pattern(
        self,
        rings: int,
        spacing: float = 5.0,
        center: Optional[Tuple[float, float]] = None,
    ) -> List[Tuple[float, float]]:
        """Generate circular/radial pattern.

        Args:
            rings: Number of concentric rings
            spacing: Distance between rings
            center: Center point (defaults to board center)

        Returns:
            List of (x, y) positions
        """
        if center is None:
            center = (self.base_width / 2, self.base_height / 2)

        positions = []

        # Add center point
        positions.append(center)

        # Add rings
        for ring in range(1, rings + 1):
            radius = ring * spacing
            # Number of points in this ring (proportional to circumference)
            num_points = max(6, int(2 * np.pi * radius / spacing))

            for i in range(num_points):
                angle = 2 * np.pi * i / num_points
                x = center[0] + radius * np.cos(angle)
                y = center[1] + radius * np.sin(angle)

                # Check if position is within bounds
                if 0 <= x <= self.base_width and 0 <= y <= self.base_height:
                    positions.append((x, y))

        return positions

    def create_toothpicks_from_pattern(
        self,
        positions: List[Tuple[float, float]],
        color_function,
        toothpick_height: float = 30.0,
    ) -> List[ToothpickPosition]:
        """Create toothpick objects from pattern positions.

        Args:
            positions: List of (x, y) base positions
            color_function: Function that returns color for given position
            toothpick_height: Height of toothpicks

        Returns:
            List of ToothpickPosition objects
        """
        toothpicks = []

        for x, y in positions:
            # Get color from the color function
            color = color_function(x, y)

            # Create toothpick at this position
            toothpick = ToothpickPosition(
                x=x,
                y=y,
                z=toothpick_height / 2,  # Center of toothpick
                color=color,
            )
            toothpicks.append(toothpick)

        return toothpicks
