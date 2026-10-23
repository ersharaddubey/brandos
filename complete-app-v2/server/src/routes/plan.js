const express = require('express');
const store = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const PROVIDER_CAPABILITIES = {
  groq: { modes: ['voice', 'text', 'screenshot'], label: 'Groq' },
  gemini: { modes: ['voice', 'text', 'screenshot'], label: 'Gemini' },
  mistral: { modes: ['voice', 'text', 'screenshot'], label: 'Mistral' },
  openai: { modes: ['voice', 'text', 'screenshot'], label: 'OpenAI' },
};

function getPlan(userId) {
  const plans = store.plans();
  return plans[userId] || null;
}

function savePlan(userId, plan) {
  const plans = store.plans();
  plans[userId] = plan;
  store.savePlans(plans);
}

function planResponse(plan) {
  if (!plan) {
    return {
      success: true,
      plan: { status: 'inactive', tier: null },
      providerPreferences: {},
      configuredProviders: [],
      providerCapabilities: PROVIDER_CAPABILITIES,
    };
  }
  const configuredProviders = Object.keys(plan.providerKeys || {});
  return {
    success: true,
    plan: {
      status: plan.status,
      tier: plan.tier,
    },
    providerPreferences: plan.providerPreferences || {},
    configuredProviders,
    providerCapabilities: PROVIDER_CAPABILITIES,
  };
}

router.get('/', authRequired, (req, res) => {
  const plan = getPlan(req.user.id);
  res.json(planResponse(plan));
});

router.post('/activate-l1', authRequired, (req, res) => {
  try {
    const { assemblyaiKey, providers, termsAccepted } = req.body || {};
    if (!termsAccepted) {
      return res.status(400).json({ success: false, error: 'Terms must be accepted' });
    }
    if (!assemblyaiKey || !String(assemblyaiKey).trim()) {
      return res.status(400).json({ success: false, error: 'AssemblyAI key is required' });
    }
    const list = Array.isArray(providers) ? providers : [];
    const valid = list.filter((p) => p && p.name && p.key && Array.isArray(p.useFor) && p.useFor.length);
    if (valid.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Add at least one provider with a key and at least one mode',
      });
    }

    const providerKeys = {};
    const providerPreferences = {};
    for (const p of valid) {
      const name = String(p.name).toLowerCase();
      providerKeys[name] = String(p.key).trim();
      for (const mode of p.useFor) {
        providerPreferences[mode] = name;
      }
    }

    const plan = {
      status: 'active',
      tier: 'L1',
      assemblyaiKey: String(assemblyaiKey).trim(),
      providerKeys,
      providerPreferences,
      termsAcceptedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
    };
    savePlan(req.user.id, plan);
    res.json(planResponse(plan));
  } catch (err) {
    console.error('activate-l1', err);
    res.status(500).json({ success: false, error: 'Activation failed' });
  }
});

router.patch('/providers', authRequired, (req, res) => {
  const plan = getPlan(req.user.id);
  if (!plan || plan.status !== 'active') {
    return res.status(400).json({ success: false, error: 'No active plan' });
  }
  const { mode, provider } = req.body || {};
  if (!mode || !provider) {
    return res.status(400).json({ success: false, error: 'mode and provider required' });
  }
  if (!plan.providerKeys[provider]) {
    return res.status(400).json({ success: false, error: 'Provider key not configured' });
  }
  plan.providerPreferences = plan.providerPreferences || {};
  plan.providerPreferences[mode] = provider;
  savePlan(req.user.id, plan);
  res.json({ success: true, providerPreferences: plan.providerPreferences });
});

router.patch('/keys', authRequired, (req, res) => {
  const plan = getPlan(req.user.id);
  if (!plan || plan.status !== 'active') {
    return res.status(400).json({ success: false, error: 'No active plan' });
  }
  const { provider, key } = req.body || {};
  if (!provider || !key) {
    return res.status(400).json({ success: false, error: 'provider and key required' });
  }
  plan.providerKeys = plan.providerKeys || {};
  plan.providerKeys[String(provider).toLowerCase()] = String(key).trim();
  savePlan(req.user.id, plan);
  res.json({ success: true });
});

router.getPlan = getPlan;
module.exports = router;
module.exports.getPlan = getPlan;
