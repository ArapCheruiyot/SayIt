/**
 * Camera Utilities
 * All camera logic in one place
 */

// ===== RELEASE CAMERA =====
export const releaseCamera = (videoElement) => {
  if (videoElement) {
    if (videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach(track => {
        track.stop();
        track.enabled = false;
      });
      videoElement.srcObject = null;
    }
    // Reset the video element
    videoElement.removeAttribute('src');
    videoElement.load();
  }
  return true;
};

// ===== START CAMERA =====
export const startCamera = async (videoElement) => {
  try {
    // First, release any existing camera
    releaseCamera(videoElement);

    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        error: 'Camera not supported on this device or browser'
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    if (videoElement) {
      videoElement.srcObject = stream;
      // Wait for the video to be ready
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          resolve();
        };
      });
      await videoElement.play();
      return { success: true, stream };
    }
    return { success: false, error: 'Video element not found' };
  } catch (error) {
    console.error('Camera error:', error);

    // Friendly error messages
    let errorMessage = 'Camera access denied';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Please allow camera access in your browser settings';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera found on this device';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not meet requirements';
    }

    return { success: false, error: errorMessage };
  }
};

// ===== STOP CAMERA =====
export const stopCamera = (videoElement) => {
  return releaseCamera(videoElement);
};

// ===== CHECK CAMERA PERMISSION =====
export const checkCameraPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'camera' });
    return result.state; // 'granted', 'denied', 'prompt'
  } catch {
    return 'unknown';
  }
};