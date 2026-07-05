 import React, { useRef, useState, useEffect } from 'react';
import { startCamera, stopCamera, checkCameraPermission, releaseCamera } from '../utils/camera';
import '../styles/Camera.css';

function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [detectedWord, setDetectedWord] = useState('');
  const [permissionState, setPermissionState] = useState('prompt');
  const [boxSize, setBoxSize] = useState(70);

  const initCamera = async () => {
    setIsRetrying(true);
    setError(null);

    if (videoRef.current) {
      releaseCamera(videoRef.current);
    }

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

  const handleRetry = async () => {
    if (videoRef.current) {
      releaseCamera(videoRef.current);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    initCamera();
  };

  const handleBoxResize = (e) => {
    const newSize = parseInt(e.target.value);
    setBoxSize(newSize);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initCamera();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (videoRef.current) {
        releaseCamera(videoRef.current);
      }
      streamRef.current = null;
    };
  }, []);

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

  const boxWidth = boxSize + '%';
  const boxHeight = (boxSize * 0.65) + '%';

  return (
    <>
      {/* ===== STATUS MESSAGE — OUTSIDE CAMERA ===== */}
      <div className="camera-status-container">
        {isReady && !error && (
          <p className="ready-message">✅ Ready! Place a word in the box</p>
        )}
      </div>

      {/* ===== CAMERA VIEW ===== */}
      <div className="camera-wrapper">
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />

        {/* ===== ERROR / LOADING OVERLAY (Inside Camera) ===== */}
        <div className="camera-status-overlay">
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
        </div>

        {/* ===== FOCUS BOX ===== */}
        <div
          className={`focus-box ${detectedWord ? 'active' : ''}`}
          style={{
            width: boxWidth,
            height: boxHeight,
          }}
        >
          {!isReady && (
            <span className="focus-box-label">
              📖 Place word here
            </span>
          )}

          {isReady && detectedWord && (
            <span className="focus-box-label">
              {detectedWord}
            </span>
          )}
        </div>

        {detectedWord && (
          <div className="word-preview">
            <span className="word-text">{detectedWord}</span>
          </div>
        )}
      </div>

      {/* ===== RESIZE CONTROLS ===== */}
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