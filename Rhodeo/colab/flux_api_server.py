"""
Prompt Gallery - Colab Flux API adapter

Use this after your Flux pipeline (`pipe`) is already loaded in Colab.
The Prompt Gallery backend calls exactly:
    GET /generate?prompt=...

The adapter returns a raw PNG, so the web app can consume it directly.
"""

from io import BytesIO

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from PIL import Image

app = FastAPI(title="Prompt Gallery Flux API", version="2.0")


def generate_with_loaded_pipeline(prompt: str) -> Image.Image:
    """Use the Flux pipeline already loaded as global `pipe`."""
    try:
        pipe_obj = globals()["pipe"]
    except KeyError as exc:
        raise RuntimeError(
            "Flux pipeline `pipe` is not loaded. Load Flux first, then run this API cell."
        ) from exc

    result = pipe_obj(
        prompt=prompt,
        num_inference_steps=28,
        guidance_scale=3.5,
    )

    image = result.images[0]
    if not isinstance(image, Image.Image):
        image = Image.fromarray(image)
    return image.convert("RGB")


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Prompt Gallery Flux API",
        "endpoint": "/generate",
        "method": "GET",
    }


@app.get("/generate")
def generate(prompt: str = Query(..., min_length=1, max_length=12000)):
    try:
        print("[Flux] prompt:", prompt[:300])
        image = generate_with_loaded_pipeline(prompt)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return Response(content=buffer.getvalue(), media_type="image/png")
    except Exception as exc:
        print("[Flux] error:", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# In Colab, install once if required:
# !pip -q install fastapi uvicorn pyngrok pillow
# Then run:
# from pyngrok import ngrok
# public_url = ngrok.connect(8000)
# print("PUBLIC URL:", public_url)
# print("FLUX_API_URL=", public_url)
# import uvicorn
# uvicorn.run(app, host="0.0.0.0", port=8000)
