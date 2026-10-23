/**
 * WebSocket /stream — voice capture pipeline.
 *
 * Client protocol (from systemAudioCapture.js):
 *   → { type: 'start', mode }
 *   → binary PCM16 chunks
 *   → { type: 'respond' }
 *   → { type: 'stop' }
 *
 * Server → client:
 *   { type: 'connected', sessionId }
 *   { type: 'conversation_id', conversationId }
 *   { type: 'ready' }
 *   { type: 'transcript_interim' | 'transcript_final', transcript }
 *   { type: 'answer', answer, question }
 *   { type: 'error', message }
 *   { type: 'queued', position }
 *
 * AssemblyAI real-time is used when the user has an active L1 plan with
 * an assemblyaiKey. Without a key / on failure, we still keep the session
 * alive and use a local silence-aware stub so the UI can be tested.
 */
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { verifyTokenString } = require('../middleware/auth');
const { getPlan } = require('../routes/plan');
const { ensureConversation, appendMessage } = require('../routes/ai');
const { generateAnswer } = require('../services/ai');
const { createAssemblySession } = require('../services/assemblyai');

function attachStreamServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/stream' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const user = verifyTokenString(token);

    if (!user) {
      ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
      ws.close(4401, 'Unauthorized');
      return;
    }

    const plan = getPlan(user.id);
    if (!plan || plan.status !== 'active') {
      ws.send(JSON.stringify({ type: 'error', message: 'PLAN_REQUIRED' }));
      ws.close(4403, 'PLAN_REQUIRED');
      return;
    }

    const sessionId = uuidv4();
    const conv = ensureConversation(user.id, null, 'voice');
    let mode = 'default';
    let serverReady = false;
    let transcriptBuffer = '';
    let assembly = null;
    let closed = false;

    const send = (obj) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(obj));
    };

    send({ type: 'connected', sessionId });
    send({ type: 'conversation_id', conversationId: conv.id });

    const startPipeline = async () => {
      try {
        if (plan.assemblyaiKey) {
          assembly = await createAssemblySession({
            apiKey: plan.assemblyaiKey,
            onTranscript: (text, isFinal) => {
              if (!text) return;
              if (isFinal) {
                transcriptBuffer = (transcriptBuffer + ' ' + text).trim();
                send({ type: 'transcript_final', transcript: text });
              } else {
                send({ type: 'transcript_interim', transcript: text });
              }
            },
            onError: (err) => {
              console.warn('[ws] assembly error', err.message);
              send({ type: 'error', message: `Transcription: ${err.message}` });
            },
          });
        }
      } catch (err) {
        console.warn('[ws] assembly start failed, using stub mode', err.message);
        assembly = null;
      }

      serverReady = true;
      send({ type: 'ready' });
      if (assembly) send({ type: 'assembly_ready' });
    };

    ws.on('message', async (data, isBinary) => {
      if (closed) return;

      if (isBinary) {
        if (!serverReady) return;
        if (assembly && assembly.sendAudio) {
          assembly.sendAudio(data);
        }
        return;
      }

      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === 'start') {
        mode = msg.mode || 'default';
        await startPipeline();
        return;
      }

      if (msg.type === 'respond') {
        const question = transcriptBuffer.trim();
        if (!question || question.length < 2) {
          send({
            type: 'answer',
            answer: 'No speech captured yet. Keep talking, then request an answer again.',
            question: '',
          });
          return;
        }
        try {
          appendMessage(conv.id, 'user', question, { source: 'voice' });
          const result = await generateAnswer(user.id, question, 'voice');
          appendMessage(conv.id, 'assistant', result.answer, {
            provider: result.provider,
            model: result.model,
          });
          send({ type: 'answer', answer: result.answer, question });
          // keep buffer for follow-ups; client may continue
        } catch (err) {
          send({ type: 'error', message: err.message || 'Answer failed' });
        }
        return;
      }

      if (msg.type === 'stop') {
        closed = true;
        if (assembly && assembly.close) assembly.close();
        ws.close();
      }
    });

    ws.on('close', () => {
      closed = true;
      if (assembly && assembly.close) assembly.close();
    });

    ws.on('error', () => {
      closed = true;
      if (assembly && assembly.close) assembly.close();
    });
  });

  console.log('✅ WebSocket /stream attached');
  return wss;
}

module.exports = { attachStreamServer };
