import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

/**
 * Configuration
 */
const CONFIG = {
    // World units (meters usually). 
    // We assume the screen is roughly 0.5m wide in world space for the illusion.
    screenWorldWidth: 0.6,
    screenWorldHeight: 0.3375, // 16:9 aspect roughly
    cameraZ: 0.6, // Initial camera distance (viewing distance)
    parallaxScale: 1.5, // Multiplier for the effect intensity
};

const OBSERVER_CONTROL_PARAMS = {
    pitchSpeed: 0.002, // Radians per pixel
    yawSpeed: 0.002,
    moveSpeed: 0.001,  // Meters per pixel (pan)
    zoomSpeed: 0.002,   // Meters per tick
    fov: 50,
    near: 0.01,
    far: 1000
};

/**
 * State
 */
const state = {
    eyePosition: new THREE.Vector3(0, 0, CONFIG.cameraZ),
    headOrientation: new THREE.Quaternion(),
    videoElement: document.getElementById('webcam'),
    canvasContainer: document.getElementById('canvas-container'),
    faceLandmarker: null,
    lastVideoTime: -1,
    calibratedCenter: new THREE.Vector3(0, 0, 0), // Used to 'zero' the user's position
    calibratedCenter: new THREE.Vector3(0, 0, 0), // Used to 'zero' the user's position
    mixer: null, // Animation Mixer
    observerCamera: null,
    isObserverMode: false,
    observerAngles: { pitch: 0, yaw: 0 }, // Store angles for observer camera
    cameraHelper: null // Visualizes the frustration
};

const clock = new THREE.Clock();

/**
 * Three.js Setup
 */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });

function initThree() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.canvasContainer.appendChild(renderer.domElement);

    // Initial Camera Pos
    camera.position.z = CONFIG.cameraZ;

    // Observer Camera Setup
    state.observerCamera = new THREE.PerspectiveCamera(
        OBSERVER_CONTROL_PARAMS.fov,
        window.innerWidth / window.innerHeight,
        OBSERVER_CONTROL_PARAMS.near,
        OBSERVER_CONTROL_PARAMS.far
    );
    state.observerCamera.position.set(0, 0.5, 2); // Initial observer position
    state.observerCamera.lookAt(0, 0, 0);

    // Add main camera to scene so its children (eyes) are rendered
    scene.add(camera);

    // Camera Helper
    state.cameraHelper = new THREE.CameraHelper(camera);
    state.cameraHelper.visible = false; // Hidden by default
    scene.add(state.cameraHelper);

    // Load Eyes model and attach to main camera
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('./eyes.glb', (gltf) => {
        const eyes = gltf.scene;
        // Optionally scale or position eyes relative to camera if needed
        eyes.position.set(0, 0, 0);
        eyes.rotation.y = Math.PI; // Face forward
        camera.add(eyes); // Child of camera
    }, undefined, (e) => console.error("Error loading eyes.glb", e));

    // Lighting
    new RGBELoader()
        .load('brown_photostudio_02_1k.hdr', function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            scene.environmentIntensity = 1.0;
            // scene.background = texture; // Optional: show background
        });

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(0, 2, 2);
    scene.add(dirLight);

    // Handle Resize
    window.addEventListener('resize', onWindowResize, false);

    // Load Models
    loadEnvironment();
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (state.observerCamera) {
        state.observerCamera.aspect = window.innerWidth / window.innerHeight;
        state.observerCamera.updateProjectionMatrix();
    }
    updateProjectionMatrix();
}

/**
 * Load Models
 */
// Keep track of current model to remove it when switching
let currentModelGroup = null;

// Store initial scale for relative clamping
let currentInitialScale = 1.0;

function loadModel(filename) {
    const loader = new GLTFLoader();
    const path = './models/' + filename;

    loader.load(path, (gltf) => {
        // cleanup previous
        if (currentModelGroup) {
            scene.remove(currentModelGroup);
            // simple dispose?
            currentModelGroup = null;
        }

        const model = gltf.scene;
        currentModelGroup = model;

        // box to check size
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());

        // Auto scale to fit roughly in a 30cm box
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.1 / maxDim;
        model.scale.set(scale, scale, scale);

        // Save for zoom logic
        currentInitialScale = scale;

        model.position.set(0, 0, 0); // Center at Z=0
        scene.add(model);

        // Animation Support, reset mixer
        state.mixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
            state.mixer = new THREE.AnimationMixer(model);
            const action = state.mixer.clipAction(gltf.animations[0]);
            action.play();
            console.log("Playing animation: " + gltf.animations[0].name);
        }

        console.log("Model loaded: " + filename);
    }, undefined, (e) => console.error("Error loading " + filename, e));
}

async function loadEnvironment() {
    // Dynamic loading of model list
    try {
        const response = await fetch('./models/');
        const text = await response.text();
        // Parse the directory listing (Apache/Python style)
        // Look for href="something.glb"
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = doc.querySelectorAll('a');

        const models = [];
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.toLowerCase().endsWith('.glb')) {
                // Remove path prefixes if present (often just filename in simple listings)
                const name = href.split('/').pop();
                models.push(name);
            }
        });

        const select = document.getElementById('model-select');
        select.innerHTML = ''; // Clear hardcoded

        if (models.length === 0) {
            console.warn("No models found in /models/ listing");
            const opt = document.createElement('option');
            opt.innerText = "No .glb found";
            select.appendChild(opt);
        } else {
            // Sort models
            models.sort();

            models.forEach(modelName => {
                const opt = document.createElement('option');
                opt.value = modelName;
                opt.innerText = modelName;
                select.appendChild(opt);

                // If previously selected or default?
            });

            // Allow selection change
            select.addEventListener('change', (e) => {
                loadModel(e.target.value);
            });

            // Load first model
            loadModel(models[0]);
        }

    } catch (e) {
        console.error("Could not list models directory", e);
        // Fallback or error
    }
}


/**
 * MediaPipe Setup
 */
async function initMediaPipe() {
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

/**
 * Model Interaction
 */
let isDragging = false;
let isPanning = false;
let previousMousePosition = { x: 0, y: 0 };

state.canvasContainer.addEventListener('mousedown', (e) => {
    previousMousePosition = { x: e.clientX, y: e.clientY };
    if (e.button === 0) { // Left Button
        isDragging = true;
    } else if (e.button === 2) { // Right Button
        isPanning = true;
    }
});

state.canvasContainer.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mousemove', (e) => {
    // Use the globally tracked currentModelGroup
    const model = currentModelGroup;
    if (!model) return;

    const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
    };

    if (state.isObserverMode) {
        // --- Observer Controls ---
        const obsCam = state.observerCamera;

        if (isDragging) {
            // Yaw (rotate around Y world)
            state.observerAngles.yaw -= deltaMove.x * OBSERVER_CONTROL_PARAMS.yawSpeed;
            // Pitch (rotate around X local)
            state.observerAngles.pitch -= deltaMove.y * OBSERVER_CONTROL_PARAMS.pitchSpeed;

            // Clamp pitch to avoid flipping
            state.observerAngles.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, state.observerAngles.pitch));

            const q = new THREE.Quaternion();
            q.setFromEuler(new THREE.Euler(state.observerAngles.pitch, state.observerAngles.yaw, 0, 'YXZ'));
            obsCam.quaternion.copy(q);
            // We orbit around position or just rotate in place?
            // User asked "control position and rotation".
            // Standard FPS/Free fly or Orbit? 
            // "New camera to observe scene and camera position" + "adjustable position and rotation"
            // Let's implement free-look rotation from current position. Position handled by right click pan.
        }

        if (isPanning) {
            // Move camera in plane perpendicular to look direction
            const moveSpeed = OBSERVER_CONTROL_PARAMS.moveSpeed;
            obsCam.translateX(-deltaMove.x * moveSpeed);
            obsCam.translateY(deltaMove.y * moveSpeed);
        }

    } else {
        // --- Object Controls (Normal Mode) ---
        if (isDragging) {
            // Rotate:
            // X-Move -> Y-Rotate (Yaw)
            // Y-Move -> X-Rotate (Pitch) - Smaller amplitude requested

            const pitchSensitivity = 0.1; // Small amplitude for pitch
            const yawSensitivity = 0.5;

            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRad(deltaMove.y * pitchSensitivity),
                    toRad(deltaMove.x * yawSensitivity),
                    0,
                    'XYZ'
                ));

            const model = currentModelGroup;
            if (model) model.quaternion.multiplyQuaternions(deltaRotationQuaternion, model.quaternion);
        }

        if (isPanning) {
            const panSpeed = 0.001;
            const model = currentModelGroup;
            if (model) {
                model.position.x += deltaMove.x * panSpeed;
                model.position.y -= deltaMove.y * panSpeed;
            }
        }
    }

    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    isPanning = false;
});

window.addEventListener('wheel', (e) => {
    // Zoom
    if (state.isObserverMode) {
        // Observer Zoom -> Move forward/back
        const obsCam = state.observerCamera;
        const zoomSpeed = OBSERVER_CONTROL_PARAMS.zoomSpeed * 100; // Adjust scale for scroll
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(obsCam.quaternion);
        // deltaY > 0 is scroll down (zoom out/move back)
        const direction = e.deltaY > 0 ? -1 : 1;
        obsCam.position.addScaledVector(forward, direction * zoomSpeed);

    } else {
        // Normal Zoom (Scale Model)
        const model = currentModelGroup;
        if (!model) return;

        const zoomIntensity = 0.05;
        const factor = Math.exp(-Math.sign(e.deltaY) * zoomIntensity);

        let newScale = model.scale.x * factor;

        // Clamp relative to initial scale (e.g. 0.01x to 100x range)
        // User requested wide range.
        const minScale = currentInitialScale * 0.01;
        const maxScale = currentInitialScale * 100.0;

        newScale = Math.max(minScale, Math.min(newScale, maxScale));

        model.scale.set(newScale, newScale, newScale);
    }
}, { passive: false });


function toRad(deg) {
    return deg * (Math.PI / 180);
}


/**
 * MediaPipe Loop
 */
// Store raw target for calibration
let lastRawTarget = { x: 0, y: 0 };

async function predictWebcam() {
    let startTimeMs = performance.now();

    const invertX = document.getElementById('invert-x-check').checked;

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

            // Save for calibration
            lastRawTarget.x = targetX;
            lastRawTarget.y = targetY;

            // Apply Calib
            const finalX = targetX - state.calibratedCenter.x;
            const finalY = targetY - state.calibratedCenter.y;

            state.eyePosition.lerp(new THREE.Vector3(finalX, finalY, targetZ), 0.5);
        }
    }

    requestAnimationFrame(predictWebcam);
}


/**
 * Off-Axis Projection Logic
 */
function updateProjectionMatrix() {
    const width = CONFIG.screenWorldWidth;
    const height = CONFIG.screenWorldHeight; // 0.3375

    // Eye position relative to screen center
    const pe = state.eyePosition;

    const near = 0.1;
    const far = 100.0;

    const ratio = near / Math.abs(pe.z);

    const left = ratio * (-width / 2 - pe.x);
    const right = ratio * (width / 2 - pe.x);
    const top = ratio * (height / 2 - pe.y);
    const bottom = ratio * (-height / 2 - pe.y);

    camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
    camera.position.copy(pe);
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld();
}


/**
 * Main Loop
 */
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (state.mixer) {
        state.mixer.update(delta);
    }

    updateProjectionMatrix();
    if (state.cameraHelper) {
        state.cameraHelper.update();
    }

    if (state.isObserverMode) {
        renderer.render(scene, state.observerCamera);
    } else {
        renderer.render(scene, camera);
    }
}


// Start
initThree();
initMediaPipe();
animate();

// UI
document.getElementById('calibrate-btn').addEventListener('click', () => {
    // Set calibration so that current Raw Target becomes (0,0)
    // New Center = Current Raw Target
    state.calibratedCenter.x = lastRawTarget.x;
    state.calibratedCenter.y = lastRawTarget.y;
    console.log("Calibrated Center to:", state.calibratedCenter);
});

document.getElementById('observer-view-check').addEventListener('change', (e) => {
    state.isObserverMode = e.target.checked;
    if (state.cameraHelper) {
        state.cameraHelper.visible = state.isObserverMode;
    }
    console.log("Observer Mode:", state.isObserverMode);
});
