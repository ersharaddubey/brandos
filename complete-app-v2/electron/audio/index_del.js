/**
 * FILE: electron/audio/index.js
 * PURPOSE: Unified audio capture interface - PRODUCTION GRADE
 */

const os = require('os');
const { createWindowsAudioCapture } = require('./windows.capture');
const { createMacAudioCapture } = require('./mac.capture');
const { detectSystemAudioDevices } = require('./device-detector');
const { VoiceActivityDetector } = require('./vad');

class AudioCaptureManager {
  constructor(options = {}) {
    this.platform = os.platform();
    this.capture = null;
    this.vad = null;
    this.isRunning = false;
    this.onData = options.onData || (() => {});
    this.onError = options.onError || (() => {});
    this.onVAD = options.onVAD || (() => {});
    this.onLevel = options.onLevel || (() => {});
    this.audioBuffer = [];
    this.bufferSize = 0;
    this.maxBufferSize = 3200 * 50; // 5 seconds max buffer
  }

  // async start(sourceId = null) {
  //   try {
  //     console.log('🎤 Starting audio capture...');

  //     // Detect devices
  //     const devices = await detectSystemAudioDevices();
  //     console.log('📡 Devices:', devices);

  //     // Create VAD first
  //     this.vad = new VoiceActivityDetector({
  //       onSpeechStart: () => {
  //         console.log('🗣️ Speech started');
  //         this.onVAD({ speaking: true });
  //       },
  //       onSpeechEnd: () => {
  //         console.log('🔇 Speech ended');
  //         this.onVAD({ speaking: false });
  //       },
  //       onLevelChange: (level) => {
  //         this.onLevel(level);
  //       },
  //     });

  //     // Create platform-specific capture
  //     const captureOptions = {
  //       onData: (data) => {
  //         // Process through VAD
  //         const vadResult = this.vad.processChunk(data);
          
  //         // Only forward audio if speaking
  //         if (vadResult.isSpeaking) {
  //           this.onData(data);
  //           this.onLevel(vadResult.level);
  //         }
  //       },
  //       onError: (err) => {
  //         console.error('❌ Audio capture error:', err);
  //         this.onError(err);
  //       },
  //       onVAD: (status) => {
  //         this.onVAD(status);
  //       },
  //       onLevel: (level) => {
  //         this.onLevel(level);
  //       },
  //     };

  //     if (this.platform === 'win32') {
  //       this.capture = createWindowsAudioCapture(captureOptions);
  //     } else if (this.platform === 'darwin') {
  //       this.capture = await createMacAudioCapture(captureOptions);
  //     } else {
  //       throw new Error(`Unsupported platform: ${this.platform}`);
  //     }

  //     // Start capture
  //     const result = await this.capture.start(sourceId);
  //     this.isRunning = true;

  //     console.log('✅ Audio capture started successfully');
  //     return result;

  //   } catch (err) {
  //     console.error('❌ Audio capture failed:', err);
  //     this.onError(err);
  //     throw err;
  //   }
  // }
  async start(sourceId = null) {
    try {
      console.log('🎤 [AUDIO-MANAGER] Starting audio capture...');

      // If already running, stop first
      if (this.isRunning) {
        console.log('⏹ [AUDIO-MANAGER] Already running, stopping first...');
        await this.stop();
      }

      // Detect devices
      console.log('📡 [AUDIO-MANAGER] Detecting devices...');
      const devices = await detectSystemAudioDevices();
      console.log('📡 [AUDIO-MANAGER] Devices:', devices);

      // Create VAD
      console.log('🔧 [AUDIO-MANAGER] Creating VAD...');
      this.vad = new VoiceActivityDetector({
        onSpeechStart: () => {
          console.log('🗣️ [VAD] Speech started');
          this.onVAD({ speaking: true });
        },
        onSpeechEnd: () => {
          console.log('🔇 [VAD] Speech ended');
          this.onVAD({ speaking: false });
        },
        onLevelChange: (level) => {
          this.onLevel(level);
        },
      });

      // Create platform-specific capture
      console.log('🔧 [AUDIO-MANAGER] Creating capture for platform:', this.platform);
      const captureOptions = {
        onData: (data) => {
          if (this.vad) {
            const vadResult = this.vad.processChunk(data);
            if (vadResult.isSpeaking) {
              this.onData(data);
              this.onLevel(vadResult.level);
            }
          } else {
            this.onData(data);
          }
        },
        onError: (err) => {
          console.error('❌ [AUDIO-MANAGER] Audio capture error:', err);
          this.onError(err);
          this.isRunning = false;
        },
        onVAD: (status) => {
          this.onVAD(status);
        },
        onLevel: (level) => {
          this.onLevel(level);
        },
      };

      if (this.platform === 'win32') {
        console.log('🪟 [AUDIO-MANAGER] Using Windows audio capture');
        this.capture = createWindowsAudioCapture(captureOptions);
      } else if (this.platform === 'darwin') {
        console.log('🍎 [AUDIO-MANAGER] Using Mac audio capture');
        this.capture = await createMacAudioCapture(captureOptions);
      } else {
        throw new Error(`Unsupported platform: ${this.platform}`);
      }

      // Start capture with a timeout to ensure it doesn't get stuck
      console.log('▶️ [AUDIO-MANAGER] Starting capture...');
      
      // IMPORTANT: Add a small delay before starting to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await this.capture.start(sourceId);
      this.isRunning = true;
      
      console.log('✅ [AUDIO-MANAGER] Capture started successfully');
      console.log('✅ [AUDIO-MANAGER] Result:', result);

      return result;

    } catch (err) {
      console.error('❌❌❌ [AUDIO-MANAGER] Audio capture failed:', err.message);
      console.error('❌ [AUDIO-MANAGER] Stack:', err.stack);
      this.isRunning = false;
      this.onError(err);
      throw err;
    }
  }

  async stop() {
    console.log('⏹ Stopping audio capture...');
    this.isRunning = false;

    if (this.capture) {
      await this.capture.stop();
      this.capture = null;
    }

    if (this.vad) {
      this.vad.reset();
      this.vad = null;
    }

    this.audioBuffer = [];
    this.bufferSize = 0;

    console.log('✅ Audio capture stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      platform: this.platform,
      vad: this.vad ? this.vad.getStatus() : null,
      bufferSize: this.bufferSize,
      capture: this.capture ? this.capture.getStatus() : null,
    };
  }

  getAudioLevel() {
    if (!this.vad) return 0;
    return this.vad.getAverageLevel();
  }

  isSpeaking() {
    if (!this.vad) return false;
    return this.vad.isSpeaking;
  }
}

async function createAudioCapture(options) {
  const manager = new AudioCaptureManager(options);
  return manager;
}

module.exports = {
  createAudioCapture,
  AudioCaptureManager,
  detectSystemAudioDevices,
  VoiceActivityDetector,
};