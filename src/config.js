export const CONFIG = {
    // World units (meters usually). 
    // We assume the screen is roughly 0.5m wide in world space for the illusion.
    screenWorldWidth: 0.6,
    screenWorldHeight: 0.3375, // 16:9 aspect roughly
    cameraZ: 0.6, // Initial camera distance (viewing distance)
    parallaxScale: 1.5, // Multiplier for the effect intensity
};

export const OBSERVER_CONTROL_PARAMS = {
    pitchSpeed: 0.002, // Radians per pixel
    yawSpeed: 0.002,
    moveSpeed: 0.001,  // Meters per pixel (pan)
    zoomSpeed: 0.002,   // Meters per tick
    fov: 50,
    near: 0.01,
    far: 1000
};
