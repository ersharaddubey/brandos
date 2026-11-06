import express from "express";
import { generateImage, resetImageKeys } from "../services/imageService.js";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const { prompt, size, steps } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: "prompt is required" });
    }

    const result = await generateImage(prompt, { size, steps });

    res.json({
      success: true,
      provider: result.provider,
      url: result.url,
    });
  } catch (error) {
    console.error("Image generation error:", error.message);
    res.status(429).json({
      success: false,
      message: error.message,
    });
  }
});

// Optional: manually reset exhausted keys
router.post("/reset-keys", (req, res) => {
  resetImageKeys();
  res.json({ success: true, message: "All image keys reset" });
});

export default router;