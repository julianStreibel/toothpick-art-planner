"""Main entry point for toothpick art simulator."""

import sys

from PyQt6.QtWidgets import QApplication

from main_window import MainWindow


def main():
    """Run the toothpick art simulator application."""
    app = QApplication(sys.argv)

    # Set application style
    app.setStyle("Fusion")

    # Create and show main window
    window = MainWindow()
    window.show()

    # Run the application
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
