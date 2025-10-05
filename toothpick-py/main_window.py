"""Main application window for toothpick art simulator."""

import sys

import numpy as np
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QColor, QPalette
from PyQt6.QtWidgets import (
    QCheckBox,
    QColorDialog,
    QComboBox,
    QFileDialog,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSlider,
    QSpinBox,
    QSplitter,
    QToolTip,
    QVBoxLayout,
    QWidget,
)

from color_manager import ColorManager
from color_popup import ColorPopup
from image_processor import ImageProcessor
from pattern_generator import PatternGenerator
from renderer_3d import Renderer3D
from template_generator import TemplateGenerator


class MainWindow(QMainWindow):
    """Main application window."""

    def __init__(self):
        """Initialize main window."""
        super().__init__()

        # Initialize components
        self.image_processor = ImageProcessor()
        self.pattern_generator = PatternGenerator()
        self.renderer = Renderer3D()
        self.color_manager = ColorManager()
        self.template_generator = TemplateGenerator()

        # State
        self.current_pattern = "grid"
        self.toothpick_count = 400
        self.toothpicks = []
        self.image_scale = 1.0  # Scale factor for 3D view

        # Debounce timer for toothpick updates
        self.update_timer = QTimer()
        self.update_timer.setSingleShot(True)
        self.update_timer.timeout.connect(self.update_toothpicks)

        # Flag to prevent multiple updates
        self.updating = False

        # Set up UI
        self.setWindowTitle("Toothpick Art Simulator")
        self.setGeometry(100, 100, 1200, 800)
        self.setup_ui()

        # Create initial demo scene
        self.create_demo_scene()

        # Set up toothpick click handler
        self.renderer.on_toothpick_clicked = self.on_toothpick_clicked
        self.renderer.on_toothpick_hover = self.on_toothpick_hover

        # Color popup - only hover popup needed
        self.hover_popup = ColorPopup(self)

        # Hover timer for smooth popup display
        self.hover_timer = QTimer()
        self.hover_timer.setSingleShot(True)
        self.hover_timer.timeout.connect(self._show_hover_popup)
        self.pending_hover_toothpick = None

    def setup_ui(self):
        """Set up the user interface."""
        # Create central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # Main layout
        main_layout = QHBoxLayout(central_widget)

        # Create splitter for resizable panels
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)

        # Left panel - Controls
        left_panel = self.create_control_panel()
        splitter.addWidget(left_panel)

        # Right panel - 3D View and color palette
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)

        # 3D View (base plane will be created by demo scene)
        right_layout.addWidget(self.renderer.get_canvas_widget())

        # 3D view takes full space
        right_layout.setStretch(0, 1)

        splitter.addWidget(right_panel)
        splitter.setStretchFactor(0, 1)  # Left panel
        splitter.setStretchFactor(1, 3)  # Right panel takes more space

    def create_control_panel(self) -> QWidget:
        """Create the control panel widget."""
        panel = QWidget()
        layout = QVBoxLayout(panel)

        # Image controls
        image_group = QGroupBox("Image")
        image_layout = QVBoxLayout()

        load_btn = QPushButton("Load Image")
        load_btn.clicked.connect(self.load_image)
        image_layout.addWidget(load_btn)

        self.image_label = QLabel("No image loaded")
        image_layout.addWidget(self.image_label)

        # k-NN color parameter
        knn_layout = QHBoxLayout()
        knn_layout.addWidget(QLabel("Color k-NN:"))

        self.knn_spinbox = QSpinBox()
        self.knn_spinbox.setRange(1, 256)
        self.knn_spinbox.setValue(16)
        self.knn_spinbox.setToolTip(
            "k=1 for original colors (gradient), higher k for color clustering"
        )
        self.knn_spinbox.valueChanged.connect(self.update_knn_colors)
        knn_layout.addWidget(self.knn_spinbox)

        image_layout.addLayout(knn_layout)

        image_group.setLayout(image_layout)
        layout.addWidget(image_group)

        # Pattern controls
        pattern_group = QGroupBox("Pattern")
        pattern_layout = QVBoxLayout()

        pattern_layout.addWidget(QLabel("Pattern Type:"))
        self.pattern_combo = QComboBox()
        self.pattern_combo.addItems(["Grid", "Offset Grid", "Hexagonal", "Circular"])
        self.pattern_combo.currentTextChanged.connect(self.change_pattern)
        pattern_layout.addWidget(self.pattern_combo)

        # Toothpick count input
        count_layout = QHBoxLayout()
        count_layout.addWidget(QLabel("Total Toothpicks:"))

        self.toothpick_count_spinbox = QSpinBox()
        self.toothpick_count_spinbox.setRange(1, 10000)
        self.toothpick_count_spinbox.setValue(400)
        self.toothpick_count_spinbox.setSingleStep(10)
        self.toothpick_count_spinbox.setToolTip("Number of toothpicks to place")
        self.toothpick_count_spinbox.valueChanged.connect(self.change_toothpick_count)
        count_layout.addWidget(self.toothpick_count_spinbox)

        pattern_layout.addLayout(count_layout)

        pattern_group.setLayout(pattern_layout)
        layout.addWidget(pattern_group)

        # View controls
        view_group = QGroupBox("View")
        view_layout = QVBoxLayout()

        reset_view_btn = QPushButton("Reset View")
        reset_view_btn.clicked.connect(self.renderer.reset_view)
        view_layout.addWidget(reset_view_btn)

        view_layout.addWidget(QLabel("Colors:"))

        bg_color_btn = QPushButton("Background Color")
        bg_color_btn.clicked.connect(self.change_background_color)
        view_layout.addWidget(bg_color_btn)

        cardboard_color_btn = QPushButton("Cardboard Color")
        cardboard_color_btn.clicked.connect(self.change_cardboard_color)
        view_layout.addWidget(cardboard_color_btn)

        view_group.setLayout(view_layout)
        layout.addWidget(view_group)

        # Export controls
        export_group = QGroupBox("Export")
        export_layout = QVBoxLayout()

        export_template_btn = QPushButton("Export Template")
        export_template_btn.clicked.connect(self.export_template)
        export_layout.addWidget(export_template_btn)

        export_colors_btn = QPushButton("Export Color List")
        export_colors_btn.clicked.connect(self.export_colors)
        export_layout.addWidget(export_colors_btn)

        export_group.setLayout(export_layout)
        layout.addWidget(export_group)

        # Add stretch to push everything to top
        layout.addStretch()

        # Color picker mode toggle at the bottom
        color_picker_group = QGroupBox("Color Picker")
        color_picker_layout = QVBoxLayout()

        self.color_picker_checkbox = QCheckBox("Enable Color Picker Mode (C)")
        self.color_picker_checkbox.setToolTip(
            "Switch to 2D view with clickable dots for color inspection\nShortcut: C"
        )
        self.color_picker_checkbox.stateChanged.connect(self.toggle_color_picker_mode)
        self.color_picker_checkbox.setStyleSheet("""
            QCheckBox {
                font-weight: bold;
                padding: 5px;
            }
            QCheckBox::indicator {
                width: 20px;
                height: 20px;
            }
        """)
        color_picker_layout.addWidget(self.color_picker_checkbox)

        color_picker_info = QLabel("Hover to preview colors\nClick to lock color info")
        color_picker_info.setWordWrap(True)
        color_picker_info.setStyleSheet("color: gray; font-size: 11px;")
        color_picker_layout.addWidget(color_picker_info)

        color_picker_group.setLayout(color_picker_layout)
        layout.addWidget(color_picker_group)

        return panel

    def load_image(self):
        """Load an image file."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select Image", "", "Image Files (*.png *.jpg *.jpeg *.bmp *.gif)"
        )

        if file_path:
            try:
                # Load image at original size
                self.image_processor.load_image(file_path)

                # Apply k-NN colors
                k_value = self.knn_spinbox.value()
                if k_value == 1:
                    self.image_processor.enable_gradient_mode()
                else:
                    self.image_processor.disable_gradient_mode()
                    self.image_processor.target_colors = k_value
                    self.image_processor.quantize_colors()

                # Update UI with image dimensions
                img_width, img_height = self.image_processor.get_image_dimensions()
                self.image_label.setText(
                    f"Image: {file_path.split('/')[-1]} ({img_width}×{img_height}px)"
                )

                # Use actual image dimensions for the pattern generator
                self.pattern_generator.base_width = img_width
                self.pattern_generator.base_height = img_height

                # Calculate scale factor to fit 3D view nicely
                # Target size of ~200 units for the larger dimension
                max_dim = max(img_width, img_height)
                self.image_scale = 200.0 / max_dim

                # Update color palette
                self.color_manager.set_palette(self.image_processor.color_palette)

                # Update 3D view with scaled dimensions
                scaled_width = img_width * self.image_scale
                scaled_height = img_height * self.image_scale
                self.renderer.create_base_plane(scaled_width, scaled_height)
                self.update_toothpicks()

            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to load image: {str(e)}")

    def update_knn_colors(self, k_value: int):
        """Update color mode based on k-NN value."""
        if self.image_processor.image is not None:
            if k_value == 1:
                self.image_processor.enable_gradient_mode()
            else:
                self.image_processor.disable_gradient_mode()
                self.image_processor.target_colors = k_value
                if self.image_processor.original_array is not None:
                    self.image_processor.quantize_colors()

            # Update color palette and view
            self.color_manager.set_palette(self.image_processor.color_palette)
            self.update_toothpicks()

    def change_pattern(self, pattern_name: str):
        """Change the toothpick pattern."""
        self.current_pattern = pattern_name.lower()
        self.update_toothpicks()

    def change_toothpick_count(self, value: int):
        """Change total number of toothpicks."""
        self.toothpick_count = value
        # Debounce updates - restart timer on each change
        self.update_timer.stop()
        self.update_timer.start(150)  # 150ms delay to avoid too frequent updates

    def update_toothpicks(self):
        """Update toothpick positions based on current settings."""
        if self.updating:
            return

        if self.image_processor.image is None:
            return

        # Ensure we have image data in either mode
        if (
            not self.image_processor.gradient_mode
            and self.image_processor.quantized_image is None
        ):
            return

        self.updating = True

        # Calculate grid dimensions from total count
        import math

        # Get actual image dimensions
        img_width, img_height = self.image_processor.get_image_dimensions()

        if self.current_pattern in ["grid", "offset grid", "hexagonal"]:
            # Calculate rows and cols based on image aspect ratio
            aspect_ratio = img_width / float(img_height)

            # Total toothpicks = rows * cols
            # rows / cols = height / width = 1 / aspect_ratio
            # So: rows = cols / aspect_ratio
            # And: cols * (cols / aspect_ratio) = toothpick_count
            # Therefore: cols = sqrt(toothpick_count * aspect_ratio)

            cols = int(math.sqrt(self.toothpick_count * aspect_ratio))
            rows = int(self.toothpick_count / cols)

            # Adjust to match total count better
            if rows * cols < self.toothpick_count:
                rows += 1

            # Calculate spacing based on actual image dimensions
            spacing_x = img_width / float(cols)
            spacing_y = img_height / float(rows)
            spacing = min(spacing_x, spacing_y)  # Use uniform spacing
        else:  # circular
            rings = int(math.sqrt(self.toothpick_count / math.pi))
            # Use the smaller dimension for circular patterns
            min_dim = min(img_width, img_height)
            spacing = min_dim / (rings * 2)

        # Generate pattern positions
        if self.current_pattern == "grid":
            positions = self.pattern_generator.generate_grid_pattern(
                rows, cols, spacing
            )
        elif self.current_pattern == "offset grid":
            positions = self.pattern_generator.generate_offset_grid_pattern(
                rows, cols, spacing
            )
        elif self.current_pattern == "hexagonal":
            positions = self.pattern_generator.generate_hexagonal_pattern(
                rows, cols, spacing
            )
        else:  # circular
            positions = self.pattern_generator.generate_circular_pattern(rings, spacing)

        # Trim to exact toothpick count
        if len(positions) > self.toothpick_count:
            positions = positions[: self.toothpick_count]

        def color_function(x, y):
            # Positions are already in pixel coordinates
            img_x = int(x)
            img_y = int(y)

            # Clamp to image bounds
            img_x = max(0, min(img_width - 1, img_x))
            img_y = max(0, min(img_height - 1, img_y))

            return self.image_processor.get_color_at_position(img_x, img_y)

        # Create toothpicks (positions are in pixel coordinates)
        self.toothpicks = self.pattern_generator.create_toothpicks_from_pattern(
            positions, color_function
        )

        # Scale toothpick positions for 3D view
        # We scale from pixel coordinates to 3D view coordinates for better visualization
        scaled_toothpicks = []
        for toothpick in self.toothpicks:
            # Create a copy with scaled positions
            from pattern_generator import ToothpickPosition

            scaled_tp = ToothpickPosition(
                x=toothpick.x * self.image_scale,
                y=toothpick.y * self.image_scale,
                z=toothpick.z,
                color=toothpick.color,
                angle=toothpick.angle,
            )
            scaled_toothpicks.append(scaled_tp)

        # Store scaled toothpicks for reuse
        self._last_scaled_toothpicks = scaled_toothpicks

        # Update 3D view with scaled positions
        self.renderer.add_toothpicks(scaled_toothpicks)

        self.updating = False

    def toggle_color_picker_mode(self, state: int):
        """Toggle color picker mode."""
        enabled = state == Qt.CheckState.Checked.value
        
        if enabled:
            # First switch to 2D view
            self.renderer.set_2d_mode(True)
            # Then enable color picker mode which will recreate toothpicks as dots
            self.renderer.set_color_picker_mode(True)
        else:
            # Disable color picker mode first
            self.renderer.set_color_picker_mode(False)
            # Then return to 3D view
            self.renderer.set_2d_mode(False)

        # Hide any open popups when toggling mode
        self.hover_popup.hide()
        self.hover_timer.stop()
        self.pending_hover_toothpick = None

    def on_toothpick_hover(self, toothpick):
        """Handle hover over toothpick in color picker mode."""
        self.hover_timer.stop()

        if toothpick and self.color_picker_checkbox.isChecked():
            # If already hovering over a different toothpick, hide old popup immediately
            if (
                self.hover_popup.isVisible()
                and self.pending_hover_toothpick != toothpick
            ):
                self.hover_popup.hide()

            # Map scaled toothpick back to original if needed
            if (
                hasattr(self, "_last_scaled_toothpicks")
                and toothpick in self._last_scaled_toothpicks
            ):
                index = self._last_scaled_toothpicks.index(toothpick)
                if index < len(self.toothpicks):
                    toothpick = self.toothpicks[index]

            self.pending_hover_toothpick = toothpick
            self.hover_timer.start(25)  # 25ms delay for very responsive feel
        else:
            self.pending_hover_toothpick = None
            self.hover_popup.hide()

    def _show_hover_popup(self):
        """Show hover popup after delay."""
        if self.pending_hover_toothpick and self.color_picker_checkbox.isChecked():
            # Get color information
            color_info = self.color_manager.get_color_info(
                self.pending_hover_toothpick.color
            )

            # Update and show hover popup
            self.hover_popup.set_color(self.pending_hover_toothpick.color, color_info)

            # Position popup near mouse
            cursor_pos = self.cursor().pos()  # Global position
            popup_x = cursor_pos.x() + 20
            popup_y = cursor_pos.y() - self.hover_popup.height() - 20

            # Keep popup within screen bounds
            screen = self.screen().availableGeometry()
            if popup_x + self.hover_popup.width() > screen.right():
                popup_x = cursor_pos.x() - self.hover_popup.width() - 20
            if popup_y < screen.top():
                popup_y = cursor_pos.y() + 20

            self.hover_popup.move(popup_x, popup_y)
            self.hover_popup.show_as_hover()

    def change_background_color(self):
        """Change 3D view background color using color picker."""
        color = QColorDialog.getColor(
            Qt.GlobalColor.white, self, "Select Background Color"
        )
        if color.isValid():
            # Convert to 0-1 range for renderer
            r, g, b = color.redF(), color.greenF(), color.blueF()
            self.renderer.set_background((r, g, b))

    def change_cardboard_color(self):
        """Change cardboard base color using color picker."""
        color = QColorDialog.getColor(
            Qt.GlobalColor.gray, self, "Select Cardboard Color"
        )
        if color.isValid():
            # Convert to 0-1 range for renderer
            r, g, b = color.redF(), color.greenF(), color.blueF()
            # Use scaled dimensions for the base plane
            self.renderer.create_base_plane(
                self.pattern_generator.base_width * self.image_scale,
                self.pattern_generator.base_height * self.image_scale,
                (r, g, b),
            )
            # Re-add scaled toothpicks to refresh the scene
            if hasattr(self, "_last_scaled_toothpicks"):
                self.renderer.add_toothpicks(self._last_scaled_toothpicks)

    def on_toothpick_clicked(self, toothpick):
        """Handle toothpick selection."""
        # In color picker mode, we only use hover popups, no click popups
        pass

    def export_template(self):
        """Export printable template."""
        if not self.toothpicks:
            QMessageBox.warning(
                self, "No Data", "Please load an image and generate a pattern first."
            )
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self, "Save Template", "toothpick_template.pdf", "PDF Files (*.pdf)"
        )

        if file_path:
            try:
                self.template_generator.generate_template(
                    self.toothpicks,  # Original unscaled positions
                    self.pattern_generator.base_width,
                    self.pattern_generator.base_height,
                    file_path,
                )

                QMessageBox.information(
                    self,
                    "Export Complete",
                    f"Template saved to:\n{file_path}",
                )
            except Exception as e:
                QMessageBox.critical(
                    self, "Error", f"Failed to export template: {str(e)}"
                )

    def export_colors(self):
        """Export color list."""
        if not self.color_manager.palette:
            QMessageBox.warning(self, "No Colors", "Please load an image first.")
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self, "Save Color List", "color_palette.txt", "Text Files (*.txt)"
        )

        if file_path:
            with open(file_path, "w") as f:
                f.write("Toothpick Art Color Palette\n")
                f.write("=" * 40 + "\n\n")

                for i, color in enumerate(self.color_manager.palette, 1):
                    info = self.color_manager.get_color_info(color)
                    f.write(f"Color {i}: {info['name']}\n")
                    f.write(f"  {info['rgb']}\n")
                    f.write(f"  {info['hex']}\n")
                    f.write(f"  {info['hsv']}\n\n")

            QMessageBox.information(
                self, "Export Complete", f"Color list saved to {file_path}"
            )

    def create_demo_scene(self):
        """Create a demo scene with random colors."""
        # Generate random color palette
        demo_colors = [
            (255, 0, 0),  # Red
            (0, 255, 0),  # Green
            (0, 0, 255),  # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
        ]

        self.color_manager.set_palette(demo_colors)

        # Set demo dimensions (100x100 for initial scene)
        self.pattern_generator.base_width = 100
        self.pattern_generator.base_height = 100
        self.image_scale = 2.0  # Scale for nice 3D view

        # Create base plane with scaled dimensions
        self.renderer.create_base_plane(
            self.pattern_generator.base_width * self.image_scale,
            self.pattern_generator.base_height * self.image_scale,
        )

        # Generate pattern
        positions = self.pattern_generator.generate_grid_pattern(10, 10, 10)

        # Random color function (x, y are in pixel coordinates)
        def random_color_function(x, y):
            import random

            return random.choice(demo_colors)

        # Create toothpicks
        self.toothpicks = self.pattern_generator.create_toothpicks_from_pattern(
            positions, random_color_function
        )

        # Scale toothpick positions for 3D view
        scaled_toothpicks = []
        for toothpick in self.toothpicks:
            # Create a copy with scaled positions
            from pattern_generator import ToothpickPosition

            scaled_tp = ToothpickPosition(
                x=toothpick.x * self.image_scale,
                y=toothpick.y * self.image_scale,
                z=toothpick.z,
                color=toothpick.color,
                angle=toothpick.angle,
            )
            scaled_toothpicks.append(scaled_tp)

        # Store scaled toothpicks for reuse
        self._last_scaled_toothpicks = scaled_toothpicks

        self.renderer.add_toothpicks(scaled_toothpicks)

    def keyPressEvent(self, event):
        """Handle keyboard shortcuts."""
        if event.key() == Qt.Key.Key_C:
            # Toggle color picker mode
            self.color_picker_checkbox.setChecked(
                not self.color_picker_checkbox.isChecked()
            )
        else:
            super().keyPressEvent(event)
