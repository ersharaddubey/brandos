/**
 * FILE: electron/audio/vad.js
 * PURPOSE: Voice Activity Detection - Filter silence from system audio
 */

class VoiceActivityDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.01;
    this.silenceDuration = options.silenceDuration || 2000; // 2 seconds
    this.speechDuration = options.speechDuration || 500; // 0.5 seconds
    this.sampleRate = options.sampleRate || 16000;
    this.chunkSize = options.chunkSize || 3200;

    this.isSpeaking = false;
    this.silenceFrames = 0;
    this.speechFrames = 0;
    this.audioLevel = 0;
    this.history = [];
    this.maxHistory = 50;

    this.onSpeechStart = options.onSpeechStart || (() => {});
    this.onSpeechEnd = options.onSpeechEnd || (() => {});
    this.onLevelChange = options.onLevelChange || (() => {});
  }

  // Calculate RMS of audio data
  calculateRMS(data) {
    let sum = 0;
    const samples = new Int16Array(data);
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / samples.length);
  }

  // Process audio chunk
  processChunk(audioData) {
    const level = this.calculateRMS(audioData);
    this.audioLevel = level;

    // Update history
    this.history.push(level);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // VAD Logic
    if (level > this.threshold) {
      // Speech detected
      this.silenceFrames = 0;
      this.speechFrames++;

      if (!this.isSpeaking && this.speechFrames > 5) {
        // Consistent speech for 0.5 seconds
        this.isSpeaking = true;
        this.onSpeechStart();
      }
    } else {
      // Silence detected
      this.speechFrames = 0;
      this.silenceFrames++;

      if (this.isSpeaking && this.silenceFrames > 20) {
        // Silence for 2 seconds
        this.isSpeaking = false;
        this.onSpeechEnd();
      }
    }

    this.onLevelChange(level);

    return {
      isSpeaking: this.isSpeaking,
      level: level,
      threshold: this.threshold,
    };
  }

  // Get average audio level
  getAverageLevel() {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((a, b) => a + b, 0);
    return sum / this.history.length;
  }

  // Reset detector
  reset() {
    this.isSpeaking = false;
    this.silenceFrames = 0;
    this.speechFrames = 0;
    this.audioLevel = 0;
    this.history = [];
  }

  // Configure threshold
  setThreshold(threshold) {
    this.threshold = threshold;
  }

  // Get status
  getStatus() {
    return {
      isSpeaking: this.isSpeaking,
      currentLevel: this.audioLevel,
      averageLevel: this.getAverageLevel(),
      threshold: this.threshold,
      historySize: this.history.length,
    };
  }
}

module.exports = { VoiceActivityDetector };