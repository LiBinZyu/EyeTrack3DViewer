import * as THREE from 'three';
import { state } from '../state.js';
import { OBSERVER_CONTROL_PARAMS } from '../config.js';
import { ModelManager } from './ModelManager.js';
import { toRad } from '../utils.js';

export class InputManager {
    constructor() {
        this.isDragging = false;
        this.isPanning = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.setupListeners();
    }

    setupListeners() {
        state.canvasContainer.addEventListener('mousedown', (e) => {
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
            if (e.button === 0) { // Left Button
                this.isDragging = true;
            } else if (e.button === 2) { // Right Button
                this.isPanning = true;
            }
        });

        state.canvasContainer.addEventListener('contextmenu', e => e.preventDefault());

        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isPanning = false;
        });
        window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

        // UI Controls
        const obsCheck = document.getElementById('observer-view-check');
        if (obsCheck) {
            obsCheck.addEventListener('change', (e) => {
                state.isObserverMode = e.target.checked;
                if (state.cameraHelper) {
                    state.cameraHelper.visible = state.isObserverMode;
                }
                console.log("Observer Mode:", state.isObserverMode);
            });
        }

        const calibBtn = document.getElementById('calibrate-btn');
        if (calibBtn) {
            calibBtn.addEventListener('click', () => {
                state.calibratedCenter.x = state.lastRawTarget.x;
                state.calibratedCenter.y = state.lastRawTarget.y;
                console.log("Calibrated Center to:", state.calibratedCenter);
            });
        }

        const invertCheck = document.getElementById('invert-x-check');
        // This is read directly in loop usually, or we can update state? 
        // Existing loop reads DOM directly. We can leave it or move to state. 
        // For faithful refactor, we leave it or better yet, read DOM in loop as before.
    }

    onMouseMove(e) {
        // Use the globally tracked currentModelGroup
        const model = ModelManager.currentModelGroup;
        // logic depends on mode

        const deltaMove = {
            x: e.clientX - this.previousMousePosition.x,
            y: e.clientY - this.previousMousePosition.y
        };

        if (state.isObserverMode) {
            // --- Observer Controls ---
            const obsCam = state.observerCamera;
            if (!obsCam) return;

            if (this.isDragging) {
                // Yaw (rotate around Y world)
                state.observerAngles.yaw -= deltaMove.x * OBSERVER_CONTROL_PARAMS.yawSpeed;
                // Pitch (rotate around X local)
                state.observerAngles.pitch -= deltaMove.y * OBSERVER_CONTROL_PARAMS.pitchSpeed;

                // Clamp pitch
                state.observerAngles.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, state.observerAngles.pitch));

                const q = new THREE.Quaternion();
                q.setFromEuler(new THREE.Euler(state.observerAngles.pitch, state.observerAngles.yaw, 0, 'YXZ'));
                obsCam.quaternion.copy(q);
            }

            if (this.isPanning) {
                const moveSpeed = OBSERVER_CONTROL_PARAMS.moveSpeed;
                obsCam.translateX(-deltaMove.x * moveSpeed);
                obsCam.translateY(deltaMove.y * moveSpeed);
            }

        } else {
            if (!model) return;
            // --- Object Controls (Normal Mode) ---
            if (this.isDragging) {
                const pitchSensitivity = 0.1;
                const yawSensitivity = 0.5;

                const deltaRotationQuaternion = new THREE.Quaternion()
                    .setFromEuler(new THREE.Euler(
                        toRad(deltaMove.y * pitchSensitivity),
                        toRad(deltaMove.x * yawSensitivity),
                        0,
                        'XYZ'
                    ));

                model.quaternion.multiplyQuaternions(deltaRotationQuaternion, model.quaternion);
            }

            if (this.isPanning) {
                const panSpeed = 0.001;
                model.position.x += deltaMove.x * panSpeed;
                model.position.y -= deltaMove.y * panSpeed;
            }
        }

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    onWheel(e) {
        if (state.isObserverMode) {
            // Observer Zoom
            const obsCam = state.observerCamera;
            if (!obsCam) return;

            const zoomSpeed = OBSERVER_CONTROL_PARAMS.zoomSpeed * 100;
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(obsCam.quaternion);
            const direction = e.deltaY > 0 ? -1 : 1;
            obsCam.position.addScaledVector(forward, direction * zoomSpeed);

        } else {
            // Normal Zoom
            const model = ModelManager.currentModelGroup;
            if (!model) return;

            const zoomIntensity = 0.05;
            const factor = Math.exp(-Math.sign(e.deltaY) * zoomIntensity);

            let newScale = model.scale.x * factor;

            const currentInitialScale = ModelManager.currentInitialScale;
            const minScale = currentInitialScale * 0.01;
            const maxScale = currentInitialScale * 100.0;

            newScale = Math.max(minScale, Math.min(newScale, maxScale));

            model.scale.set(newScale, newScale, newScale);
        }
    }
}
