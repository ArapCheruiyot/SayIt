import React, { useRef, useState, useEffect } from 'react';
import { startCamera, checkCameraPermission, releaseCamera } from '../utils/camera';
import Tesseract from 'tesseract.js';
import '../styles/Camera.css';

function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [detectedWord, setDetectedWord] = useState('');
  const [boxSize, setBoxSize] = useState(70);
  const [isDetecting, setIsDetecting] = useState(false);

  const initCamera = async () => {
    setIsRetrying(true);
    setError(null);

    if (videoRef.current) {
      releaseCamera(videoRef.current);
    }

    const perm = await checkCameraPermission();

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

  // ===== DETECTION LOGIC =====
  const captureAndDetect = async () => {
    if (!videoRef.current || !isReady || isDetecting) return;

    setIsDetecting(true);
    setDetectedWord('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

      const boxWidthPx = videoWidth * (boxSize / 100);
      const boxHeightPx = videoHeight * (boxSize / 100 * 0.65);
      const x = (videoWidth - boxWidthPx) / 2;
      const y = (videoHeight - boxHeightPx) / 2;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = boxWidthPx;
      croppedCanvas.height = boxHeightPx;
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCtx.drawImage(canvas, x, y, boxWidthPx, boxHeightPx, 0, 0, boxWidthPx, boxHeightPx);

      const result = await Tesseract.recognize(croppedCanvas, 'eng');
      const text = result.data.text.trim();

      if (text) {
        setDetectedWord(text);
      } else {
        setDetectedWord('❌ No text detected');
      }
    } catch (error) {
      console.error('OCR error:', error);
      setDetectedWord('❌ Error reading text');
    } finally {
      setIsDetecting(false);
    }
  };

  // ===== EFFECTS =====
  useEffect(() => {
    const timer = setTimeout(() => {
      initCamera();
    }, 500);

    // Store ref in a variable for cleanup
    const videoElement = videoRef.current;

    return () => {
      clearTimeout(timer);
      if (videoElement) {
        releaseCamera(videoElement);
      }
      streamRef.current = null;
    };
  }, []); // Empty dependency array — runs once on mount

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
      <div className="camera-status-container">
        {isReady && !error && (
          <p className="ready-message">✅ Ready! Place a word in the box</p>
        )}
      </div>

      <div className="camera-wrapper">
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />

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

        <div
          className={`focus-box ${detectedWord && !detectedWord.includes('No') && !detectedWord.includes('Error') ? 'active' : ''}`}
          style={{ width: boxWidth, height: boxHeight }}
        >
          {!isReady && (
            <span className="focus-box-label">📖 Place word here</span>
          )}
          {isReady && detectedWord && !detectedWord.includes('No') && !detectedWord.includes('Error') && (
            <span className="focus-box-label">{detectedWord}</span>
          )}
        </div>

        {detectedWord && (
          <div className="word-preview">
            <span className="word-text">{detectedWord}</span>
          </div>
        )}
      </div>

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
        <div className="size-value">{boxSize}%</div>
      </div>

      <div className="say-it-container">
        <button
          className="say-it-button"
          onClick={captureAndDetect}
          disabled={!isReady || isDetecting}
        >
          {isDetecting ? '⏳ Thinking...' : '📸 SAY IT!'}
        </button>
      </div>
    </>
  );
}

export default Camera;