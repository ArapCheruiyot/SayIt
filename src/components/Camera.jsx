import React, { useRef, useState, useEffect } from 'react';
import { startCamera, stopCamera, checkCameraPermission } from '../utils/camera';
import '../styles/Camera.css';

function Camera() {
  // ===== REFS =====
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ===== STATE =====
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [detectedWord, setDetectedWord] = useState('');
  const [permissionState, setPermissionState] = useState('prompt');
  
  // ===== FOCUS BOX SIZE STATE =====
  const [boxSize, setBoxSize] = useState(70);

  // ===== START CAMERA =====
  const initCamera = async () => {
    setIsRetrying(true);
    setError(null);
    
    // Check permission first
    const perm = await checkCameraPermission();
    setPermissionState(perm);
    
    if (perm === 'denied') {
      setError('Camera access is blocked. Please enable it in your browser settings.');
      setIsRetrying(false);
      return;
    }
    
    const result = await startCamera(videoRef.current);
    
    if (result.success) {
      setIsReady(true);
      setError(null);
      streamRef.current = result.stream;
    } else {
      setError(result.error || 'Failed to start camera');
      setIsReady(false);
    }
    
    setIsRetrying(false);
  };

  // ===== RETRY CAMERA =====
  const handleRetry = () => {
    // Reset video element
    if (videoRef.current) {
      stopCamera(videoRef.current);
      videoRef.current.srcObject = null;
    }
    initCamera();
  };

  // ===== HANDLE BOX SIZE CHANGE =====
  const handleBoxResize = (e) => {
    const newSize = parseInt(e.target.value);
    setBoxSize(newSize);
  };

  // ===== AUTO-START ON MOUNT =====
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initCamera();
    }, 500);

    return () => {
      clearTimeout(timer);
      stopCamera(videoRef.current);
      streamRef.current = null;
    };
  }, []);

  // ===== HANDLE PAGE VISIBILITY =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.pause();
        }
      } else {
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

  // ===== CALCULATE BOX SIZE =====
  const boxWidth = boxSize + '%';
  const boxHeight = (boxSize * 0.65) + '%';

  return (
    <>
      {/* ===== CAMERA VIEW ===== */}
      <div className="camera-wrapper">
        {/* Video Feed */}
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />

        {/* Status Overlay */}
        <div className="camera-status">
          {error && (
            <div className="error-container">
              <p className="error-message">❌ {error}</p>
              <button 
                className="retry-button"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? '⏳ Retrying...' : '🔄 Try Again'}
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
            <p className="ready-message">✅ Ready! Place a word in the box</p>
          )}
        </div>

        {/* Focus Box (Resizable) */}
        <div 
          className={`focus-box ${detectedWord ? 'active' : ''}`}
          style={{
            width: boxWidth,
            height: boxHeight,
          }}
        >
          <span className="focus-box-label">
            {detectedWord || '📖 Place word here'}
          </span>
        </div>

        {/* Detected Word Display */}
        {detectedWord && (
          <div className="word-preview">
            <span className="word-text">{detectedWord}</span>
          </div>
        )}
      </div>

      {/* ===== RESIZE CONTROLS (Below Camera) ===== */}
      <div className="resize-controls">
        <div className="resize-label">
          <span className="resize-icon">📐</span>
          <span className="resize-text">Adjust focus box size</span>
        </div>
        <div className="slider-container">
          <span className="size-indicator small">Small</span>
          <input
            type="range"
            min="30"
            max="90"
            value={boxSize}
            onChange={handleBoxResize}
            className="size-slider"
            aria-label="Adjust focus box size"
          />
          <span className="size-indicator large">Large</span>
        </div>
        <div className="size-value">
          {boxSize}%
        </div>
      </div>
    </>
  );
}

export default Camera;