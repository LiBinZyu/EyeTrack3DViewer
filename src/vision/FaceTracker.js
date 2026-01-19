import * as THREE from 'three';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { state } from '../state.js';

export async function initMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    state.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
    });

    // Start Webcam
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        state.videoElement.srcObject = stream;
        state.videoElement.addEventListener("loadeddata", predictWebcam);
        document.getElementById('tracking-status').innerText = "Status: Tracking Active";
    } catch (e) {
        console.error("Webcam not enabled", e);
        document.getElementById('tracking-status').innerText = "Status: Webcam Error";
    }
}

async function predictWebcam() {
    let startTimeMs = performance.now();

    const invertXCheck = document.getElementById('invert-x-check');
    const invertX = invertXCheck ? invertXCheck.checked : false;

    if (state.lastVideoTime !== state.videoElement.currentTime && state.faceLandmarker) {
        state.lastVideoTime = state.videoElement.currentTime;
        const results = state.faceLandmarker.detectForVideo(state.videoElement, startTimeMs);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            const lEye = landmarks[468] || landmarks[33];
            const rEye = landmarks[473] || landmarks[263];

            const cx = (lEye.x + rEye.x) / 2;
            const cy = (lEye.y + rEye.y) / 2;

            const nx = (cx - 0.5) * 2;
            const ny = -(cy - 0.5) * 2;

            const dx = lEye.x - rEye.x;
            const dy = lEye.y - rEye.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const estimatedDepth = 0.065 / dist;

            const sensX = 2.0;
            const sensY = 1.5;

            let targetX = nx * sensX * estimatedDepth;
            if (!invertX) targetX = -targetX;

            const targetY = ny * sensY * estimatedDepth;
            const targetZ = Math.max(0.2, Math.min(estimatedDepth * 10, 2.0));

            // Save for calibration in state
            state.lastRawTarget.x = targetX;
            state.lastRawTarget.y = targetY;

            // Apply Calib
            const finalX = targetX - state.calibratedCenter.x;
            const finalY = targetY - state.calibratedCenter.y;

            state.eyePosition.lerp(new THREE.Vector3(finalX, finalY, targetZ), 0.5);
        }
    }

    requestAnimationFrame(predictWebcam);
}
