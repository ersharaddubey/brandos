// /**
//  * FILE (target path): frontend/src/audio/systemAudioCapture.js
//  * PURPOSE: Windows/Mac system audio capture — pure Chromium APIs, no installs,
//  * no admin rights, no native modules. Speaks the server's handshake protocol
//  * over the WebSocket (see server/src/infrastructure/websocket/server.js).
//  *
//  * WHY THIS LIVES IN THE RENDERER AND NOT electron/audio/*.js:
//  * getUserMedia, AudioContext, AudioWorkletNode, and Blob are browser APIs.
//  * They exist in this renderer's window/document context, NOT in Electron's
//  * main (Node) process. An earlier implementation called these from inside
//  * an ipcMain.handle in main.js, which throws
//  * `ReferenceError: navigator is not defined` immediately — that's why
//  * capture silently never progressed past "Detecting devices...".
//  *
//  * How the Windows/Mac loopback trick works:
//  * Chromium lets you capture "desktop audio" tied to a screen/window
//  * capture permission grant — you don't need Stereo Mix, a virtual driver,
//  * or admin rights (Windows). You get a screen source id from
//  * desktopCapturer (done in the MAIN process, see
//  * electron/audio/device-detector.js, exposed via
//  * window.electronAPI.audioCheckReadiness), then pass that id as
//  * chromeMediaSourceId in an AUDIO-ONLY getUserMedia call. No video track
//  * is requested or used — the screen source is purely a permission handle
//  * for the audio loopback.
//  *
//  * SERVER HANDSHAKE CONTRACT (server/src/infrastructure/websocket/server.js):
//  *   Connect:        wss://host/stream?token=<JWT>   (token added in Phase 5)
//  *   Client -> Server (JSON text frames):
//  *     {type:'start', mode}   - must be sent once, right after WS 'open'
//  *     {type:'respond'}       - ask the server to run the AI-answer step
//  *                              on the buffered transcript
//  *     {type:'stop'}          - sent before we close the socket
//  *   Client -> Server (binary frames): raw Int16 PCM, no wrapper. Only sent
//  *     AFTER the server's 'ready' message (see _sendChunk gating below) —
//  *     sending audio before 'start' is acknowledged means the server has no
//  *     AssemblyAI connection yet and silently drops it.
//  *   Server -> Client (JSON text frames):
//  *     {type:'connected', sessionId}
//  *     {type:'ready'}                                 - safe to stream audio now
//  *     {type:'assembly_ready'}                        - AssemblyAI is actually live
//  *     {type:'queued', position, message}              - waiting for a concurrency slot
//  *     {type:'transcript_interim', transcript}
//  *     {type:'transcript_final', transcript}
//  *     {type:'processing'}
//  *     {type:'answer', answer, question}
//  *     {type:'error', message}
//  *     {type:'idle_timeout', message}                  - server closing us for inactivity
//  *     {type:'stopped'}
//  */

// const PCM_WORKLET_SOURCE = `
// class PCMProcessor extends AudioWorkletProcessor {
//   constructor(options) {
//     super();
//     this.buffer = [];
//     this.bufferSize = 0;
//     this.targetBytes = options.processorOptions?.chunkSize ?? 3200;
//     this.vadThreshold = options.processorOptions?.vadThreshold ?? 0.01;
//     this.maxSilenceFrames = options.processorOptions?.maxSilenceFrames ?? 20;
//     this.silenceFrames = 0;
//     this.isSpeaking = false;
//   }

//   calculateRMS(data) {
//     let sum = 0;
//     for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
//     return Math.sqrt(sum / data.length);
//   }

//   process(inputs) {
//     const input = inputs[0];
//     if (input && input[0]) {
//       const float32 = input[0];
//       const level = this.calculateRMS(float32);

//       if (level > this.vadThreshold) {
//         this.silenceFrames = 0;
//         if (!this.isSpeaking) {
//           this.isSpeaking = true;
//           this.port.postMessage({ type: 'speech_start' });
//         }
//       } else {
//         this.silenceFrames++;
//         if (this.silenceFrames > this.maxSilenceFrames && this.isSpeaking) {
//           this.isSpeaking = false;
//           this.port.postMessage({ type: 'speech_end' });
//         }
//       }

//       const int16 = new Int16Array(float32.length);
//       for (let i = 0; i < float32.length; i++) {
//         int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
//       }

//       this.buffer.push(int16);
//       this.bufferSize += int16.byteLength;

//       if (this.bufferSize >= this.targetBytes) {
//         const merged = new Int16Array(this.bufferSize / 2);
//         let offset = 0;
//         for (const chunk of this.buffer) {
//           merged.set(chunk, offset);
//           offset += chunk.length;
//         }
//         this.port.postMessage(
//           { type: 'audio_data', data: merged.buffer, isSpeaking: this.isSpeaking, level },
//           [merged.buffer]
//         );
//         this.buffer = [];
//         this.bufferSize = 0;
//       } else {
//         this.port.postMessage({ type: 'level', level });
//       }
//     }
//     return true;
//   }
// }
// registerProcessor('pcm-processor', PCMProcessor);
// `;

// const STATES = {
//   IDLE: 'idle',
//   DETECTING: 'detecting',
//   REQUESTING_PERMISSION: 'requesting_permission',
//   CONNECTING: 'connecting',       // WS open, waiting for server 'ready'
//   CAPTURING: 'capturing',         // server said 'ready', audio is flowing
//   ERROR: 'error',
//   STOPPED: 'stopped',
// };

// class SystemAudioCapture {
//   constructor({
//     websocketUrl,
//     getToken,               // () => string | Promise<string> — called fresh on every
//                              // connect/reconnect. Keeps the WS connection decoupled
//                              // from token refresh: rotating the access token never
//                              // tears down an active capture session (see rationale
//                              // in _connectWebSocket below).
//     mode = 'default',
//     sampleRate = 16000,
//     chunkSize = 3200,
//     vadThreshold = 0.01,
//     onStateChange = () => {},
//     onVAD = () => {},
//     onLevel = () => {},
//     onError = () => {},
//     onTranscript = () => {},   // ({ transcript, isFinal }) => void
//     onAnswer = () => {},       // ({ answer, question }) => void
//     onQueued = () => {},       // ({ position, message }) => void
//   } = {}) {
//     this.websocketUrl = websocketUrl;
//     this.getToken = getToken;
//     this.mode = mode;
//     this.sampleRate = sampleRate;
//     this.chunkSize = chunkSize;
//     this.vadThreshold = vadThreshold;
//     this.onStateChange = onStateChange;
//     this.onVAD = onVAD;
//     this.onLevel = onLevel;
//     this.onError = onError;
//     this.onTranscript = onTranscript;
//     this.onAnswer = onAnswer;
//     this.onQueued = onQueued;

//     this.state = STATES.IDLE;
//     this.mediaStream = null;
//     this.audioContext = null;
//     this.workletNode = null;
//     this.ws = null;
//     this.sessionId = null;
//     this.serverReady = false;   // gates whether we're allowed to send binary audio
//     this.wsReconnectAttempts = 0;
//     this.maxWsReconnectAttempts = 5;
//     this.shouldReconnectWs = false;
//   }

//   _setState(state, extra) {
//     this.state = state;
//     this.onStateChange(state, extra);
//   }

//   /** Step 1: ask main for a screen-source handle (main can't call getUserMedia itself). */
//   async _getReadiness() {
//     if (!window.electronAPI?.audioCheckReadiness) {
//       throw new Error(
//         'window.electronAPI.audioCheckReadiness is not exposed. Check preload.js.'
//       );
//     }
//     const readiness = await window.electronAPI.audioCheckReadiness();
//     if (!readiness.ok) {
//       throw new Error(readiness.message || 'No screen source available for loopback audio.');
//     }
//     return readiness;
//   }

//   /**
//    * Step 2: getUserMedia using the screen source id as the loopback handle.
//    *
//    * IMPORTANT: this MUST request video as well as audio, both tied to the
//    * same chromeMediaSourceId. Requesting audio-only against a
//    * chromeMediaSource:'desktop' source causes Chromium to terminate the
//    * whole renderer process immediately with
//    * "Terminating renderer for bad IPC message, reason 263" — not a
//    * catchable JS error, the render process just dies. We don't want the
//    * video, so we stop and discard the video track the moment the stream
//    * comes back; only the audio track is kept and used.
//    */
//   async _openStream(readiness) {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       audio: {
//         mandatory: {
//           chromeMediaSource: 'desktop',
//           chromeMediaSourceId: readiness.sourceId,
//         },
//       },
//       video: {
//         mandatory: {
//           chromeMediaSource: 'desktop',
//           chromeMediaSourceId: readiness.sourceId,
//         },
//       },
//     });

//     // Discard the video track immediately — we only ever wanted the audio.
//     // This also releases the screen-capture indicator/overhead as soon as
//     // possible instead of holding it for the whole session.
//     stream.getVideoTracks().forEach((track) => track.stop());

//     return stream;
//   }

//   /** Step 3: AudioWorklet does VAD + PCM16 framing on the audio thread. */
//   async _setupWorklet(stream) {
//     this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
//       sampleRate: this.sampleRate,
//     });

//     const blob = new Blob([PCM_WORKLET_SOURCE], { type: 'application/javascript' });
//     const workletUrl = URL.createObjectURL(blob);
//     try {
//       await this.audioContext.audioWorklet.addModule(workletUrl);
//     } finally {
//       URL.revokeObjectURL(workletUrl);
//     }

//     const sourceNode = this.audioContext.createMediaStreamSource(stream);
//     this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor', {
//       processorOptions: {
//         chunkSize: this.chunkSize,
//         vadThreshold: this.vadThreshold,
//         maxSilenceFrames: 20,
//       },
//     });

//     this.workletNode.port.onmessage = (e) => {
//       const msg = e.data;
//       if (msg.type === 'speech_start') this.onVAD({ speaking: true });
//       if (msg.type === 'speech_end') this.onVAD({ speaking: false });
//       if (msg.type === 'level') this.onLevel(msg.level);
//       if (msg.type === 'audio_data') {
//         this.onLevel(msg.level);
//         this._sendChunk(msg.data);
//       }
//     };

//     sourceNode.connect(this.workletNode);
//     // Deliberately NOT connecting workletNode -> destination: that would
//     // route system audio back out the speakers (echo/feedback). We only
//     // need the data, not to play it.
//     await this.audioContext.resume();
//   }

//   /**
//    * Builds the WS URL with a fresh token appended. Called fresh on every
//    * connect AND every reconnect — so a token that rotated mid-session (or
//    * was stale/expired at the moment of a reconnect) is always re-fetched
//    * right before use, instead of a stale one baked in at construction time.
//    */
//   async _resolveUrl() {
//     if (!this.websocketUrl) {
//       throw new Error('websocketUrl is required');
//     }
//     const token = this.getToken ? await this.getToken() : null;
//     if (!token) return this.websocketUrl;
//     const separator = this.websocketUrl.includes('?') ? '&' : '?';
//     return `${this.websocketUrl}${separator}token=${encodeURIComponent(token)}`;
//   }

//   /** Step 4: WS connect + handshake per server/src/infrastructure/websocket/server.js */
//   async _connectWebSocket() {
//     const url = await this._resolveUrl();

//     return new Promise((resolve, reject) => {
//       this.shouldReconnectWs = true;
//       this.ws = new WebSocket(url);
//       this.ws.binaryType = 'arraybuffer';

//       let settled = false;

//       this.ws.onopen = () => {
//         this.wsReconnectAttempts = 0;
//         this._sendControl({ type: 'start', mode: this.mode });
//       };

//       this.ws.onmessage = (event) => {
//         // Server only ever sends JSON text frames to the client.
//         let data;
//         try {
//           data = JSON.parse(event.data);
//         } catch {
//           return;
//         }
//         this._handleServerMessage(data);

//         if (!settled && (data.type === 'connected' || data.type === 'ready')) {
//           if (data.type === 'ready') {
//             settled = true;
//             resolve();
//           }
//         }
//       };

//       this.ws.onerror = () => {
//         const err = new Error('WebSocket error');
//         this.onError(err);
//         if (!settled) {
//           settled = true;
//           reject(err);
//         }
//       };

//       this.ws.onclose = (event) => {
//         this.serverReady = false;
//         if (!settled) {
//           settled = true;
//           reject(new Error(`WebSocket closed before ready (code ${event.code})`));
//           return;
//         }
//         if (this.shouldReconnectWs && this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
//           const delay = Math.min(1000 * 2 ** this.wsReconnectAttempts, 15000);
//           this.wsReconnectAttempts++;
//           setTimeout(() => {
//             if (this.shouldReconnectWs) this._connectWebSocket().catch(() => {});
//           }, delay);
//         }
//       };
//     });
//   }

//   _handleServerMessage(data) {
//     switch (data.type) {
//       case 'connected':
//         this.sessionId = data.sessionId;
//         break;

//       case 'ready':
//         // Server has (re)started the AssemblyAI pipeline for this session
//         // (or re-armed it after a reconnect). Safe to stream audio now —
//         // see the note above about the queued-session edge case.
//         this.serverReady = true;
//         if (this.state !== STATES.STOPPED) this._setState(STATES.CAPTURING);
//         break;

//       case 'assembly_ready':
//         // Informational — AssemblyAI itself is live. Not required to gate
//         // sending, since the service buffers audio internally while
//         // (re)connecting (see assemblyai.service.js MAX_BUFFERED_CHUNKS).
//         break;

//       case 'queued':
//         this.serverReady = false; // no AssemblyAI connection yet — sending would be dropped
//         this.onQueued({ position: data.position, message: data.message });
//         break;

//       case 'transcript_interim':
//         this.onTranscript({ transcript: data.transcript, isFinal: false });
//         break;

//       case 'transcript_final':
//         this.onTranscript({ transcript: data.transcript, isFinal: true });
//         break;

//       case 'answer':
//         this.onAnswer({ answer: data.answer, question: data.question });
//         break;

//       case 'error':
//         this.onError(new Error(data.message || 'Server error'));
//         break;

//       case 'idle_timeout':
//         this.onError(new Error(data.message || 'Session closed due to inactivity'));
//         this.shouldReconnectWs = false;
//         break;

//       case 'stopped':
//         break;

//       default:
//         // Unknown message types are ignored rather than treated as errors,
//         // so the client doesn't break if the server adds new event types.
//         break;
//     }
//   }

//   _sendControl(payload) {
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       this.ws.send(JSON.stringify(payload));
//     }
//   }

//   _sendChunk(arrayBuffer) {
//     if (!this.serverReady) {
//       // Server hasn't acknowledged 'start' yet (or session is queued) —
//       // sending now would be silently dropped server-side (no
//       // assemblyConnection to pipe into). Drop client-side instead of
//       // buffering, matching the "no stale audio" policy below.
//       return;
//     }
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       this.ws.send(arrayBuffer);
//     }
//     // Chunks are dropped (not queued) if the socket isn't open — for live
//     // meeting audio, buffering stale audio behind a reconnect is worse
//     // than a short gap. Swap in a capped ring buffer if you need
//     // guaranteed delivery instead.
//   }

//   /** Ask the server to run the AI-answer step on the transcript buffered so far. */
//   requestAnswer() {
//     this._sendControl({ type: 'respond' });
//   }

//   async start() {
//     try {
//       this._setState(STATES.DETECTING);
//       const readiness = await this._getReadiness();

//       this._setState(STATES.REQUESTING_PERMISSION);
//       this.mediaStream = await this._openStream(readiness);

//       await this._setupWorklet(this.mediaStream);

//       this._setState(STATES.CONNECTING);
//       await this._connectWebSocket(); // resolves once server sends 'ready'

//       window.electronAPI?.audioReportStarted?.();
//       this._setState(STATES.CAPTURING, { source: readiness.sourceName });

//       return { success: true, source: readiness.sourceName, sessionId: this.sessionId };
//     } catch (err) {
//       this._setState(STATES.ERROR, { message: err.message });
//       this.onError(err);
//       await this.stop();
//       throw err;
//     }
//   }

//   async stop() {
//     this.shouldReconnectWs = false;
//     this.serverReady = false;

//     try {
//       if (this.workletNode) {
//         this.workletNode.disconnect();
//         this.workletNode.port.onmessage = null;
//         this.workletNode = null;
//       }
//       if (this.audioContext && this.audioContext.state !== 'closed') {
//         await this.audioContext.close();
//       }
//       this.audioContext = null;
//       if (this.mediaStream) {
//         this.mediaStream.getTracks().forEach((t) => t.stop());
//         this.mediaStream = null;
//       }
//       if (this.ws) {
//         this._sendControl({ type: 'stop' });
//         // Give the 'stop' frame a moment to actually leave the socket
//         // before we close it out from under it.
//         await new Promise((r) => setTimeout(r, 50));
//         this.ws.close();
//         this.ws = null;
//       }
//     } catch (err) {
//       console.warn('Cleanup warning:', err.message);
//     }

//     window.electronAPI?.audioReportStopped?.();
//     this._setState(STATES.STOPPED);
//   }

//   getState() {
//     return this.state;
//   }
// }

// export { SystemAudioCapture, STATES as AUDIO_STATES };

// ################################################################################
// ################################################################################
// ################################################################################

/**
 * FILE (target path): frontend/src/audio/systemAudioCapture.js
 * PURPOSE: Windows/Mac system audio capture — pure Chromium APIs, no installs,
 * no admin rights, no native modules. Speaks the server's handshake protocol
 * over the WebSocket (see server/src/infrastructure/websocket/server.js).
 *
 * WHY THIS LIVES IN THE RENDERER AND NOT electron/audio/*.js:
 * getUserMedia, AudioContext, AudioWorkletNode, and Blob are browser APIs.
 * They exist in this renderer's window/document context, NOT in Electron's
 * main (Node) process. An earlier implementation called these from inside
 * an ipcMain.handle in main.js, which throws
 * `ReferenceError: navigator is not defined` immediately — that's why
 * capture silently never progressed past "Detecting devices...".
 *
 * How the Windows/Mac loopback trick works:
 * Chromium lets you capture "desktop audio" tied to a screen/window
 * capture permission grant — you don't need Stereo Mix, a virtual driver,
 * or admin rights (Windows). You get a screen source id from
 * desktopCapturer (done in the MAIN process, see
 * electron/audio/device-detector.js, exposed via
 * window.electronAPI.audioCheckReadiness), then pass that id as
 * chromeMediaSourceId in an AUDIO-ONLY getUserMedia call. No video track
 * is requested or used — the screen source is purely a permission handle
 * for the audio loopback.
 *
 * SERVER HANDSHAKE CONTRACT (server/src/infrastructure/websocket/server.js):
 *   Connect:        wss://host/stream?token=<JWT>   (token added in Phase 5)
 *   Client -> Server (JSON text frames):
 *     {type:'start', mode}   - must be sent once, right after WS 'open'
 *     {type:'respond'}       - ask the server to run the AI-answer step
 *                              on the buffered transcript
 *     {type:'stop'}          - sent before we close the socket
 *   Client -> Server (binary frames): raw Int16 PCM, no wrapper. Only sent
 *     AFTER the server's 'ready' message (see _sendChunk gating below) —
 *     sending audio before 'start' is acknowledged means the server has no
 *     AssemblyAI connection yet and silently drops it.
 *   Server -> Client (JSON text frames):
 *     {type:'connected', sessionId}
 *     {type:'ready'}                                 - safe to stream audio now
 *     {type:'assembly_ready'}                        - AssemblyAI is actually live
 *     {type:'queued', position, message}              - waiting for a concurrency slot
 *     {type:'transcript_interim', transcript}
 *     {type:'transcript_final', transcript}
 *     {type:'processing'}
 *     {type:'answer', answer, question}
 *     {type:'error', message}
 *     {type:'idle_timeout', message}                  - server closing us for inactivity
 *     {type:'stopped'}
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
  CONNECTING: 'connecting',       // WS open, waiting for server 'ready'
  CAPTURING: 'capturing',         // server said 'ready', audio is flowing
  ERROR: 'error',
  STOPPED: 'stopped',
};

class SystemAudioCapture {
  constructor({
    websocketUrl,
    getToken,               // () => string | Promise<string> — called fresh on every
                             // connect/reconnect. Keeps the WS connection decoupled
                             // from token refresh: rotating the access token never
                             // tears down an active capture session (see rationale
                             // in _connectWebSocket below).
    mode = 'default',
    sampleRate = 16000,
    chunkSize = 3200,
    vadThreshold = 0.01,
    onStateChange = () => {},
    onVAD = () => {},
    onLevel = () => {},
    onError = () => {},
    onTranscript = () => {},   // ({ transcript, isFinal }) => void
    onAnswer = () => {},       // ({ answer, question }) => void
    onQueued = () => {},       // ({ position, message }) => void
    onConversationId = () => {}, // (conversationId) => void — shared conversation id
  } = {}) {
    this.websocketUrl = websocketUrl;
    this.getToken = getToken;
    this.mode = mode;
    this.sampleRate = sampleRate;
    this.chunkSize = chunkSize;
    this.vadThreshold = vadThreshold;
    this.onStateChange = onStateChange;
    this.onVAD = onVAD;
    this.onLevel = onLevel;
    this.onError = onError;
    this.onTranscript = onTranscript;
    this.onAnswer = onAnswer;
    this.onQueued = onQueued;
    this.onConversationId = onConversationId;

    this.state = STATES.IDLE;
    this.mediaStream = null;
    this.audioContext = null;
    this.workletNode = null;
    this.ws = null;
    this.sessionId = null;
    this.serverReady = false;   // gates whether we're allowed to send binary audio
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

  /**
   * Step 2: getUserMedia using the screen source id as the loopback handle.
   *
   * IMPORTANT: this MUST request video as well as audio, both tied to the
   * same chromeMediaSourceId. Requesting audio-only against a
   * chromeMediaSource:'desktop' source causes Chromium to terminate the
   * whole renderer process immediately with
   * "Terminating renderer for bad IPC message, reason 263" — not a
   * catchable JS error, the render process just dies. We don't want the
   * video, so we stop and discard the video track the moment the stream
   * comes back; only the audio track is kept and used.
   */
  async _openStream(readiness) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'navigator.mediaDevices.getUserMedia is not available. ' +
          'Ensure the app is running inside Electron with media permissions enabled.'
      );
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: readiness.sourceId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: readiness.sourceId,
          },
        },
      });
    } catch (err) {
      const name = err?.name || 'Error';
      const msg = err?.message || String(err);
      // Common Electron/Chromium failures when OS or in-app permission is missing
      if (name === 'NotAllowedError' || /permission|denied|not allowed/i.test(msg)) {
        throw new Error(
          'System audio permission denied. Grant screen/audio access in the OS ' +
            'prompt (and in Electron if asked), then click retry / restart capture.'
        );
      }
      if (name === 'NotFoundError' || /not found|no device/i.test(msg)) {
        throw new Error(
          'No system audio source found for loopback. On Windows check Stereo Mix / ' +
            'drivers; on macOS install BlackHole or enable system audio capture.'
        );
      }
      throw new Error(`getUserMedia failed (${name}): ${msg}`);
    }

    // Discard the video track immediately — we only ever wanted the audio.
    // This also releases the screen-capture indicator/overhead as soon as
    // possible instead of holding it for the whole session.
    stream.getVideoTracks().forEach((track) => track.stop());

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(
        'getUserMedia returned no audio track. System audio loopback is not available ' +
          'for this screen source — check OS audio permissions and drivers.'
      );
    }

    console.log(
      `🎤 [SystemAudioCapture] Audio track ready: ${audioTracks[0].label || 'system'} ` +
        `(enabled=${audioTracks[0].enabled}, muted=${audioTracks[0].muted})`
    );

    return stream;
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

  /**
   * Builds the WS URL with a fresh token appended. Called fresh on every
   * connect AND every reconnect — so a token that rotated mid-session (or
   * was stale/expired at the moment of a reconnect) is always re-fetched
   * right before use, instead of a stale one baked in at construction time.
   */
  async _resolveUrl() {
    if (!this.websocketUrl) {
      throw new Error('websocketUrl is required');
    }
    const token = this.getToken ? await this.getToken() : null;
    if (!token) return this.websocketUrl;
    const separator = this.websocketUrl.includes('?') ? '&' : '?';
    return `${this.websocketUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  /** Step 4: WS connect + handshake per server/src/infrastructure/websocket/server.js */
  async _connectWebSocket() {
    const url = await this._resolveUrl();

    return new Promise((resolve, reject) => {
      this.shouldReconnectWs = true;
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      let settled = false;

      this.ws.onopen = () => {
        this.wsReconnectAttempts = 0;
        this._sendControl({ type: 'start', mode: this.mode });
      };

      this.ws.onmessage = (event) => {
        // Server only ever sends JSON text frames to the client.
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        this._handleServerMessage(data);

        if (!settled && (data.type === 'connected' || data.type === 'ready')) {
          if (data.type === 'ready') {
            settled = true;
            resolve();
          }
        }
      };

      this.ws.onerror = () => {
        const err = new Error('WebSocket error');
        this.onError(err);
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      this.ws.onclose = (event) => {
        this.serverReady = false;
        if (!settled) {
          settled = true;
          reject(new Error(`WebSocket closed before ready (code ${event.code})`));
          return;
        }
        if (this.shouldReconnectWs && this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** this.wsReconnectAttempts, 15000);
          this.wsReconnectAttempts++;
          setTimeout(() => {
            if (this.shouldReconnectWs) this._connectWebSocket().catch(() => {});
          }, delay);
        }
      };
    });
  }

  _handleServerMessage(data) {
    switch (data.type) {
      case 'connected':
        this.sessionId = data.sessionId;
        break;

      case 'conversation_id':
        // The single shared Conversation for this app session — created
        // once voice's WS connection is established, reused by text and
        // screenshot mode too (see ai.routes.js header comment).
        this.onConversationId(data.conversationId);
        break;

      case 'ready':
        // Server has (re)started the AssemblyAI pipeline for this session
        // (or re-armed it after a reconnect). Safe to stream audio now —
        // see the note above about the queued-session edge case.
        this.serverReady = true;
        if (this.state !== STATES.STOPPED) this._setState(STATES.CAPTURING);
        break;

      case 'assembly_ready':
        // Informational — AssemblyAI itself is live. Not required to gate
        // sending, since the service buffers audio internally while
        // (re)connecting (see assemblyai.service.js MAX_BUFFERED_CHUNKS).
        break;

      case 'queued':
        this.serverReady = false; // no AssemblyAI connection yet — sending would be dropped
        this.onQueued({ position: data.position, message: data.message });
        break;

      case 'transcript_interim':
        this.onTranscript({ transcript: data.transcript, isFinal: false });
        break;

      case 'transcript_final':
        this.onTranscript({ transcript: data.transcript, isFinal: true });
        break;

      case 'answer':
        this.onAnswer({ answer: data.answer, question: data.question });
        break;

      case 'error':
        this.onError(new Error(data.message || 'Server error'));
        break;

      case 'idle_timeout':
        this.onError(new Error(data.message || 'Session closed due to inactivity'));
        this.shouldReconnectWs = false;
        break;

      case 'stopped':
        break;

      default:
        // Unknown message types are ignored rather than treated as errors,
        // so the client doesn't break if the server adds new event types.
        break;
    }
  }

  _sendControl(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  _sendChunk(arrayBuffer) {
    if (!this.serverReady) {
      // Server hasn't acknowledged 'start' yet (or session is queued) —
      // sending now would be silently dropped server-side (no
      // assemblyConnection to pipe into). Drop client-side instead of
      // buffering, matching the "no stale audio" policy below.
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(arrayBuffer);
    }
    // Chunks are dropped (not queued) if the socket isn't open — for live
    // meeting audio, buffering stale audio behind a reconnect is worse
    // than a short gap. Swap in a capped ring buffer if you need
    // guaranteed delivery instead.
  }

  /** Ask the server to run the AI-answer step on the transcript buffered so far. */
  requestAnswer() {
    this._sendControl({ type: 'respond' });
  }

  async start() {
    try {
      this._setState(STATES.DETECTING);
      const readiness = await this._getReadiness();

      this._setState(STATES.REQUESTING_PERMISSION);
      this.mediaStream = await this._openStream(readiness);

      await this._setupWorklet(this.mediaStream);

      this._setState(STATES.CONNECTING);
      await this._connectWebSocket(); // resolves once server sends 'ready'

      window.electronAPI?.audioReportStarted?.();
      this._setState(STATES.CAPTURING, { source: readiness.sourceName });

      return { success: true, source: readiness.sourceName, sessionId: this.sessionId };
    } catch (err) {
      this._setState(STATES.ERROR, { message: err.message });
      this.onError(err);
      await this.stop();
      throw err;
    }
  }

  async stop() {
    this.shouldReconnectWs = false;
    this.serverReady = false;

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
        this._sendControl({ type: 'stop' });
        // Give the 'stop' frame a moment to actually leave the socket
        // before we close it out from under it.
        await new Promise((r) => setTimeout(r, 50));
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