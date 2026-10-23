import { fal } from "@fal-ai/client";
import Replicate from "replicate";
import OpenAI from "openai";
import ImageKit from "imagekit";
import { Buffer } from "buffer";

// ============================================
// ImageKit Setup
// ============================================
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// ============================================
// Key Manager
// ============================================
class KeyManager {
  constructor() {
    this.keys = {
      fal: this.parseKeys(process.env.FAL_KEYS),
      replicate: this.parseKeys(process.env.REPLICATE_TOKENS),
      stability: this.parseKeys(process.env.STABILITY_KEYS),
      ideogram: this.parseKeys(process.env.IDEOGRAM_KEYS),
      openai: this.parseKeys(process.env.OPENAI_KEYS),
      together: this.parseKeys(process.env.TOGETHER_KEYS),
    };
    this.exhausted = new Map();
  }

  parseKeys(str = "") {
    return str.split(",").map((k) => k.trim()).filter(Boolean);
  }

  getAvailableKeys(provider) {
    const all = this.keys[provider] || [];
    const now = Date.now();
    return all.filter((key) => {
      const until = this.exhausted.get(`${provider}:${key}`);
      return !until || until < now;
    });
  }

  markExhausted(provider, key, minutes = 90) {
    const until = Date.now() + minutes * 60 * 1000;
    this.exhausted.set(`${provider}:${key}`, until);
    console.warn(`[KeyManager] ${provider} key exhausted for ${minutes} min`);
  }

  resetAll() {
    this.exhausted.clear();
  }
}

const keyManager = new KeyManager();

// ============================================
// Helper: Upload to ImageKit
// ============================================
async function uploadToImageKit(imageUrlOrBase64, fileName = "generated") {
  try {
    let file;

    // Agar base64 hai
    if (imageUrlOrBase64.startsWith("data:image")) {
      file = imageUrlOrBase64;
    } else {
      // Remote URL se download karke upload
      const response = await fetch(imageUrlOrBase64);
      const arrayBuffer = await response.arrayBuffer();
      file = Buffer.from(arrayBuffer);
    }

    const result = await imagekit.upload({
      file,
      fileName: `${fileName}-${Date.now()}.png`,
      folder: "/rhodeo/generated",
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      thumbnail: result.thumbnailUrl,
    };
  } catch (err) {
    console.error("ImageKit upload failed:", err.message);
    // Agar ImageKit fail ho jaye to original URL return kar do
    return { url: imageUrlOrBase64 };
  }
}

// ============================================
// Provider Functions
// ============================================

async function generateWithFal(prompt, options = {}, key) {
  fal.config({ credentials: key });

  const result = await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt,
      image_size: options.size || "square_hd",
      num_inference_steps: options.steps || 4,
    },
  });

  const url = result.images?.[0]?.url || result.data?.images?.[0]?.url;
  if (!url) throw new Error("No image from Fal");
  return { provider: "fal", url };
}

async function generateWithReplicate(prompt, options = {}, token) {
  const replicate = new Replicate({ auth: token });

  const output = await replicate.run("black-forest-labs/flux-schnell", {
    input: { prompt, num_outputs: 1 },
  });

  const url = Array.isArray(output) ? output[0] : output;
  if (!url) throw new Error("No image from Replicate");
  return { provider: "replicate", url };
}

async function generateWithStability(prompt, options = {}, key) {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("output_format", "png");

  const response = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/core",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Stability ${response.status}`);
  }

  const data = await response.json();
  const base64 = data.image || data.artifacts?.[0]?.base64;
  if (!base64) throw new Error("No image from Stability");

  return {
    provider: "stability",
    url: `data:image/png;base64,${base64}`,
  };
}

async function generateWithIdeogram(prompt, options = {}, key) {
  const response = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: {
      "Api-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_1_1",
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Ideogram ${response.status}`);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("No image from Ideogram");
  return { provider: "ideogram", url };
}

async function generateWithOpenAI(prompt, options = {}, key) {
  const openai = new OpenAI({ apiKey: key });

  const result = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
  });

  const url = result.data[0]?.url;
  if (!url) throw new Error("No image from OpenAI");
  return { provider: "openai", url };
}

async function generateWithTogether(prompt, options = {}, key) {
  const response = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt,
      width: 1024,
      height: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Together ${response.status}`);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("No image from Together");
  return { provider: "together", url };
}

// ============================================
// Main Function
// ============================================

const PROVIDER_FNS = {
  fal: generateWithFal,
  replicate: generateWithReplicate,
  stability: generateWithStability,
  ideogram: generateWithIdeogram,
  openai: generateWithOpenAI,
  together: generateWithTogether,
};

export async function generateImage(prompt, options = {}) {
  if (!prompt) throw new Error("Prompt is required");

  const order = (
    process.env.IMAGE_PROVIDER_ORDER ||
    "fal,replicate,stability,ideogram,openai,together"
  )
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const errors = [];

  for (const provider of order) {
    const keys = keyManager.getAvailableKeys(provider);
    if (keys.length === 0) continue;

    for (const key of keys) {
      try {
        console.log(`[Image] Trying → ${provider}`);
        const result = await PROVIDER_FNS[provider](prompt, options, key);

        if (result?.url) {
          // ImageKit pe upload karo
          console.log(`[Image] Uploading to ImageKit...`);
          const uploaded = await uploadToImageKit(result.url, "rhodeo");

          console.log(`[Image] ✅ Success with ${provider} + ImageKit`);
          return {
            provider: result.provider,
            url: uploaded.url,           // ImageKit permanent URL
            fileId: uploaded.fileId,
            thumbnail: uploaded.thumbnail,
            originalProviderUrl: result.url,
          };
        }
      } catch (err) {
        const msg = err.message || String(err);
        console.warn(`[Image] ❌ ${provider}:`, msg);
        errors.push(`${provider}: ${msg}`);

        if (/rate limit|quota|429|insufficient|billing|limit exceeded|credits/i.test(msg)) {
          keyManager.markExhausted(provider, key, 90);
        }
      }
    }
  }

  throw new Error(`All providers exhausted.\n${errors.join("\n")}`);
}

export function resetImageKeys() {
  keyManager.resetAll();
}