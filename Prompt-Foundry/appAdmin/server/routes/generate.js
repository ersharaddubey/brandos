import express from 'express';
import multer from 'multer';
import ImageKit from 'imagekit';
import GeneratedImage from '../models/GeneratedImage.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed')) });
const FREE_MODE_ENABLED = String(process.env.FREE_TESTING_MODE || 'false').toLowerCase() === 'true';
const TEST_USER_EMAIL = String(process.env.TEST_USER_EMAIL || 'textuser@gmail.com').trim().toLowerCase();
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});
function isFreeTestUser(user) {
  return FREE_MODE_ENABLED && Boolean(TEST_USER_EMAIL) &&
    String(user?.email || '').toLowerCase() === TEST_USER_EMAIL;
}
const CF_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';

function dimensions(ratio) {
  return ({ '1:1': [1024,1024], '3:4': [768,1024], '4:3': [1024,768], '9:16': [576,1024], '16:9': [1024,576] })[ratio] || [768,1024];
}
async function cloudflareGenerate(prompt, ratio) {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Cloudflare Workers AI is not configured on the server');
  const [width, height] = dimensions(ratio);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${CF_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, steps: 4 }),
  });
  const type = response.headers.get('content-type') || '';
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare AI error (${response.status}): ${body.slice(0, 500)}`);
  }
  if (type.includes('application/json')) {
    const data = await response.json();
    if (data?.success === false) throw new Error(data.errors?.[0]?.message || 'Cloudflare generation failed');
    const b64 = data?.result?.image || data?.image;
    if (b64) return Buffer.from(b64, 'base64');
  }
  return Buffer.from(await response.arrayBuffer());
}
async function uploadToImageKit(buffer) {
  if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit is not configured. Add IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT to the backend environment.');
  }
  const safeName = `pf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
  const uploaded = await imagekit.upload({
    file: buffer,
    fileName: safeName,
    folder: '/prompt-foundry/generations',
    useUniqueFileName: true,
    tags: ['prompt-foundry', 'ai-generated'],
  });
  if (!uploaded?.url) throw new Error('ImageKit did not return an image URL');
  return uploaded;
}

router.get('/provider-status', protect, async (req, res) => {
  res.json({ provider: 'Cloudflare Workers AI', model: CF_MODEL, configured: Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID), freeTestingMode: FREE_MODE_ENABLED, storageProvider: 'ImageKit',
    storageConfigured: Boolean(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT),
    testUserEmail: FREE_MODE_ENABLED ? TEST_USER_EMAIL : null });
});

router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const prompt = String(req.body.prompt || '').trim();
    const ratio = req.body.ratio || '3:4';
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });
    if (prompt.length > 2048) return res.status(400).json({ message: 'Prompt must be 2048 characters or less' });
    if (req.file) return res.status(400).json({ message: 'Text-to-image is enabled. Reference-image generation is not supported by this FLUX model yet.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const freeMode = isFreeTestUser(user);
    const cost = Math.max(1, Math.min(10, Number.parseInt(req.body.amount, 10) || 2));
    if (!freeMode) {
      const total = (user.dailyCredits || 0) + (user.credits || 0);
      if (total < cost) return res.status(400).json({ message: 'Not enough credits' });
    }

    const imageBuffer = await cloudflareGenerate(prompt, ratio);
    if (!imageBuffer.length) throw new Error('Cloudflare returned an empty image');
    const uploaded = await uploadToImageKit(imageBuffer);
    const imageUrl = uploaded.url;

    if (!freeMode) {
      const fromDaily = Math.min(user.dailyCredits || 0, cost);
      user.dailyCredits = (user.dailyCredits || 0) - fromDaily;
      user.credits = (user.credits || 0) - (cost - fromDaily);
      await user.save();
    }

    let record = null;
    {
      const crypto = await import('crypto');
      const promptHash = crypto.createHash('sha256').update(`${prompt.toLowerCase()}|${CF_MODEL}|${ratio}`).digest('hex');
      record = await GeneratedImage.create({ promptHash, promptText: prompt, imageUrl, model: CF_MODEL, ratio, user: req.user._id });
    }
    res.json({ success: true, imageUrl, prompt, model: CF_MODEL, ratio, freeMode, credits: { credits: user.credits, dailyCredits: user.dailyCredits }, id: record?._id || null, message: 'Image generated successfully' });
  } catch (error) {
    console.error('Cloudflare image generation error:', error);
    res.status(502).json({ message: error.message || 'Image generation failed' });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const images = await GeneratedImage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(images);
  } catch (error) { res.status(500).json({ message: error.message }); }
});
export default router;
