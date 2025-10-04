"""Template generation module for printable patterns."""

from typing import List, Tuple

import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.backends.backend_pdf import PdfPages

from pattern_generator import ToothpickPosition


class TemplateGenerator:
    """Generate printable templates for toothpick placement."""

    def __init__(self, paper_size: Tuple[float, float] = (8.5, 11.0)):
        """Initialize template generator.

        Args:
            paper_size: Paper size in inches (width, height)
        """
        self.paper_size = paper_size
        self.dpi = 300  # Print resolution

    def generate_template(
        self,
        toothpicks: List[ToothpickPosition],
        base_width: float,
        base_height: float,
        output_path: str,
        scale: float = 1.0,
    ):
        """Generate a printable template.

        Args:
            toothpicks: List of toothpick positions
            base_width: Width of the base in units
            base_height: Height of the base in units
            output_path: Path to save the PDF
            scale: Scale factor for printing
        """
        # Create figure with proper size
        fig_width = self.paper_size[0]
        fig_height = self.paper_size[1]

        fig, ax = plt.subplots(1, 1, figsize=(fig_width, fig_height))

        # Calculate scaling to fit on page with margins
        margin = 0.5  # inches
        available_width = fig_width - 2 * margin
        available_height = fig_height - 2 * margin

        # Calculate physical size based on aspect ratio
        # Assume base dimensions are in pixels, convert to inches (at 100 DPI for reasonable size)
        assumed_dpi = 100
        physical_width = base_width / assumed_dpi
        physical_height = base_height / assumed_dpi

        # Scale to fit on page while maintaining aspect ratio
        scale_x = available_width / physical_width
        scale_y = available_height / physical_height
        final_scale = min(scale_x, scale_y)

        # Set up the axes
        ax.set_xlim(0, base_width)
        ax.set_ylim(0, base_height)
        ax.set_aspect("equal")

        # Draw border
        border = patches.Rectangle(
            (0, 0),
            base_width,
            base_height,
            linewidth=2,
            edgecolor="black",
            facecolor="none",
        )
        ax.add_patch(border)

        # Draw grid lines for reference (adjust spacing based on image size)
        grid_spacing = max(base_width, base_height) // 20  # Approximately 20 grid lines
        grid_spacing = max(10, grid_spacing)  # Minimum spacing of 10
        for x in range(0, int(base_width) + 1, grid_spacing):
            ax.axvline(x, color="lightgray", linewidth=0.5, alpha=0.5)
        for y in range(0, int(base_height) + 1, grid_spacing):
            ax.axhline(y, color="lightgray", linewidth=0.5, alpha=0.5)

        # Plot toothpick positions
        # Adjust circle radius based on image size
        circle_radius = max(base_width, base_height) / 200  # Proportional to image size
        circle_radius = max(0.5, min(5, circle_radius))  # Keep between 0.5 and 5

        for toothpick in toothpicks:
            # Draw circle for position
            circle = patches.Circle(
                (toothpick.x, toothpick.y),
                radius=circle_radius,
                facecolor=self._rgb_to_hex(toothpick.color),
                edgecolor="black",
                linewidth=0.5,
            )
            ax.add_patch(circle)

        # Add title and information
        ax.set_title(
            f"Toothpick Art Template - {len(toothpicks)} positions\n"
            f"Image size: {int(base_width)} x {int(base_height)} pixels",
            fontsize=12,
            pad=20,
        )

        # Add coordinate labels
        ax.set_xlabel("Width (pixels)", fontsize=10)
        ax.set_ylabel("Height (pixels)", fontsize=10)

        # Add grid coordinates
        ax.grid(True, alpha=0.3)

        # Save as PDF
        plt.tight_layout()

        with PdfPages(output_path) as pdf:
            pdf.savefig(fig, dpi=self.dpi)

            # Add metadata
            d = pdf.infodict()
            d["Title"] = "Toothpick Art Template"
            d["Author"] = "Toothpick Art Simulator"
            d["Subject"] = "Printable template for toothpick placement"

        plt.close(fig)

    def generate_color_guide(
        self,
        toothpicks: List[ToothpickPosition],
        color_palette: List[Tuple[int, int, int]],
        output_path: str,
    ):
        """Generate a color guide showing all colors and their positions.

        Args:
            toothpicks: List of toothpick positions
            color_palette: List of unique colors
            output_path: Path to save the PDF
        """
        # Count toothpicks by color
        color_counts = {}
        for tp in toothpicks:
            color = tp.color
            color_counts[color] = color_counts.get(color, 0) + 1

        # Create figure
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 8.5))

        # Left side - Color swatches
        ax1.set_title("Color Palette", fontsize=14, weight="bold")
        ax1.set_xlim(0, 10)
        ax1.set_ylim(0, len(color_palette) + 1)
        ax1.axis("off")

        for i, color in enumerate(
            sorted(color_palette, key=lambda c: color_counts.get(c, 0), reverse=True)
        ):
            y_pos = len(color_palette) - i

            # Draw color swatch
            rect = patches.Rectangle(
                (1, y_pos - 0.4),
                2,
                0.8,
                facecolor=self._rgb_to_hex(color),
                edgecolor="black",
                linewidth=1,
            )
            ax1.add_patch(rect)

            # Add color information
            count = color_counts.get(color, 0)
            percentage = count / len(toothpicks) * 100

            ax1.text(
                3.5,
                y_pos,
                f"RGB({color[0]}, {color[1]}, {color[2]})",
                va="center",
                fontsize=10,
            )
            ax1.text(
                7, y_pos, f"{count} pcs ({percentage:.1f}%)", va="center", fontsize=10
            )

        # Right side - Statistics
        ax2.set_title("Project Statistics", fontsize=14, weight="bold")
        ax2.axis("off")

        stats_text = [
            f"Total Toothpicks: {len(toothpicks)}",
            f"Unique Colors: {len(color_palette)}",
            "",
            "Materials Needed:",
            "-" * 20,
        ]

        # Add color breakdown
        for color in sorted(
            color_palette, key=lambda c: color_counts.get(c, 0), reverse=True
        ):
            count = color_counts.get(color, 0)
            if count > 0:
                stats_text.append(f"• {self._rgb_to_hex(color)}: {count} toothpicks")

        # Display statistics
        ax2.text(
            0.1,
            0.9,
            "\n".join(stats_text),
            transform=ax2.transAxes,
            fontsize=11,
            verticalalignment="top",
            fontfamily="monospace",
        )

        plt.tight_layout()

        # Save as PDF
        with PdfPages(output_path) as pdf:
            pdf.savefig(fig, dpi=self.dpi)

        plt.close(fig)

    def _rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convert RGB tuple to hex color string.

        Args:
            rgb: RGB color tuple (0-255)

        Returns:
            Hex color string
        """
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
