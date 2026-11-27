"""
FastAPI Microservice for Navsari AI/ML Integrations
SIH Problem Statement: PS000089 - My Clean Navsari
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from model import WasteClassifierInference

app = FastAPI(
    title="My Clean Navsari - AI/ML Microservice",
    description="Deep learning waste image classification, multi-lingual content moderation and civic NLP service for Navsari Municipal Corporation",
    version="1.3.0"
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
    filename: Optional[str] = "civic_issue.jpg"
    file_size: Optional[int] = 500000
    description: Optional[str] = ""
    image_base64: Optional[str] = None

class TrainSampleRequest(BaseModel):
    category_name: str
    image_base64: Optional[str] = None
    description: Optional[str] = ""

class AddCategoryRequest(BaseModel):
    category_name: str
    keywords: Optional[List[str]] = None

class ModerateRequest(BaseModel):
    text: str
    image_base64: Optional[str] = None

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "My Clean Navsari AI Engine",
        "health": "/health"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "My Clean Navsari AI Engine",
        "model_name": classifier.model_name,
        "model_version": classifier.model_version,
        "has_weights": classifier.has_weights
    }

@app.post("/predict")
def predict(req: PredictRequest):
    return classifier.predict(
        filename=req.filename or "issue.jpg",
        file_size=req.file_size or 500000,
        description=req.description or "",
        image_base64=req.image_base64
    )

@app.post("/train-sample")
def train_sample(req: TrainSampleRequest):
    return classifier.train_sample(
        category_name=req.category_name,
        image_base64=req.image_base64,
        description=req.description or ""
    )

@app.post("/add-category")
def add_category(req: AddCategoryRequest):
    return classifier.add_category(
        category_name=req.category_name,
        keywords=req.keywords
    )

@app.get("/categories")
def get_categories():
    from model import VALID_CIVIC_CATEGORIES, INVALID_CATEGORIES
    return {
        "civic_categories": VALID_CIVIC_CATEGORIES,
        "invalid_categories": list(INVALID_CATEGORIES.keys()),
        "total_categories": len(VALID_CIVIC_CATEGORIES)
    }

@app.post("/moderate")
def moderate(req: ModerateRequest):
    import re
    prohibited = [
        "fuck", "fucking", "fucker", "bitch", "bastard", "asshole", "shit", "bullshit", "dick", "pussy",
        "moron", "retard", "idiot", "kill you", "murder", "terrorist", "bomb", "corrupt bastard",
        "madarchod", "maderchod", "bhenchod", "behenchod", "bhosdike", "bhosdi", "bsdk",
        "chutiya", "chutiye", "gandu", "gaand", "harami", "haramkhor", "kamina", "kamine",
        "kutta", "kutte", "kutra", "saala", "sala", "randi", "raand", "lodu", "lauda", "lawda", "lavde",
        "jhant", "bhadwa", "bhadwe", "tatti", "bakwas", "pikina", "piki", "gadhe", "gadha", "gadheda", "gadhedo",
        "मादरचोद", "बहनचोद", "भोसड़ीके", "चूतिया", "गांडू", "हरामी", "कमीना", "कुत्ता", "कुत्ते", "गधे", "गधा", "साला", "रांड", "लौड़ा",
        "ગાળ", "હરામી", "કમીના", "કમીનો", "કુતરો", "કુતરા", "સાળો", "રાંડ", "ભોસડી", "લવડા", "ચુતિયા", "માદરચોદ", "બેનચોદ", "હરામખોર", "પીકી", "પીકીના", "ગધેડા", "ગધેડો", "ગધે"
    ]
    lower = req.text.lower()
    for word in prohibited:
        if len(word) <= 4:
            if re.search(r'(^|\b|\s|[^a-zA-Z0-9])' + re.escape(word) + r'($|\b|\s|[^a-zA-Z0-9])', lower):
                return {
                    "status": "UNSAFE",
                    "is_safe": False,
                    "reason": f"The description contains prohibited abusive or offensive language (\"{word}\"). Please describe the civic cleanliness issue constructively."
                }
        else:
            if word in lower:
                return {
                    "status": "UNSAFE",
                    "is_safe": False,
                    "reason": f"The description contains prohibited abusive or offensive language (\"{word}\"). Please describe the civic cleanliness issue constructively."
                }

    # Minimum detail check
    if len(req.text.strip()) > 0 and len(req.text.strip()) < 4:
        return {
            "status": "UNCERTAIN",
            "is_safe": True,
            "reason": "Description is very brief. Adding a little more context helps municipal workers find the spot faster."
        }

    return {
        "status": "SAFE",
        "is_safe": True,
        "confidence": 0.98
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=True)
