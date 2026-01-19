import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { state } from '../state.js';
import { CONFIG } from '../config.js';

export const scene = new THREE.Scene();
export const renderer = new THREE.WebGLRenderer({ antialias: true });

export function initScene() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.canvasContainer.appendChild(renderer.domElement);

    // Filter - nearest for pixel art vibe? No, just default
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
}

export function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Projection update is handled in main loop or camera module
}
