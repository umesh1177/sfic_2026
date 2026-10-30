"""
FastAPI Microservice for Navsari AI/ML Integrations
SIH Problem Statement: PS000089
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from model import WasteClassifierInference

app = FastAPI(
    title="My Clean Navsari - AI/ML Microservice",
    description="Waste image classification, content moderation and NLP service for Navsari Municipal Corporation",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

classifier = WasteClassifierInference()

class PredictRequest(BaseModel):
    filename: str
    file_size: Optional[int] = 500000

class ModerateRequest(BaseModel):
    text: str
    image_base64: Optional[str] = None

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "My Clean Navsari AI Engine",
        "has_gpu": False,
        "model_version": classifier.model_version
    }

@app.post("/predict")
def predict(req: PredictRequest):
    return classifier.predict(req.filename, req.file_size)

@app.post("/moderate")
def moderate(req: ModerateRequest):
    prohibited = ["abuse", "kill", "hate", "harass", "ગાળ", "ગાલી", "corrupt bastard"]
    lower = req.text.lower()
    for word in prohibited:
        if word in lower:
            return {
                "status": "UNSAFE",
                "is_safe": False,
                "reason": "Prohibited abusive or offensive terminology detected."
            }
    return {
        "status": "SAFE",
        "is_safe": True,
        "confidence": 0.98
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
