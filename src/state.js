import * as THREE from 'three';
import { CONFIG } from './config.js';

export const state = {
    eyePosition: new THREE.Vector3(0, 0, CONFIG.cameraZ),
    headOrientation: new THREE.Quaternion(),
    videoElement: document.getElementById('webcam'),
    canvasContainer: document.getElementById('canvas-container'),
    faceLandmarker: null,
    lastVideoTime: -1,
    calibratedCenter: new THREE.Vector3(0, 0, 0), // Used to 'zero' the user's position
    mixer: null, // Animation Mixer
    observerCamera: null,
    isObserverMode: false,
    observerAngles: { pitch: 0, yaw: 0 }, // Store angles for observer camera
    cameraHelper: null, // Visualizes the frustum

    // Shared data
    lastRawTarget: { x: 0, y: 0 }
};

export const clock = new THREE.Clock();
