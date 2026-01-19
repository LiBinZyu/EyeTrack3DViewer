import { initScene, scene, renderer, onWindowResize } from './managers/SceneManager.js';
import { initCamera, camera, updateProjectionMatrix } from './managers/CameraManager.js';
import { ModelManager } from './managers/ModelManager.js';
import { InputManager } from './managers/InputManager.js';
import { initMediaPipe } from './vision/FaceTracker.js';
import { state, clock } from './state.js';

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (state.mixer) {
        state.mixer.update(delta);
    }

    updateProjectionMatrix();

    if (state.isObserverMode && state.observerCamera) {
        renderer.render(scene, state.observerCamera);
    } else {
        renderer.render(scene, camera);
    }
}

function init() {
    initScene();
    initCamera();
    ModelManager.loadEnvironment();
    new InputManager(); // Initialize listeners
    initMediaPipe();
    animate();
}

// Start app
init();
