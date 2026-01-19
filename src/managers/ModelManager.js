import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from './SceneManager.js';
import { state } from '../state.js';

export const ModelManager = {
    currentModelGroup: null,
    currentInitialScale: 1.0,

    loadModel(filename) {
        const loader = new GLTFLoader();
        const path = './models/' + filename;

        loader.load(path, (gltf) => {
            // cleanup previous
            if (this.currentModelGroup) {
                scene.remove(this.currentModelGroup);
                this.currentModelGroup = null;
            }

            const model = gltf.scene;
            this.currentModelGroup = model;

            // box to check size
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());

            // Auto scale to fit roughly in a 30cm box
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 0.1 / maxDim;
            model.scale.set(scale, scale, scale);

            // Save for zoom logic
            this.currentInitialScale = scale;

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
    },

    async loadEnvironment() {
        // Dynamic loading of model list
        try {
            const response = await fetch('./models/');
            const text = await response.text();
            // Parse the directory listing
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = doc.querySelectorAll('a');

            const models = [];
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.toLowerCase().endsWith('.glb')) {
                    const name = href.split('/').pop();
                    models.push(name);
                }
            });

            const select = document.getElementById('model-select');
            select.innerHTML = '';

            if (models.length === 0) {
                console.warn("No models found in /models/ listing");
                const opt = document.createElement('option');
                opt.innerText = "No .glb found";
                select.appendChild(opt);
            } else {
                models.sort();

                models.forEach(modelName => {
                    const opt = document.createElement('option');
                    opt.value = modelName;
                    opt.innerText = modelName;
                    select.appendChild(opt);
                });

                select.addEventListener('change', (e) => {
                    this.loadModel(e.target.value);
                });

                // Load first model
                this.loadModel(models[0]);
            }

        } catch (e) {
            console.error("Could not list models directory", e);
        }
    }
};
