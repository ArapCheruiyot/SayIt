/**
 * Camera Utilities
 * All camera logic in one place
 */

// Start the camera
export const startCamera = async (videoElement) => {
  try {
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
      // Stop any existing stream first
      if (videoElement.srcObject) {
        const oldTracks = videoElement.srcObject.getTracks();
        oldTracks.forEach(track => track.stop());
      }
      
      videoElement.srcObject = stream;
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
      errorMessage = 'Camera is in use by another application';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not meet requirements';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Stop the camera
export const stopCamera = (videoElement) => {
  if (videoElement && videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach((track) => {
      track.stop();
      track.enabled = false;
    });
    videoElement.srcObject = null;
    return true;
  }
  return false;
};

// Check if camera is available
export const checkCameraPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'camera' });
    return result.state; // 'granted', 'denied', 'prompt'
  } catch {
    return 'unknown';
  }
};