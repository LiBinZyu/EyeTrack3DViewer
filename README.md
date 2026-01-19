# Eye Track 3D Viewer

[English](#english) | [中文](#chinese)

<div align="center">
  <img src="img/moviescene.gif" width="45%" />
  <img src="img/woman.gif" width="45%" />
  <img src="img/sysyphus.gif" width="45%" />
  <img src="img/humanheart.gif" width="45%" />
</div>

---

<a id="english"></a>

### Introduction
**EyeTrack3DViewer** is a web-based "Naked Eye 3D" demo that creates a realistic parallax effect using **MediaPipe Face Landmarker** and **Three.js**.

By tracking the user's head position in real-time via the webcam, the application adjusts the 3D camera's projection matrix (Off-Axis Projection) to mimic a physical window into a 3D world.

### Features
-   **Real-time Head Tracking**: Uses MediaPipe to track face landmarks with low latency.
-   **Off-Axis Projection**: Creates a correct perspective illusion based on the viewer's position relative to the screen.
-   **Observer Mode**: A debug mode that visualizes the scene from a third-person perspective, showing the tracked head position and the camera's view frustum.
-   **Dynamic Model Loading**: Automatically lists and loads GLB models from the `models/` directory.
-   **Interactive Control**:
    -   **Left Drag**: Rotate objects.
    -   **Right Drag**: Pan objects.
    -   **Scroll**: Zoom.

### Usage
1.  **Start a Web Server**:
    Since this project uses ES modules and loads local files, it must be served via a web server.
    ```bash
    python -m http.server 8000
    ```
2.  **Open in Browser**:
    Navigate to `http://localhost:8000`.
3.  **Grant Permissions**:
    Allow browser access to the webcam.
4.  **Experience**:
    Close one eye for the best effect, or move your head around to see the parallax.

---

<a id="chinese"></a>

### 简介
**EyeTrack3DViewer** 是一个基于 Web 的“裸眼 3D”演示项目，利用 **MediaPipe Face Landmarker** 和 **Three.js** 实现逼真的视差效果。

通过实时追踪用户的头部位置，程序会动态调整 3D 相机的透视投影矩阵（Off-Axis Projection），从而在 2D 屏幕上模拟出“透过窗户观察 3D 世界”的真实感。

### 功能特性
-   **实时头部追踪**: 使用 MediaPipe 进行低延迟的面部关键点检测。
-   **离轴投影 (Off-Axis Projection)**: 根据观察者相对于屏幕的位置，生成正确的透视关系。
-   **观察者模式 (Observer Mode)**: 一个调试模式，可以以第三人称视角观察场景，可视化被追踪的头部位置以及相机的视锥体变化。
-   **动态模型加载**: 自动读取 `models/` 目录下的 GLB 模型并提供切换列表。
-   **交互控制**:
    -   **左键拖拽**: 旋转模型。
    -   **右键拖拽**: 平移模型。
    -   **滚轮**: 缩放。

### 使用方法
1.  **启动 Web 服务器**:
    由于项目使用了 ES Modules 并且需要加载本地文件，必须通过 Web 服务器运行。
    ```bash
    python -m http.server 8000
    ```
2.  **浏览器打开**:
    访问 `http://localhost:8000`。
3.  **授予权限**:
    允许浏览器访问摄像头。
4.  **体验**:
    建议闭上一只眼睛体验最佳效果，或者移动头部观察视差变化。
