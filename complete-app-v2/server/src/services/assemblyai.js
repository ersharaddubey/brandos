/**
 * AssemblyAI real-time transcription (optional).
 * If the realtime WS cannot connect, stream.js falls back to stub mode.
 *
 * Docs: https://www.assemblyai.com/docs/speech-to-text/universal-streaming
 */
const WebSocket = require('ws');

async function createAssemblySession({ apiKey, onTranscript, onError }) {
  // v3 universal streaming endpoint
  const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&format_turns=true`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: { Authorization: apiKey },
    });

    let opened = false;

    const session = {
      sendAudio(buffer) {
        if (ws.readyState === WebSocket.OPEN) {
          // PCM16 little-endian bytes
          ws.send(buffer);
        }
      },
      close() {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'Terminate' }));
            ws.close();
          }
        } catch {
          /* ignore */
        }
      },
    };

    const timer = setTimeout(() => {
      if (!opened) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(new Error('AssemblyAI connect timeout'));
      }
    }, 8000);

    ws.on('open', () => {
      opened = true;
      clearTimeout(timer);
      resolve(session);
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // v3 turn events
        if (msg.type === 'Turn' || msg.transcript) {
          const text = msg.transcript || msg.utterance || '';
          const isFinal = Boolean(msg.end_of_turn || msg.message_type === 'FinalTranscript');
          if (text) onTranscript(text, isFinal);
        }
        if (msg.message_type === 'FinalTranscript' && msg.text) {
          onTranscript(msg.text, true);
        }
        if (msg.message_type === 'PartialTranscript' && msg.text) {
          onTranscript(msg.text, false);
        }
        if (msg.error) onError(new Error(msg.error));
      } catch (err) {
        onError(err);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      if (!opened) reject(err);
      else onError(err);
    });

    ws.on('close', () => {
      clearTimeout(timer);
    });
  });
}

module.exports = { createAssemblySession };
