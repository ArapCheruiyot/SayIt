/**
 * Camera Utilities
 * All camera logic in one place
 */

// Start the camera
export const startCamera = async (videoElement) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    if (videoElement) {
      videoElement.srcObject = stream;
      await videoElement.play();
      return { success: true, stream };
    }
    return { success: false, error: 'Video element not found' };
  } catch (error) {
    console.error('Camera error:', error);
    return { success: false, error: 'Camera access denied' };
  }
};

// Stop the camera
export const stopCamera = (videoElement) => {
  if (videoElement && videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    videoElement.srcObject = null;
    return true;
  }
  return false;
};