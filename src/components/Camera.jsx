import React, { useRef, useState, useEffect } from 'react';
import { startCamera, stopCamera } from '../utils/camera';
import '../styles/Camera.css';

function Camera() {
  // ===== REFS =====
  const videoRef = useRef(null);
  const streamRef = useRef(null); // Store stream for cleanup

  // ===== STATE =====
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [detectedWord, setDetectedWord] = useState(''); // Phase 4

  // ===== START CAMERA =====
  const initCamera = async () => {
    setIsRetrying(true);
    setError(null);
    
    const result = await startCamera(videoRef.current);
    
    if (result.success) {
      setIsReady(true);
      setError(null);
      streamRef.current = result.stream; // Save stream for cleanup
    } else {
      setError(result.error || 'Failed to start camera');
      setIsReady(false);
    }
    
    setIsRetrying(false);
  };

  // ===== RETRY CAMERA =====
  const handleRetry = () => {
    initCamera();
  };

  // ===== AUTO-START ON MOUNT =====
  useEffect(() => {
    initCamera();

    // Cleanup on unmount
    return () => {
      stopCamera(videoRef.current);
      streamRef.current = null;
    };
  }, []);

  // ===== HANDLE PAGE VISIBILITY (pause when tab hidden) =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause video when tab is hidden (saves battery)
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.pause();
        }
      } else {
        // Resume video when tab becomes visible
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="camera-wrapper">
      {/* ===== VIDEO FEED ===== */}
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        muted
      />

      {/* ===== STATUS OVERLAY ===== */}
      <div className="camera-status">
        {error && (
          <div className="error-container">
            <p className="error-message">❌ {error}</p>
            <button 
              className="retry-button"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? '⏳ Retrying...' : '🔄 Retry'}
            </button>
          </div>
        )}
        
        {!isReady && !error && !isRetrying && (
          <p className="loading-message">📷 Starting camera...</p>
        )}
        
        {isRetrying && !error && (
          <p className="loading-message">⏳ Please wait...</p>
        )}
        
        {isReady && (
          <p className="ready-message">✅ Camera ready</p>
        )}
      </div>

      {/* ===== FOCUS BOX (Phase 3 - Ready for detection) ===== */}
      <div className={`focus-box ${detectedWord ? 'active' : ''}`}>
        <span className="focus-box-label">
          {detectedWord || '📖 Place word here'}
        </span>
      </div>

      {/* ===== DETECTED WORD DISPLAY (Phase 4) ===== */}
      {detectedWord && (
        <div className="word-preview">
          <span className="word-text">{detectedWord}</span>
        </div>
      )}
    </div>
  );
}

export default Camera;