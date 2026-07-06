/**
 * detection.js - All word detection logic
 * Separated from Camera component for cleaner code
 */

import Tesseract from 'tesseract.js';

/**
 * Capture a frame from video and crop to focus box
 */
export const captureFrame = (video, boxSize) => {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error('Video not ready');
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Create canvas with video dimensions
  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, vw, vh);

  // Calculate focus box
  const boxW = vw * (boxSize / 100);
  const boxH = vh * (boxSize / 100 * 0.65);
  const x = (vw - boxW) / 2;
  const y = (vh - boxH) / 2;

  // Crop to focus box
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = Math.floor(boxW);
  croppedCanvas.height = Math.floor(boxH);
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(canvas, x, y, boxW, boxH, 0, 0, boxW, boxH);

  return croppedCanvas;
};

/**
 * Pre-process image for better OCR results
 * - Grayscale conversion
 * - Contrast enhancement
 * - Threshold (black & white)
 */
export const preprocessImage = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale + enhance contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = 1.3;
    const enhanced = Math.min(255, Math.max(0, ((gray / 255 - 0.5) * contrast + 0.5) * 255));
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  // Apply threshold (black & white)
  const threshold = 120;
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    if (value > threshold) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Run OCR on the image
 */
export const runOCR = async (canvas) => {
  try {
    const result = await Tesseract.recognize(
      canvas,
      'eng',
      {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      }
    );

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence || 0,
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw error;
  }
};

/**
 * Clean and extract the first word from OCR result
 */
export const cleanDetectedWord = (text, confidence) => {
  if (!text || text.length === 0) {
    return { word: null, confidence: 0 };
  }

  // Remove special characters
  let cleaned = text.replace(/[^a-zA-Z0-9 ]/g, '').trim();

  if (cleaned.length === 0) {
    return { word: null, confidence: 0 };
  }

  // Take first word only
  const words = cleaned.split(' ');
  const firstWord = words[0].slice(0, 15); // Max 15 characters

  return {
    word: firstWord,
    confidence: Math.round(confidence),
  };
};

/**
 * Complete detection pipeline
 * Returns: { word, confidence, error }
 */
export const detectWord = async (video, boxSize) => {
  try {
    // 1. Capture frame
    const croppedCanvas = captureFrame(video, boxSize);

    // 2. Pre-process image
    preprocessImage(croppedCanvas);

    // 3. Run OCR
    const { text, confidence } = await runOCR(croppedCanvas);

    // 4. Clean result
    const result = cleanDetectedWord(text, confidence);

    if (result.word) {
      return {
        word: result.word,
        confidence: result.confidence,
        error: null,
      };
    } else {
      return {
        word: null,
        confidence: 0,
        error: 'No word detected',
      };
    }
  } catch (error) {
    console.error('Detection error:', error);
    return {
      word: null,
      confidence: 0,
      error: error.message || 'Detection failed',
    };
  }
};

/**
 * Check if detection result is valid
 */
export const isValidDetection = (result) => {
  return result.word !== null && result.word.length > 0 && result.error === null;
};