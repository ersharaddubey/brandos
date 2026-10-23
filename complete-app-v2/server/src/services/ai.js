/**
 * AI answer helper — uses user's plan keys (Groq / Gemini / OpenAI).
 * Falls back to a local stub answer if no key works so the UI still flows.
 */
const store = require('../db');
const { getPlan } = require('../routes/plan');

function getProfileContext(userId) {
  const p = store.profiles()[userId];
  if (!p) return '';
  const parts = [];
  if (p.introduction) parts.push(`Intro: ${p.introduction}`);
  if (p.experienceLevel) parts.push(`Level: ${p.experienceLevel}`);
  if (p.totalExperience) parts.push(`Experience: ${p.totalExperience}`);
  if (p.languages?.length) parts.push(`Languages: ${p.languages.join(', ')}`);
  if (p.frontend?.length) parts.push(`Frontend: ${p.frontend.join(', ')}`);
  if (p.databases?.length) parts.push(`Databases: ${p.databases.join(', ')}`);
  if (p.remarks) parts.push(`Notes: ${p.remarks}`);
  return parts.join('\n');
}

async function callGroq(apiKey, system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    answer: data.choices?.[0]?.message?.content || '',
    provider: 'groq',
    model: data.model || 'llama-3.3-70b-versatile',
  };
}

async function callOpenAI(apiKey, system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    answer: data.choices?.[0]?.message?.content || '',
    provider: 'openai',
    model: data.model || 'gpt-4o-mini',
  };
}

async function callGemini(apiKey, system, user) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const answer =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return { answer, provider: 'gemini', model: 'gemini-2.0-flash' };
}

async function generateAnswer(userId, question, mode = 'text') {
  const plan = getPlan(userId);
  const profileCtx = getProfileContext(userId);
  const system = [
    'You are a live technical support assistant helping in an interview or support call.',
    'Give clear, concise, practical answers. Prefer code snippets when useful.',
    profileCtx ? `Candidate / user context:\n${profileCtx}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const preferred =
    (plan?.providerPreferences && plan.providerPreferences[mode]) ||
    (plan?.providerPreferences && plan.providerPreferences.text) ||
    null;

  const keys = plan?.providerKeys || {};
  const order = [];
  if (preferred && keys[preferred]) order.push(preferred);
  for (const name of Object.keys(keys)) {
    if (!order.includes(name)) order.push(name);
  }

  const errors = [];
  for (const name of order) {
    const key = keys[name];
    if (!key) continue;
    try {
      if (name === 'groq') return await callGroq(key, system, question);
      if (name === 'openai') return await callOpenAI(key, system, question);
      if (name === 'gemini') return await callGemini(key, system, question);
      if (name === 'mistral') {
        // Mistral OpenAI-compatible endpoint
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: question },
            ],
          }),
        });
        if (!res.ok) throw new Error(`Mistral ${res.status}`);
        const data = await res.json();
        return {
          answer: data.choices?.[0]?.message?.content || '',
          provider: 'mistral',
          model: data.model || 'mistral-small-latest',
        };
      }
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.warn('[ai]', err.message);
    }
  }

  // Stub so UI still works without valid keys
  return {
    answer:
      `(Local stub — configure a valid AI provider key in Plan settings)\n\n` +
      `You asked: ${question}\n\n` +
      (errors.length ? `Provider errors:\n- ${errors.join('\n- ')}\n\n` : '') +
      `Add a working Groq / Gemini / OpenAI key under Plan to get real answers.`,
    provider: 'stub',
    model: 'local-stub',
  };
}

module.exports = { generateAnswer, getProfileContext };
