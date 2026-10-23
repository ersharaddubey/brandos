/**
 * FILE: electron/audio/windows.capture.js
 * PURPOSE: Windows system audio capture via WASAPI Loopback
 * PRODUCTION GRADE - Fixed audio loop issue
 */

const { desktopCapturer } = require('electron');

class WindowsSystemAudioCapture {
  constructor(options = {}) {
    this.options = options;
    this.isRunning = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.onData = options.onData || (() => {});
    this.onError = options.onError || (() => {});
    this.onVAD = options.onVAD || (() => {});
    this.onLevel = options.onLevel || (() => {});
    this.sampleRate = 16000;
    this.chunkSize = 3200;
    this.isSpeaking = false;
    this.audioLevel = 0;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // async start(sourceId = null) {
  //   try {
  //     console.log('🎤 Starting Windows system audio capture (WASAPI Loopback)...');

  //     // Get audio sources
  //     const sources = await this.getAudioSources();
      
  //     // Find system audio source
  //     const source = this.findSystemAudioSource(sources);
      
  //     if (!source) {
  //       throw new Error('No system audio source found. Please check your audio settings.');
  //     }

  //     console.log('✅ Audio source found:', source.name);

  //     // Create audio stream
  //     const stream = await this.createAudioStream(source.id);
  //     this.mediaStream = stream;

  //     // Setup audio processing
  //     await this.setupAudioProcessing(stream);

  //     console.log('✅ Windows system audio capture started (interviewer voice only)');

  //     return {
  //       success: true,
  //       source: source.name,
  //       sampleRate: this.sampleRate,
  //       chunkSize: this.chunkSize,
  //     };

  //   } catch (err) {
  //     console.error('❌ Windows audio capture failed:', err.message);
  //     this.onError(err);
  //     throw err;
  //   }
  // }
  // async start(sourceId = null) {
  //   try {
  //     console.log('🎤 [STEP 1] Starting Windows system audio capture...');

  //     // Get audio sources
  //     console.log('📡 [STEP 2] Getting audio sources...');
  //     const sources = await this.getAudioSources();
  //     console.log(`📡 [STEP 2] Found ${sources.length} sources`);
      
  //     if (sources.length === 0) {
  //       console.error('❌ [STEP 2] NO audio sources found!');
  //       throw new Error('No audio sources found. Please check your audio settings.');
  //     }

  //     // Find system audio source
  //     console.log('📡 [STEP 3] Finding system audio source...');
  //     const source = this.findSystemAudioSource(sources);
  //     console.log('📡 [STEP 3] Source found:', source?.name || 'NONE');

  //     if (!source) {
  //       console.error('❌ [STEP 3] No system audio source found!');
  //       throw new Error('No system audio source found. Please check your audio settings.');
  //     }

  //     console.log('✅ [STEP 3] Audio source found:', source.name);
  //     console.log('✅ [STEP 3] Source ID:', source.id);

  //     // Create audio stream
  //     console.log('🎵 [STEP 4] Creating audio stream with getUserMedia...');
  //     console.log('🎵 [STEP 4] Source ID:', source.id);
      
  //     let stream;
  //     try {
  //       stream = await navigator.mediaDevices.getUserMedia({
  //         audio: {
  //           mandatory: {
  //             chromeMediaSource: 'desktop',
  //             chromeMediaSourceId: source.id,
  //           },
  //         },
  //       });
  //       console.log('✅ [STEP 4] Stream created successfully!');
  //       console.log('✅ [STEP 4] Stream active:', stream.active);
  //       console.log('✅ [STEP 4] Audio tracks:', stream.getAudioTracks().length);
  //     } catch (streamError) {
  //       console.error('❌ [STEP 4] getUserMedia FAILED:', streamError.message);
  //       console.error('❌ [STEP 4] Stream error details:', streamError);
  //       throw new Error(`Failed to create audio stream: ${streamError.message}`);
  //     }

  //     this.mediaStream = stream;

  //     // Setup audio processing
  //     console.log('🔧 [STEP 5] Setting up audio processing...');
  //     try {
  //       await this.setupAudioProcessing(stream);
  //       console.log('✅ [STEP 5] Audio processing setup complete');
  //     } catch (processError) {
  //       console.error('❌ [STEP 5] Audio processing FAILED:', processError.message);
  //       console.error('❌ [STEP 5] Process error details:', processError);
  //       throw new Error(`Failed to setup audio processing: ${processError.message}`);
  //     }

  //     this.isRunning = true;
  //     console.log('✅ [STEP 6] isRunning set to TRUE');
  //     console.log('✅ Windows system audio capture started (interviewer voice only)');

  //     // Send initial status
  //     this.onVAD({ speaking: false });
  //     this.onLevel(0);

  //     return {
  //       success: true,
  //       source: source.name,
  //       sampleRate: this.sampleRate,
  //       chunkSize: this.chunkSize,
  //     };

  //   } catch (err) {
  //     console.error('❌❌❌ Windows audio capture FAILED:', err.message);
  //     console.error('❌ Full error details:', JSON.stringify(err, null, 2));
  //     console.error('❌ Stack trace:', err.stack);
  //     this.isRunning = false;
  //     this.onError(err);
  //     throw err;
  //   }
  // }

  async start(sourceId = null) {
    try {
      console.log('🎤 [STEP 1] Starting Windows system audio capture...');

      // Get audio sources
      console.log('📡 [STEP 2] Getting audio sources...');
      const sources = await this.getAudioSources();
      console.log(`📡 [STEP 2] Found ${sources.length} sources`);
      
      if (sources.length === 0) {
        console.error('❌ [STEP 2] NO audio sources found!');
        throw new Error('No audio sources found');
      }

      // Log all sources
      sources.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.name} (${s.id})`);
      });

      // Find system audio source
      console.log('📡 [STEP 3] Finding system audio source...');
      const source = this.findSystemAudioSource(sources);
      console.log('📡 [STEP 3] Source found:', source?.name || 'NONE');

      if (!source) {
        throw new Error('No system audio source found');
      }

      console.log('✅ Audio source found:', source.name);

      // Create audio stream
      console.log('🎵 [STEP 4] Creating audio stream...');
      const stream = await this.createAudioStream(source.id);
      this.mediaStream = stream;
      console.log('✅ [STEP 4] Stream created, active:', stream.active);

      // Setup audio processing
      console.log('🔧 [STEP 5] Setting up audio processing...');
      await this.setupAudioProcessing(stream);
      console.log('✅ [STEP 5] Audio processing setup complete');

      console.log('✅ Windows system audio capture started');
      return { success: true };

    } catch (err) {
      console.error('❌ Windows audio capture failed:', err.message);
      console.error('❌ Stack:', err.stack);
      this.onError(err);
      throw err;
    }
  }

  async getAudioSources() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['audio'],
        thumbnailSize: { width: 0, height: 0 },
      });
      
      console.log(`📡 Found ${sources.length} audio sources`);
      sources.forEach(s => console.log(`  - ${s.name}`));
      
      return sources;
    } catch (err) {
      console.error('Failed to get audio sources:', err.message);
      return [];
    }
  }

  findSystemAudioSource(sources) {
    // Priority order for Windows system audio
    const priorityKeywords = [
      'loopback',
      'stereo mix',
      'what you hear',
      'system',
      'output',
      'speaker',
      'headphone'
    ];

    // Try to find by priority
    for (const keyword of priorityKeywords) {
      const found = sources.find(s => 
        s.name.toLowerCase().includes(keyword)
      );
      if (found) {
        console.log(`✅ Found system audio: ${found.name} (matched: ${keyword})`);
        return found;
      }
    }

    // Fallback: use first available
    if (sources.length > 0) {
      console.log(`⚠️ Using first available source: ${sources[0].name}`);
      return sources[0];
    }

    return null;
  }

  async createAudioStream(sourceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      });
      return stream;
    } catch (err) {
      throw new Error(`Failed to create audio stream: ${err.message}`);
    }
  }

  async setupAudioProcessing(stream) {
    // Create AudioContext
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate,
    });

    // Load AudioWorklet
    const workletCode = this.getWorkletCode();
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await this.audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    // Create worklet node
    const sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

    // Handle messages from worklet
    this.workletNode.port.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === 'speech_start') {
        console.log('🗣️ Speech detected');
        this.isSpeaking = true;
        this.onVAD({ speaking: true });
      }

      if (msg.type === 'speech_end') {
        console.log('🔇 Silence detected');
        this.isSpeaking = false;
        this.onVAD({ speaking: false });
      }

      if (msg.type === 'audio_data' && this.isRunning) {
        // Send audio data to frontend
        this.onData(Buffer.from(msg.data));
        this.onLevel(msg.level);
      }
    };

    // Connect nodes
    sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);

    // Resume context
    await this.audioContext.resume();
    this.isRunning = true;
  }

  getWorkletCode() {
    return `
      class PCMProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = [];
          this.bufferSize = 0;
          this.targetBytes = 3200;
          this.vadThreshold = 0.01;
          this.silenceFrames = 0;
          this.maxSilenceFrames = 20;
          this.isSpeaking = false;
          this.audioLevel = 0;
        }

        calculateRMS(data) {
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
          }
          return Math.sqrt(sum / data.length);
        }

        process(inputs) {
          const input = inputs[0];
          if (input && input[0]) {
            const float32 = input[0];
            this.audioLevel = this.calculateRMS(float32);

            // VAD Detection
            if (this.audioLevel > this.vadThreshold) {
              this.silenceFrames = 0;
              if (!this.isSpeaking) {
                this.isSpeaking = true;
                this.port.postMessage({ type: 'speech_start' });
              }
            } else {
              this.silenceFrames++;
              if (this.silenceFrames > this.maxSilenceFrames && this.isSpeaking) {
                this.isSpeaking = false;
                this.port.postMessage({ type: 'speech_end' });
              }
            }

            // Convert to PCM
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
            }

            // Buffer chunks
            this.buffer.push(int16);
            this.bufferSize += int16.byteLength;

            if (this.bufferSize >= this.targetBytes) {
              const merged = new Int16Array(this.bufferSize / 2);
              let offset = 0;
              for (const chunk of this.buffer) {
                merged.set(chunk, offset);
                offset += chunk.length;
              }
              this.port.postMessage({
                type: 'audio_data',
                data: merged.buffer,
                isSpeaking: this.isSpeaking,
                level: this.audioLevel,
              });
              this.buffer = [];
              this.bufferSize = 0;
            }
          }
          return true;
        }
      }
      registerProcessor('pcm-processor', PCMProcessor);
    `;
  }

  async stop() {
    console.log('⏹ Stopping Windows audio capture...');
    this.isRunning = false;

    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }
    } catch (err) {
      console.log('⚠️ Cleanup warning:', err.message);
    }

    console.log('✅ Windows audio capture stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isSpeaking: this.isSpeaking,
      audioLevel: this.audioLevel,
      sampleRate: this.sampleRate,
      chunkSize: this.chunkSize,
    };
  }
}

function createWindowsAudioCapture(options) {
  return new WindowsSystemAudioCapture(options);
}

module.exports = { createWindowsAudioCapture, WindowsSystemAudioCapture };