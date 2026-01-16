# EyeTrack3DViewer

A naked-eye 3D parallax effect demo using **MediaPipe Face Landmarker** and **Three.js**.

## Features
- **Real-time Head Tracking**: Uses webcam to track user's head position.
- **Off-Axis Projection**: Adjusts the 3D camera projection matrix to create a window-like 3D effect.
- **Dynamic Model Loading**: Dropdown to switch between GLB models in the `models/` directory.
- **Interactive Control**:
    - **Left Drag**: Rotate Model (Yaw).
    - **Vertical Drag**: Rotate Model (Pitch).
    - **Right Drag**: Pan Model.
    - **Scroll**: Zoom (0.1x - 100x).
- **Calibration**: "Reset Center" button to zero-out the resting head position.

## Usage
1. Open `index.html` in a web server (e.g., `python -m http.server`).
2. Allow webcam access.
3. The 3D view will adjust to your perspective.

## Tech Stack
- HTML5 / CSS3
- JavaScript (ES6+)
- Three.js (r164)
- MediaPipe Tasks Vision
