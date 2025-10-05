"""3D rendering module using vispy."""

from typing import List, Optional, Tuple

import numpy as np
from vispy import scene
from vispy.scene import SceneCanvas, visuals
from vispy.visuals.transforms import STTransform

from pattern_generator import ToothpickPosition


class Renderer3D:
    """3D renderer for toothpick artwork visualization."""

    def __init__(self, size: Tuple[int, int] = (800, 800)):
        """Initialize 3D renderer.

        Args:
            size: Canvas size (width, height)
        """
        # Create canvas
        self.canvas = SceneCanvas(
            keys="interactive", bgcolor="white", size=size, show=False
        )

        # Add a ViewBox for 3D scene
        self.view = self.canvas.central_widget.add_view()

        # Set the view to use the full canvas
        self.view.border_color = None  # No border
        self.view.bgcolor = "white"

        # Create 3D camera with perspective projection
        # We'll handle aspect ratio through proper camera setup
        self.camera = scene.TurntableCamera(
            elevation=30,
            azimuth=30,
            fov=60,  # Use perspective projection
            distance=300,
        )
        self.view.camera = self.camera

        # Add axes for reference (disabled by default to avoid confusion)
        # self.axis = visuals.XYZAxis(parent=self.view.scene)

        # Store visual elements
        self.toothpicks = []
        self.base_plane = None
        self.light_direction = np.array([1, 1, 2])

        # Set up lighting
        self.setup_lighting()

        # Store clicked toothpick info
        self.selected_toothpick = None
        self.on_toothpick_clicked = None  # Callback function
        self.color_picker_mode = False
        self.on_toothpick_hover = None  # Callback for hover

        # Store base dimensions for proper alignment
        self.base_width = 100
        self.base_height = 100

        # Connect mouse events
        self.canvas.events.mouse_press.connect(self.on_mouse_press)
        self.canvas.events.mouse_move.connect(self.on_mouse_move)

    def setup_lighting(self):
        """Configure scene lighting."""
        # Vispy doesn't have built-in lighting for basic shapes,
        # but we can simulate it with color adjustments
        self.ambient_light = 0.3
        self.diffuse_light = 0.7

    def create_base_plane(
        self,
        width: float,
        height: float,
        color: Tuple[float, float, float] = (0.8, 0.6, 0.4),
    ):
        """Create the cardboard base plane.

        Args:
            width: Width of the base
            height: Height of the base
            color: RGB color of the base
        """
        # Store dimensions for alignment
        self.base_width = width
        self.base_height = height

        # Remove existing base plane if it exists
        if self.base_plane is not None:
            self.base_plane.parent = None

        # Create a plane mesh
        vertices = np.array(
            [[0, 0, 0], [width, 0, 0], [width, height, 0], [0, height, 0]],
            dtype=np.float32,
        )

        faces = np.array([[0, 1, 2], [0, 2, 3]], dtype=np.uint32)

        # Create mesh visual
        self.base_plane = visuals.Mesh(
            vertices=vertices,
            faces=faces,
            color=color + (1.0,),  # Add alpha
            shading=None,  # Disable shading to show true color
            parent=self.view.scene,
        )

        # Center the base
        self.base_plane.transform = STTransform(translate=(-width / 2, -height / 2, 0))

        # Add a border to show the exact dimensions
        from vispy.scene import Line

        border_points = np.array(
            [
                [-width / 2, -height / 2, 0.1],
                [width / 2, -height / 2, 0.1],
                [width / 2, height / 2, 0.1],
                [-width / 2, height / 2, 0.1],
                [-width / 2, -height / 2, 0.1],  # Close the border
            ]
        )

        # Remove old border if exists
        if hasattr(self, "base_border") and self.base_border is not None:
            self.base_border.parent = None

        self.base_border = Line(
            pos=border_points,
            color="black",
            width=3,
            parent=self.view.scene,
            connect="strip",
        )

        # Adjust camera to frame the base properly
        max_dim = max(width, height)

        # Center the camera on the base
        self.camera.center = (0, 0, 0)

        # Set the camera aspect ratio and view rect
        canvas_width, canvas_height = self.canvas.size
        if canvas_height > 0 and hasattr(self.camera, "aspect"):
            self.camera.aspect = canvas_width / float(canvas_height)

        # Ensure the camera frames the content properly
        # Adjust distance based on field of view and content size
        if self.camera.fov > 0:  # Perspective mode
            # Calculate distance to fit content in view
            fov_rad = np.radians(self.camera.fov)
            # Use the larger dimension to ensure everything fits
            required_distance = (max_dim / 2.0) / np.tan(fov_rad / 2.0)
            self.camera.distance = required_distance * 1.5  # Add some padding

        # Force update of the view
        self.view.update()
        self.canvas.update()

    def add_toothpicks(self, toothpicks: List[ToothpickPosition]):
        """Add toothpicks to the scene.

        Args:
            toothpicks: List of toothpick positions and colors
        """
        # Clear existing toothpicks
        for tp in self.toothpicks:
            tp.parent = None
        self.toothpicks.clear()

        # Store toothpick data for selection
        self.toothpick_data = toothpicks
        self.hovered_index = None

        # Use stored base dimensions for proper centering
        base_width = self.base_width
        base_height = self.base_height

        # Add new toothpicks or dots based on mode
        for i, toothpick in enumerate(toothpicks):
            if self.color_picker_mode:
                # Create dot for color picker mode
                visual = self._create_dot_visual(
                    position=(
                        toothpick.x,
                        toothpick.y,
                        2.0,
                    ),  # Well above base for visibility
                    color=toothpick.color,
                    radius=5.0,  # Even larger for easier interaction
                    base_width=base_width,
                    base_height=base_height,
                )
            else:
                # Create cylinder for toothpick
                visual = self._create_toothpick_visual(
                    position=(toothpick.x, toothpick.y, toothpick.z),
                    color=toothpick.color,
                    height=30.0,
                    radius=0.5,
                    base_width=base_width,
                    base_height=base_height,
                )
            self.toothpicks.append(visual)

    def _create_toothpick_visual(
        self,
        position: Tuple[float, float, float],
        color: Tuple[int, int, int],
        height: float = 30.0,
        radius: float = 0.5,
        base_width: float = 100.0,
        base_height: float = 100.0,
    ):
        """Create a single toothpick visual.

        Args:
            position: (x, y, z) position
            color: RGB color (0-255)
            height: Height of toothpick
            radius: Radius of toothpick

        Returns:
            Visual object for the toothpick
        """
        # Convert color to 0-1 range
        color_normalized = tuple(c / 255.0 for c in color)

        # Create a tube (cylinder) for the toothpick
        # Using a simple line with width for now (vispy limitation)
        points = np.array(
            [[position[0], position[1], 0], [position[0], position[1], height]]
        )

        # Adjust position to center on base
        width_offset = base_width / 2
        height_offset = base_height / 2

        adjusted_points = points - np.array([width_offset, height_offset, 0])

        line = visuals.Line(
            pos=adjusted_points,
            color=color_normalized + (1.0,),
            width=radius * 4,  # Adjust for visual appearance
            parent=self.view.scene,
            connect="segments",
            method="gl",
        )
        # Make lines interactive for picking
        line.interactive = True

        return line

    def _create_dot_visual(
        self,
        position: Tuple[float, float, float],
        color: Tuple[int, int, int],
        radius: float = 2.0,
        base_width: float = 100.0,
        base_height: float = 100.0,
    ):
        """Create a dot visual for color picker mode.

        Args:
            position: (x, y, z) position
            color: RGB color (0-255)
            radius: Radius of dot

        Returns:
            Visual object for the dot
        """
        # Convert color to 0-1 range
        color_normalized = tuple(c / 255.0 for c in color)

        # Create marker (dot)
        from vispy.scene import Markers

        # Adjust position to center on base
        width_offset = base_width / 2
        height_offset = base_height / 2

        adjusted_pos = np.array(
            [[position[0] - width_offset, position[1] - height_offset, position[2]]]
        )

        marker = Markers(
            pos=adjusted_pos,
            size=radius * 30,  # Extra large for easy hovering/clicking
            edge_color="black",
            edge_width=3,
            face_color=color_normalized + (1.0,),
            symbol="disc",
            parent=self.view.scene,
            antialias=0,  # Sharp edges for better visibility
        )
        # Make markers interactive for picking
        marker.interactive = True

        return marker

    def set_background(self, color: Optional[Tuple[float, float, float]] = None):
        """Set background color.

        Args:
            color: RGB color (0-1 range) or None for default
        """
        if color is None:
            color = (0.95, 0.95, 0.95)
        self.canvas.bgcolor = color

    def update_camera(
        self,
        elevation: Optional[float] = None,
        azimuth: Optional[float] = None,
        distance: Optional[float] = None,
    ):
        """Update camera position.

        Args:
            elevation: Camera elevation angle
            azimuth: Camera azimuth angle
            distance: Camera distance from center
        """
        if elevation is not None:
            self.camera.elevation = elevation
        if azimuth is not None:
            self.camera.azimuth = azimuth
        if distance is not None:
            self.camera.distance = distance

    def get_canvas_widget(self):
        """Get the canvas widget for embedding in Qt."""
        # Force canvas to update its size
        self.canvas.update()
        return self.canvas.native

    def render_to_image(self) -> np.ndarray:
        """Render current view to image array.

        Returns:
            RGB image array
        """
        return self.canvas.render()

    def reset_view(self):
        """Reset camera to default position."""
        self.camera.elevation = 30
        self.camera.azimuth = 30
        self.camera.distance = 200
        self.camera.fov = 60

    def on_mouse_press(self, event):
        """Handle mouse press events for toothpick selection."""
        if (
            event.button == 1
            and hasattr(self, "toothpick_data")
            and self.toothpick_data
        ):
            # Use vispy's built-in picking
            visual = self.canvas.visual_at(event.pos)

            # Find which toothpick was clicked
            if visual is not None and visual in self.toothpicks:
                selected_index = self.toothpicks.index(visual)
                if (
                    selected_index < len(self.toothpick_data)
                    and self.on_toothpick_clicked
                ):
                    self.selected_toothpick = self.toothpick_data[selected_index]
                    self.on_toothpick_clicked(self.selected_toothpick)

    def on_mouse_move(self, event):
        """Handle mouse move events for hover in color picker mode."""
        if (
            self.color_picker_mode
            and hasattr(self, "toothpick_data")
            and self.toothpick_data
        ):
            try:
                # Use vispy's built-in picking
                visual = self.canvas.visual_at(event.pos)

                # Find which toothpick is hovered
                if visual is not None and visual in self.toothpicks:
                    hovered_index = self.toothpicks.index(visual)
                    if hovered_index < len(self.toothpick_data) and hasattr(
                        self, "on_toothpick_hover"
                    ):
                        self.on_toothpick_hover(self.toothpick_data[hovered_index])
                elif hasattr(self, "on_toothpick_hover"):
                    self.on_toothpick_hover(None)
            except Exception:
                # Ignore picking errors during fast mouse movements
                pass

    def set_color_picker_mode(self, enabled: bool):
        """Enable or disable color picker mode."""
        self.color_picker_mode = enabled
        # Refresh display if we have toothpicks
        if hasattr(self, "toothpick_data") and self.toothpick_data:
            self.add_toothpicks(self.toothpick_data)

    def set_2d_mode(self, enabled: bool):
        """Switch between 2D and 3D camera modes."""
        if enabled:
            # Store current 3D camera state
            if hasattr(self.camera, "elevation"):
                self._stored_elevation = self.camera.elevation
                self._stored_azimuth = self.camera.azimuth
                self._stored_distance = self.camera.distance

            # Hide border in 2D mode
            if hasattr(self, "base_border") and self.base_border is not None:
                self.base_border.parent = None

            # Switch to 2D orthographic view looking down from above
            self.camera.elevation = 90  # Look straight down
            self.camera.azimuth = 0
            self.camera.fov = 0  # Orthographic projection

            # Calculate proper scale for orthographic view
            if hasattr(self, "base_width") and hasattr(self, "base_height"):
                # Get canvas aspect ratio
                canvas_width, canvas_height = self.canvas.size
                canvas_aspect = (
                    canvas_width / float(canvas_height) if canvas_height > 0 else 1.0
                )

                # Get scene aspect ratio
                scene_aspect = (
                    self.base_width / float(self.base_height)
                    if self.base_height > 0
                    else 1.0
                )

                # Calculate scale to fit the scene properly
                if scene_aspect > canvas_aspect:
                    # Scene is wider than canvas
                    scale = self.base_width * 0.6
                else:
                    # Scene is taller than canvas
                    scale = self.base_height * 0.6 * canvas_aspect

                self.camera.scale_factor = scale
                self.camera.center = (0, 0, 0)

            # Force update to ensure everything is visible
            self.view.update()
            self.canvas.update()
        else:
            # Restore 3D camera settings
            # Restore border in 3D mode
            if hasattr(self, "base_width") and hasattr(self, "base_height"):
                # Recreate border
                from vispy.scene import Line

                border_points = np.array(
                    [
                        [-self.base_width / 2, -self.base_height / 2, 0.1],
                        [self.base_width / 2, -self.base_height / 2, 0.1],
                        [self.base_width / 2, self.base_height / 2, 0.1],
                        [-self.base_width / 2, self.base_height / 2, 0.1],
                        [-self.base_width / 2, -self.base_height / 2, 0.1],
                    ]
                )
                self.base_border = Line(
                    pos=border_points,
                    color="black",
                    width=3,
                    parent=self.view.scene,
                    connect="strip",
                )

            # Restore previous view if we had stored it
            if hasattr(self, "_stored_elevation"):
                self.camera.elevation = self._stored_elevation
                self.camera.azimuth = self._stored_azimuth
                self.camera.distance = self._stored_distance
                self.camera.fov = 60  # Restore perspective projection
