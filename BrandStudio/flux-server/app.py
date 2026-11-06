"""FLUX.1 Kontext wrapper - reference-image based generation (face / mug / logo / room reference se aate hain).

Run:
  huggingface-cli login            # FLUX.1-Kontext-dev gated model hai, license accept karna padta hai
  pip install -r requirements.txt
  uvicorn app:app --port 8000
server/.env:
  GENERATOR_PROVIDER=http
  GENERATOR_URL=http://127.0.0.1:8000/generate
  FACE_CHECK_URL=http://127.0.0.1:8000/face-similarity      (optional)

Notes
- Kontext ek reference image leta hai: server/ pehli reference (character) bhejta hai, baaki ignore hoti hain.
  Isliye character ki reference photo me hi person + props + room hona chahiye.
- Freeform (no reference): neutral gray canvas banakar Kontext ko diya jata hai taaki text-only prompt se bhi image bane.
- FLUX.1-Kontext-dev non-commercial license par hai. Commercial ke liye BFL ki commercial license / API chahiye.
- Model bada hai (~12B): CUDA 24GB+ (cpu offload ke saath) ya bahut zyada unified memory chahiye. Test nahi kiya gaya.
"""
import base64
import io
import os

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from PIL import Image
from pydantic import BaseModel

from diffusers import FluxKontextPipeline

MODEL_ID = os.getenv("FLUX_MODEL", "black-forest-labs/FLUX.1-Kontext-dev")
STEPS = int(os.getenv("FLUX_STEPS", "28"))
GUIDANCE = float(os.getenv("FLUX_GUIDANCE", "2.5"))

device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
pipe = FluxKontextPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
if device == "cuda" and os.getenv("FLUX_OFFLOAD", "1") == "1":
    pipe.enable_model_cpu_offload()
else:
    pipe.to(device)

app = FastAPI()


def _strip(b64: str) -> str:
    return b64.split(",", 1)[1] if b64.startswith("data:") else b64


def _load(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(_strip(b64)))).convert("RGB")


def _fit(img: Image.Image, width: int, height: int) -> Image.Image:
    """Reference ka aspect ratio rakho, area ~ width*height, sides multiple of 16."""
    scale = ((width * height) / (img.width * img.height)) ** 0.5
    w = max(256, int(img.width * scale) // 16 * 16)
    h = max(256, int(img.height * scale) // 16 * 16)
    return img.resize((w, h), Image.LANCZOS)


def _neutral_canvas(width: int, height: int) -> Image.Image:
    """Freeform (no reference) ke liye neutral gray canvas — Kontext ko image chahiye."""
    w = max(256, (width // 16) * 16)
    h = max(256, (height // 16) * 16)
    return Image.new("RGB", (w, h), color=(128, 128, 128))


class Req(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024
    seed: int | None = None
    reference_image: str | None = None
    reference_images: list[str] | None = None


@app.post("/generate")
def generate(r: Req):
    refs = r.reference_images or ([r.reference_image] if r.reference_image else [])
    refs = [x for x in refs if x]  # drop null/empty
    if refs:
        ref = _fit(_load(refs[0]), r.width, r.height)
    else:
        # Freeform Prompt → Image: no identity reference — use neutral canvas
        ref = _neutral_canvas(r.width, r.height)
    gen = torch.Generator("cpu").manual_seed(r.seed) if r.seed is not None else None
    img = pipe(
        image=ref,
        prompt=r.prompt,
        width=ref.width,
        height=ref.height,
        guidance_scale=GUIDANCE,
        num_inference_steps=STEPS,
        max_sequence_length=512,
        generator=gen,
    ).images[0]
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


# ---------- optional: face similarity (InsightFace / ArcFace) ----------
try:
    import cv2
    import numpy as np
    from insightface.app import FaceAnalysis

    _fa = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    _fa.prepare(ctx_id=-1, det_size=(640, 640))
except Exception as e:  # insightface optional
    _fa = None
    print("face-similarity disabled:", e)


class FaceReq(BaseModel):
    a: str
    b: str


def _embed(b64: str):
    arr = np.frombuffer(base64.b64decode(_strip(b64)), np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    faces = _fa.get(img) if img is not None else []
    if not faces:
        return None
    biggest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return biggest.normed_embedding


@app.post("/face-similarity")
def face_similarity(r: FaceReq):
    if _fa is None:
        raise HTTPException(503, "insightface not installed")
    ea, eb = _embed(r.a), _embed(r.b)
    if ea is None or eb is None:
        return {"similarity": None, "reason": "face not found in one of the images"}
    return {"similarity": float(np.dot(ea, eb))}
