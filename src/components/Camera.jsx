import React, { useRef, useState, useEffect, useCallback } from 'react';
import { startCamera, checkCameraPermission, releaseCamera } from '../utils/camera';
import { detectWord, isValidDetection } from '../utils/detection';
import '../styles/Camera.css';

function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const initTimeoutRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [detectedWord, setDetectedWord] = useState('');
  const [boxSize, setBoxSize] = useState(70);
  const [isDetecting, setIsDetecting] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [cameraAttempts, setCameraAttempts] = useState(0);

  // ===== STOP AUTO DETECTION =====
  const stopAutoDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // ===== CAPTURE & DETECT (USING NEW DETECTION MODULE) =====
  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !isReady || isDetecting) return;

    setIsDetecting(true);
    setDetectedWord('');
    setConfidence(0);

    try {
      const video = videoRef.current;
      
      // Use the detection module
      const result = await detectWord(video, boxSize);

      if (result.word && isValidDetection(result)) {
        setDetectedWord(result.word);
        setConfidence(result.confidence);
      } else if (result.error) {
        setDetectedWord(result.error);
        setConfidence(0);
      } else {
        setDetectedWord('No word detected');
        setConfidence(0);
      }
    } catch (error) {
      console.error('Detection error:', error);
      setDetectedWord('Error reading');
      setConfidence(0);
    } finally {
      setIsDetecting(false);
    }
  }, [boxSize, isReady, isDetecting]);

  // ===== START AUTO DETECTION =====
  const startAutoDetection = useCallback(() => {
    stopAutoDetection();
    detectionIntervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 2000);
  }, [captureAndDetect, stopAutoDetection]);

  // ===== INIT CAMERA =====
  const initCamera = useCallback(async () => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    setIsRetrying(true);
    setError(null);

    if (videoRef.current) {
      releaseCamera(videoRef.current);
      videoRef.current.srcObject = null;
    }

    const perm = await checkCameraPermission();

    if (perm === 'denied') {
      setError('Camera access is blocked. Please enable it in your browser settings.');
      setIsRetrying(false);
      return;
    }

    try {
      const result = await Promise.race([
        startCamera(videoRef.current),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Camera timeout after 15 seconds')), 15000)
        )
      ]);

      if (result.success) {
        setIsReady(true);
        setError(null);
        streamRef.current = result.stream;
        setCameraAttempts(0);
        setTimeout(() => startAutoDetection(), 1000);
      } else {
        setError(result.error || 'Failed to start camera');
        setIsReady(false);
        setCameraAttempts(prev => prev + 1);
        
        if (cameraAttempts < 2) {
          console.log(`Auto-retry attempt ${cameraAttempts + 1}...`);
          setTimeout(() => initCamera(), 3000);
        }
      }
    } catch (error) {
      console.error('Camera init error:', error);
      setError('Camera timed out. Please refresh and try again.');
      setIsReady(false);
      setCameraAttempts(prev => prev + 1);
    }

    setIsRetrying(false);
  }, [startAutoDetection, cameraAttempts]);

  // ===== RETRY =====
  const handleRetry = useCallback(async () => {
    stopAutoDetection();
    if (videoRef.current) {
      releaseCamera(videoRef.current);
      videoRef.current.srcObject = null;
    }
    streamRef.current = null;
    setIsReady(false);
    setError(null);
    setCameraAttempts(0);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    initCamera();
  }, [initCamera, stopAutoDetection]);

  // ===== BOX RESIZE =====
  const handleBoxResize = useCallback((e) => {
    const newSize = parseInt(e.target.value);
    setBoxSize(newSize);
  }, []);

  // ===== HANDLE SAY IT =====
  const handleSayIt = useCallback(() => {
    captureAndDetect();
  }, [captureAndDetect]);

  // ===== TOGGLE AUTO DETECTION =====
  const toggleAutoDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      stopAutoDetection();
    } else {
      startAutoDetection();
    }
  }, [startAutoDetection, stopAutoDetection]);

  // ===== EFFECT: INITIALIZE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      initCamera();
    }, 500);

    const videoElement = videoRef.current;

    return () => {
      clearTimeout(timer);
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      stopAutoDetection();
      if (videoElement) {
        releaseCamera(videoElement);
        videoElement.srcObject = null;
      }
      streamRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== EFFECT: VISIBILITY CHANGE =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoDetection();
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.pause();
        }
      } else {
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.play().catch(() => {});
          if (isReady) {
            startAutoDetection();
          }
        } else if (!isReady && !error && !isRetrying) {
          initCamera();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startAutoDetection, stopAutoDetection, initCamera, isReady, error, isRetrying]);

  // ===== RENDER =====
  const boxWidth = boxSize + '%';
  const boxHeight = (boxSize * 0.65) + '%';

  const isWordDetected = detectedWord && 
    detectedWord !== 'No word detected' && 
    detectedWord !== 'Error reading';

  return (
    <>
      <div className="camera-status-container">
        {isReady && !error && (
          <p className="ready-message">✅ Ready! Place a word in the box</p>
        )}
        {cameraAttempts > 0 && !error && (
          <p className="loading-message">⏳ Attempt {cameraAttempts + 1} of 3...</p>
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

        <div className="camera-status-top">
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
          className={`focus-box ${isWordDetected ? 'active' : ''}`}
          style={{ width: boxWidth, height: boxHeight }}
        >
          <span className="focus-box-label">
            {isWordDetected ? detectedWord : '📖 Place word here'}
          </span>
        </div>
      </div>

      {isWordDetected && confidence > 0 && (
        <div className="confidence-display">
          <span className="confidence-text">
            Confidence: {confidence}%
          </span>
        </div>
      )}

      <div className="resize-controls">
        <div className="resize-label">
          <span className="resize-icon">📐</span>
          <span className="resize-text">Adjust focus box size</span>
        </div>
        <div className="slider-container">
          <div className="slider-track">
            <div className="slider-graduations">
              {[...Array(21)].map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <input
              type="range"
              min="30"
              max="90"
              value={boxSize}
              onChange={handleBoxResize}
              className="size-slider"
              aria-label="Adjust focus box size"
            />
          </div>
          <div className="slider-labels">
            <span>Small</span>
            <span>Large</span>
          </div>
          <div className="slider-value">
            <strong>{boxSize}%</strong>
          </div>
        </div>
      </div>

      <div className="say-it-container">
        <button
          className="say-it-button"
          onClick={handleSayIt}
          disabled={!isReady || isDetecting}
        >
          {isDetecting ? '⏳ Thinking...' : '🔊 SAY IT!'}
        </button>
      </div>

      <div className="mode-toggle">
        <button 
          className={`mode-button ${detectionIntervalRef.current ? 'active' : ''}`}
          onClick={toggleAutoDetection}
        >
          {detectionIntervalRef.current ? '⏸️ Auto-Detect ON' : '▶️ Auto-Detect OFF'}
        </button>
      </div>
    </>
  );
}

export default Camera;