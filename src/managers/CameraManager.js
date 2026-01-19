import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { state } from '../state.js';
import { CONFIG, OBSERVER_CONTROL_PARAMS } from '../config.js';
import { scene, renderer } from './SceneManager.js';

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

export function initCamera() {
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
}

export function updateProjectionMatrix() {
    // Only verify aspects here? 
    // Actual resize logic usually calls renderer.setSize and then we update aspect here.
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    if (state.observerCamera) {
        state.observerCamera.aspect = window.innerWidth / window.innerHeight;
        state.observerCamera.updateProjectionMatrix();
    }

    // Off-Axis Projection Logic
    const width = CONFIG.screenWorldWidth;
    const aspect = window.innerWidth / window.innerHeight;
    const height = width / aspect; // Calculate height based on aspect ratio to keep square pixels

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

    if (state.cameraHelper) {
        state.cameraHelper.update();
    }
}
