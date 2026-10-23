import io, os
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from PIL import Image
import torch
from transformers import CLIPModel, CLIPProcessor

MODEL_ID = os.getenv('CLIP_MODEL_ID', 'openai/clip-vit-large-patch14')
DEVICE = 'mps' if torch.backends.mps.is_available() else ('cuda' if torch.cuda.is_available() else 'cpu')
app = FastAPI(title='Creative Identity Transformers Embeddings')
model = None
processor = None

def load():
    global model, processor
    if model is None:
        processor = CLIPProcessor.from_pretrained(MODEL_ID)
        model = CLIPModel.from_pretrained(MODEL_ID).to(DEVICE).eval()
    return model, processor

class TextRequest(BaseModel):
    text: str

@app.get('/health')
def health():
    return {'ok': True, 'model': MODEL_ID, 'loaded': model is not None, 'device': DEVICE, 'vector_size': 768}

@app.post('/embed/text')
def embed_text(body: TextRequest):
    if not body.text.strip(): raise HTTPException(400, 'text is required')
    m, p = load()
    inputs = p(text=[body.text], return_tensors='pt', padding=True, truncation=True).to(DEVICE)
    with torch.inference_mode(): vector = m.get_text_features(**inputs)[0]
    vector = torch.nn.functional.normalize(vector, dim=0).cpu().tolist()
    return {'model': MODEL_ID, 'vector': vector, 'dimension': len(vector)}

@app.post('/embed/image')
async def embed_image(file: UploadFile = File(...)):
    raw = await file.read()
    try: image = Image.open(io.BytesIO(raw)).convert('RGB')
    except Exception: raise HTTPException(400, 'invalid image')
    m, p = load()
    inputs = p(images=image, return_tensors='pt').to(DEVICE)
    with torch.inference_mode(): vector = m.get_image_features(**inputs)[0]
    vector = torch.nn.functional.normalize(vector, dim=0).cpu().tolist()
    return {'model': MODEL_ID, 'vector': vector, 'dimension': len(vector)}
