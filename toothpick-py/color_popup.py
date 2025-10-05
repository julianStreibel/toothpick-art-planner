"""Color popup widget for toothpick color inspection."""

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QColor, QPalette
from PyQt6.QtWidgets import QFrame, QLabel, QPushButton, QVBoxLayout, QWidget


class ColorPopup(QWidget):
    """Popup widget to display color information."""

    closed = pyqtSignal()

    def __init__(self, parent=None):
        """Initialize color popup."""
        super().__init__(parent)

        # Make it a popup window
        self.setWindowFlags(Qt.WindowType.Popup | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Main frame with border
        self.frame = QFrame()
        self.frame.setFrameStyle(QFrame.Shape.Box)
        self.frame.setStyleSheet("""
            QFrame {
                background-color: white;
                border: 2px solid black;
                border-radius: 5px;
            }
        """)

        # Layout
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(self.frame)

        frame_layout = QVBoxLayout(self.frame)
        frame_layout.setContentsMargins(10, 10, 10, 10)

        # Color display
        self.color_display = QLabel()
        self.color_display.setFixedSize(100, 100)
        self.color_display.setFrameStyle(QFrame.Shape.Box)
        self.color_display.setAlignment(Qt.AlignmentFlag.AlignCenter)
        frame_layout.addWidget(self.color_display)

        # Color info
        self.info_label = QLabel()
        self.info_label.setWordWrap(True)
        self.info_label.setMaximumWidth(150)
        frame_layout.addWidget(self.info_label)

        # Close button (only for clicked popups)
        self.close_button = QPushButton("✕")
        self.close_button.setFixedSize(20, 20)
        self.close_button.clicked.connect(self.close_popup)
        self.close_button.setStyleSheet("""
            QPushButton {
                background-color: red;
                color: white;
                border: none;
                border-radius: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: darkred;
            }
        """)
        self.close_button.hide()  # Hidden by default

        # Position close button in top-right corner
        self.close_button.setParent(self.frame)
        self.close_button.move(self.frame.width() - 30, 5)

        self.setFixedSize(170, 200)

    def set_color(self, rgb_tuple, color_info):
        """Set the color to display.

        Args:
            rgb_tuple: (r, g, b) color values
            color_info: Dictionary with color information
        """
        r, g, b = rgb_tuple

        # Set color display
        self.color_display.setStyleSheet(
            f"background-color: rgb({r}, {g}, {b}); border: 1px solid black;"
        )

        # Set info text
        info_text = f"<b>{color_info['name']}</b><br>"
        info_text += f"{color_info['rgb']}<br>"
        info_text += f"{color_info['hex']}<br>"
        info_text += f"{color_info['hsv']}"

        self.info_label.setText(info_text)

        # Adjust close button position after layout
        self.adjustSize()
        self.close_button.move(self.frame.width() - 25, 5)

    def show_as_hover(self):
        """Show as hover popup (no close button)."""
        self.close_button.hide()
        self.show()

    def close_popup(self):
        """Close the popup."""
        self.hide()
        self.closed.emit()
