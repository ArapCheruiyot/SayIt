/**
 * Camera Utilities
 * All camera logic in one place
 */

// Start the camera with timeout handling
export const startCamera = async (videoElement) => {
  try {
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { 
        success: false, 
        error: 'Camera not supported on this device or browser' 
      };
    }

    // Stop any existing stream first
    if (videoElement && videoElement.srcObject) {
      const oldTracks = videoElement.srcObject.getTracks();
      oldTracks.forEach(track => track.stop());
      videoElement.srcObject = null;
    }

    // Try with different constraints (more compatible)
    let stream = null;
    let error = null;

    // Try 1: Standard environment camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
      });
    } catch (err) {
      error = err;
      // Try 2: Basic camera (no fancy settings)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      } catch (err2) {
        error = err2;
        // Try 3: Front camera as fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          });
        } catch (err3) {
          error = err3;
          throw error;
        }
      }
    }

    if (videoElement && stream) {
      videoElement.srcObject = stream;
      
      // Wait for video to actually start playing
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video playback timeout'));
        }, 10000); // 10 second timeout

        videoElement.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        videoElement.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video playback error'));
        };

        videoElement.play().catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      return { success: true, stream };
    }

    return { success: false, error: 'Video element not found' };
  } catch (error) {
    console.error('Camera error:', error);
    
    // Friendly error messages
    let errorMessage = 'Camera access denied';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Please allow camera access in your browser settings. Refresh after allowing.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera found on this device.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not meet requirements. Try a different camera.';
    } else if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      errorMessage = 'Camera took too long to start. Please try again. Make sure no other app is using the camera.';
    } else {
      errorMessage = `Camera error: ${error.message || 'Unknown error'}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Stop the camera
export const stopCamera = (videoElement) => {
  try {
    if (videoElement && videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      videoElement.srcObject = null;
      return true;
    }
  } catch (error) {
    console.warn('Error stopping camera:', error);
  }
  return false;
};

// Release camera (alias for stopCamera)
export const releaseCamera = (videoElement) => {
  return stopCamera(videoElement);
};

// Check camera permission
export const checkCameraPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'camera' });
    return result.state; // 'granted', 'denied', 'prompt'
  } catch {
    // Some browsers don't support permissions API
    return 'unknown';
  }
};

// Check if camera is available
export const isCameraAvailable = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
};