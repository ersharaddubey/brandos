/**
 * FILE: electron/audio/mac.capture.js
 * PURPOSE: Mac system audio capture via ScreenCaptureKit + BlackHole fallback
 * Captures ONLY system audio (meet/teams/zoom) - NEVER microphone
 */

const { desktopCapturer } = require('electron');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MacSystemAudioCapture {
  constructor(options = {}) {
    this.options = options;
    this.isRunning = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.onData = options.onData || (() => {});
    this.onError = options.onError || (() => {});
    this.onVAD = options.onVAD || (() => {});
    this.sampleRate = 16000;
    this.chunkSize = 3200;
    this.vadThreshold = 0.01;
    this.silenceFrames = 0;
    this.maxSilenceFrames = 20;
    this.isSpeaking = false;
    this.usingBlackHole = false;
  }

  async checkBlackHole() {
    try {
      const { stdout } = await execAsync('ls /Library/Audio/Plug-Ins/HAL/ | grep -i blackhole');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  async start() {
    try {
      console.log('🍎 Starting Mac system audio capture...');

      // Check for BlackHole
      const hasBlackHole = await this.checkBlackHole();

      // Get audio sources
      const sources = await desktopCapturer.getSources({
        types: ['audio'],
        thumbnailSize: { width: 0, height: 0 },
      });

      let source = null;

      // Try BlackHole first if installed
      if (hasBlackHole) {
        source = sources.find(s =>
          s.name.toLowerCase().includes('blackhole') ||
          s.name.toLowerCase().includes('blackhole')
        );
        if (source) {
          this.usingBlackHole = true;
          console.log('✅ BlackHole found, using for audio capture');
        }
      }

      // Fallback: Use ScreenCaptureKit (system audio)
      if (!source) {
        console.log('⚠️ BlackHole not found, using ScreenCaptureKit fallback');
        source = sources.find(s =>
          s.name.toLowerCase().includes('audio') ||
          s.name.toLowerCase().includes('system') ||
          s.name.toLowerCase().includes('output')
        );
        this.usingBlackHole = false;
      }

      if (!source) {
        throw new Error(
          'No system audio source found.\n' +
          'Please install BlackHole: https://github.com/ExistentialAudio/BlackHole\n' +
          'Or enable system audio capture in System Settings.'
        );
      }

      console.log(`✅ Audio source: ${source.name} (BlackHole: ${this.usingBlackHole})`);

      // Create stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        },
      });

      this.mediaStream = stream;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      // AudioWorklet (same as Windows)
      const workletCode = `
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

              const int16 = new Int16Array(float32.length);
              for (let i = 0; i < float32.length; i++) {
                int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
              }

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

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

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

        if (msg.type === 'audio_data' && this.isRunning && this.isSpeaking) {
          this.onData(Buffer.from(msg.data));
        }
      };

      sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      await this.audioContext.resume();
      this.isRunning = true;

      console.log(`✅ Mac system audio capture started (BlackHole: ${this.usingBlackHole})`);

      return {
        success: true,
        source: source.name,
        usingBlackHole: this.usingBlackHole,
        sampleRate: this.sampleRate,
        chunkSize: this.chunkSize,
      };

    } catch (err) {
      console.error('❌ Mac audio capture failed:', err.message);
      this.onError(err);
      throw err;
    }
  }

  async stop() {
    console.log('⏹ Stopping Mac audio capture...');
    this.isRunning = false;

    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
      }
      if (this.audioContext) {
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

    console.log('✅ Mac audio capture stopped');
  }

  isCurrentlySpeaking() {
    return this.isSpeaking;
  }
}

async function createMacAudioCapture(options) {
  const capture = new MacSystemAudioCapture(options);
  return capture;
}

module.exports = { createMacAudioCapture, MacSystemAudioCapture };