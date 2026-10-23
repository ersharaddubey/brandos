/**
 * FILE: src/renderer/audio/systemAudioCapture.js
 * PURPOSE: Windows system audio capture — pure Chromium APIs, no installs,
 * no admin rights, no native modules.
 *
 * WHY THIS LIVES IN THE RENDERER AND NOT electron/audio/*.js:
 * getUserMedia, AudioContext, AudioWorkletNode, and Blob are browser APIs.
 * They exist in this renderer's window/document context, NOT in Electron's
 * main (Node) process. The original implementation called these from
 * inside an ipcMain.handle in main.js, which throws
 * `ReferenceError: navigator is not defined` immediately — that's why
 * capture silently never progressed past "Detecting devices...".
 *
 * How the Windows loopback trick works:
 * Chromium lets you capture "desktop audio" tied to a screen/window
 * capture permission grant — you don't need Stereo Mix, a virtual driver,
 * or admin rights. You get a screen source id from desktopCapturer (done
 * in main process, see electron/audio/device-detector.js), then pass that
 * id as chromeMediaSourceId in an AUDIO-ONLY getUserMedia call. No video
 * track is requested or used — the screen source is purely a permission
 * handle for the audio loopback.
 */

const PCM_WORKLET_SOURCE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    this.bufferSize = 0;
    this.targetBytes = options.processorOptions?.chunkSize ?? 3200;
    this.vadThreshold = options.processorOptions?.vadThreshold ?? 0.01;
    this.maxSilenceFrames = options.processorOptions?.maxSilenceFrames ?? 20;
    this.silenceFrames = 0;
    this.isSpeaking = false;
  }

  calculateRMS(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const float32 = input[0];
      const level = this.calculateRMS(float32);

      if (level > this.vadThreshold) {
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
        this.port.postMessage(
          { type: 'audio_data', data: merged.buffer, isSpeaking: this.isSpeaking, level },
          [merged.buffer]
        );
        this.buffer = [];
        this.bufferSize = 0;
      } else {
        this.port.postMessage({ type: 'level', level });
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

const STATES = {
  IDLE: 'idle',
  DETECTING: 'detecting',
  REQUESTING_PERMISSION: 'requesting_permission',
  CAPTURING: 'capturing',
  ERROR: 'error',
  STOPPED: 'stopped',
};

class SystemAudioCapture {
  constructor({
    websocketUrl,
    sampleRate = 16000,
    chunkSize = 3200,
    vadThreshold = 0.01,
    onStateChange = () => {},
    onVAD = () => {},
    onLevel = () => {},
    onError = () => {},
  } = {}) {
    this.websocketUrl = websocketUrl;
    this.sampleRate = sampleRate;
    this.chunkSize = chunkSize;
    this.vadThreshold = vadThreshold;
    this.onStateChange = onStateChange;
    this.onVAD = onVAD;
    this.onLevel = onLevel;
    this.onError = onError;

    this.state = STATES.IDLE;
    this.mediaStream = null;
    this.audioContext = null;
    this.workletNode = null;
    this.ws = null;
    this.wsReconnectAttempts = 0;
    this.maxWsReconnectAttempts = 5;
    this.shouldReconnectWs = false;
  }

  _setState(state, extra) {
    this.state = state;
    this.onStateChange(state, extra);
  }

  /** Step 1: ask main for a screen-source handle (main can't call getUserMedia itself). */
  async _getReadiness() {
    if (!window.electronAPI?.audioCheckReadiness) {
      throw new Error(
        'window.electronAPI.audioCheckReadiness is not exposed. Check preload.js.'
      );
    }
    const readiness = await window.electronAPI.audioCheckReadiness();
    if (!readiness.ok) {
      throw new Error(readiness.message || 'No screen source available for loopback audio.');
    }
    return readiness;
  }

  /** Step 2: audio-only getUserMedia using that source id as the loopback handle. */
  async _openStream(readiness) {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: readiness.sourceId,
        },
      },
      video: false,
    });
  }

  /** Step 3: AudioWorklet does VAD + PCM16 framing on the audio thread. */
  async _setupWorklet(stream) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate,
    });

    const blob = new Blob([PCM_WORKLET_SOURCE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    try {
      await this.audioContext.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }

    const sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor', {
      processorOptions: {
        chunkSize: this.chunkSize,
        vadThreshold: this.vadThreshold,
        maxSilenceFrames: 20,
      },
    });

    this.workletNode.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'speech_start') this.onVAD({ speaking: true });
      if (msg.type === 'speech_end') this.onVAD({ speaking: false });
      if (msg.type === 'level') this.onLevel(msg.level);
      if (msg.type === 'audio_data') {
        this.onLevel(msg.level);
        this._sendChunk(msg.data);
      }
    };

    sourceNode.connect(this.workletNode);
    // Deliberately NOT connecting workletNode -> destination: that would
    // route system audio back out the speakers (echo/feedback). We only
    // need the data, not to play it.
    await this.audioContext.resume();
  }

  _connectWebSocket() {
    if (!this.websocketUrl) return;
    this.shouldReconnectWs = true;
    this.ws = new WebSocket(this.websocketUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.wsReconnectAttempts = 0;
    };
    this.ws.onerror = () => {
      this.onError(new Error('WebSocket error'));
    };
    this.ws.onclose = () => {
      if (this.shouldReconnectWs && this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** this.wsReconnectAttempts, 15000);
        this.wsReconnectAttempts++;
        setTimeout(() => {
          if (this.shouldReconnectWs) this._connectWebSocket();
        }, delay);
      }
    };
  }

  _sendChunk(arrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(arrayBuffer);
    }
    // Chunks are dropped (not queued) if the socket isn't open — for live
    // meeting audio, buffering stale audio behind a reconnect is worse
    // than a short gap. Swap in a capped ring buffer if you need
    // guaranteed delivery instead.
  }

  async start() {
    try {
      this._setState(STATES.DETECTING);
      const readiness = await this._getReadiness();

      this._setState(STATES.REQUESTING_PERMISSION);
      this.mediaStream = await this._openStream(readiness);

      await this._setupWorklet(this.mediaStream);
      this._connectWebSocket();

      window.electronAPI?.audioReportStarted?.();
      this._setState(STATES.CAPTURING, { source: readiness.sourceName });

      return { success: true, source: readiness.sourceName };
    } catch (err) {
      this._setState(STATES.ERROR, { message: err.message });
      this.onError(err);
      await this.stop();
      throw err;
    }
  }

  async stop() {
    this.shouldReconnectWs = false;

    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode.port.onmessage = null;
        this.workletNode = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      this.audioContext = null;
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    } catch (err) {
      console.warn('Cleanup warning:', err.message);
    }

    window.electronAPI?.audioReportStopped?.();
    this._setState(STATES.STOPPED);
  }

  getState() {
    return this.state;
  }
}

export { SystemAudioCapture, STATES as AUDIO_STATES };