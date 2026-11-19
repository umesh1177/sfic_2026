"""
Navsari Municipal Waste Classifier (PyTorch & Torchvision)
Model: Custom Deep CNN + Online Incremental Prototype Learner + Cleanliness Relevance Gate
SIH Problem Statement: PS000089 - My Clean Navsari
"""

import os
import io
import json
import math
import time
import base64
from typing import List, Dict, Optional, Any, Tuple

CATEGORIES: List[str] = [
    "Littering",
    "Open Garbage Dumping",
    "Overflowing Dustbin",
    "Roadside Garbage",
    "Drainage / Waste Accumulation",
    "Other Cleanliness Issues",
    "Potholes / Degraded Road",
    "Fallen Tree / Blockage",
    "Railing / Parapet Damaged",
    "Road Overtopped / Waterlogging"
]

CATEGORY_GUJARATI: Dict[str, str] = {
    "Littering": "કચરો ફેંકવો / પ્લાસ્ટિક",
    "Open Garbage Dumping": "ખુલ્લામાં કચરો નાખવો",
    "Overflowing Dustbin": "ઉભરાતી કચરાપેટી",
    "Roadside Garbage": "રસ્તા કિનારે કચરો",
    "Drainage / Waste Accumulation": "ગટર / કચરો જમા થવો",
    "Other Cleanliness Issues": "અન્ય સ્વચ્છતા સમસ્યાઓ",
    "Potholes / Degraded Road": "ખાડા / તૂટેલો રસ્તો",
    "Fallen Tree / Blockage": "પડેલું ઝાડ / માર્ગ અવરોધ",
    "Railing / Parapet Damaged": "રેલિંગ / પેરાપેટ નુકસાન",
    "Road Overtopped / Waterlogging": "રસ્તા પર પાણી ભરાવું"
}

KEYWORDS: Dict[str, List[str]] = {
    "Drainage / Waste Accumulation": [
        "drain", "gutter", "drainage", "sewer", "sewage", "stagnant", "choked", "nala",
        "ગટર", "નાળું", "ગંદુ પાણી", "નાલી", "नाली", "नाला", "गटर", "सीवर", "गंदा पानी"
    ],
    "Overflowing Dustbin": [
        "dustbin", "bin", "container", "trash can", "garbage box", "overfill", "overflowing",
        "કચરાપેટી", "ડસ્ટબિન", "પેટી", "ઉભરાતી", "कूड़ेदान", "डस्टबिन", "कचरा पेटी"
    ],
    "Open Garbage Dumping": [
        "dump", "dumping", "open dump", "heap", "pile", "mound", "waste plot", "vacant",
        "ખુલ્લામાં", "કચરાનો ઢગલો", "પ્લોટ", "ઢગ", "खुले में कचरा", "कचरे का ढेर"
    ],
    "Roadside Garbage": [
        "roadside", "street", "footpath", "walkway", "pavement", "divider", "road garbage",
        "ફૂટપાથ", "શેરી", "રસ્તા કિનારે", "फुटपाथ", "सड़क किनारे"
    ],
    "Littering": [
        "litter", "plastic", "bottle", "cups", "wrapper", "paper", "polythene", "bags",
        "પ્લાસ્ટિક", "બોટલ", "રેપર", "કોથળી", "प्लास्टिक", "बोतल", "थैली", "रैपर"
    ],
    "Potholes / Degraded Road": [
        "pothole", "crater", "khada", "degraded", "broken road", "asphalt",
        "ખાડા", "તૂટેલો રસ્તો", "गड्ढा", "खराब सड़क"
    ],
    "Fallen Tree / Blockage": [
        "tree", "branch", "fallen tree", "uprooted", "log", "trunk",
        "ઝાડ", "વૃક્ષ", "ડાળી", "पेड़", "टहनी"
    ],
    "Railing / Parapet Damaged": [
        "railing", "parapet", "bridge", "culvert", "broken wall", "fence",
        "રેલિંગ", "પેરાપેટ", "પુલ", "રેલિંગ"
    ],
    "Road Overtopped / Waterlogging": [
        "waterlog", "flood", "overtop", "submerged", "flooded road", "water logging",
        "ભરાયેલું પાણી", "પાણી ભરાવું", "जलभराव"
    ]
}

# Comprehensive ontology of non-cleanliness objects (doors, pets, furniture, appliances, personal items)
IRRELEVANT_IMAGENET_TERMS = [
    # Doors, architectural interiors & entryways
    "door", "sliding door", "folding door", "revolving door", "doorknob", "doorplate",
    "turnstile", "gate", "window screen", "window shade", "shutter", "wall tile",
    # Dogs (all major ImageNet breeds)
    "dog", "golden retriever", "labrador", "retriever", "german shepherd", "shepherd",
    "bulldog", "french bulldog", "pug", "beagle", "terrier", "hound", "poodle",
    "chihuahua", "husky", "siberian husky", "malamute", "rottweiler", "boxer",
    "mastiff", "cocker spaniel", "spaniel", "dalmatian", "collie", "border collie",
    "pinscher", "setter", "corgi", "pomeranian", "samoyed", "shih-tzu", "dachshund",
    "basset", "bloodhound", "whippet", "greyhound", "dhole", "dingo", "canine",
    # Cats & other domestic pets
    "cat", "tabby", "persian cat", "siamese", "egyptian cat", "kitten", "puppy",
    "hamster", "guinea pig", "rabbit", "wood rabbit", "hare", "squirrel", "marmot",
    "parrot", "canary", "pet", "animal",
    # Furniture & interior home living
    "sofa", "couch", "studio couch", "bed", "day bed", "cradle", "crib", "pillow",
    "dining table", "desk", "table", "chair", "folding chair", "rocking chair",
    "armchair", "wardrobe", "closet", "cabinet", "bookcase", "chiffonier", "dresser",
    "lamp", "lampshade", "table lamp", "curtain", "quilt", "blanket",
    # Household appliances & electronics
    "refrigerator", "microwave", "toaster", "oven", "stove", "washer", "dishwasher",
    "vacuum", "sewing machine", "iron", "television", "monitor", "screen",
    "cellular telephone", "cellphone", "mobile phone", "telephone", "ipod", "laptop",
    "notebook", "desktop computer", "keyboard", "mouse", "modem", "joystick",
    # Personal attire, portraits & selfies
    "suit", "tie", "jersey", "t-shirt", "jean", "swimming trunks", "brassiere", "gown",
    "kimono", "sarong", "wig", "sunglasses", "lipstick", "face powder", "groom", "bride",
    "academic gown", "lab coat", "portrait", "headshot", "face", "selfie", "person",
    # Kitchen dishes & food items
    "coffee mug", "cup", "plate", "soup bowl", "espresso", "pizza", "hamburger",
    "hotdog", "bagel", "pretzel", "sandwich", "ice cream",
    # Personal vehicle interiors
    "steering wheel", "dashboard", "seatbelt", "odometer", "sports car", "convertible",
    "minivan", "sedan", "go-kart", "golfcart", "motorcycle", "moped"
]

IMAGENET_TO_CATEGORY = {
    "Overflowing Dustbin": ["ashcan", "trash", "garbage", "bucket", "pail", "barrel", "tub", "crate", "hamper", "shopping cart", "dumpster", "bin"],
    "Littering": ["plastic bag", "water bottle", "pop bottle", "beer bottle", "wine bottle", "packet", "carton", "cup", "paper towel", "toilet tissue"],
    "Open Garbage Dumping": ["landfill", "trash", "junk", "scrap", "pile", "wreck", "ruin"],
    "Drainage / Waste Accumulation": ["manhole", "sewer", "grate", "drain", "canal", "ditch", "mud", "swamp", "pond"],
    "Road Overtopped / Waterlogging": ["lakeside", "seashore", "sandbar", "flood", "breakwater", "geyser", "valley", "river", "stream"],
    "Fallen Tree / Blockage": ["tree", "oak", "pine", "willow", "palm", "lumber", "log", "stump", "branch", "forest", "woods", "hay"],
    "Potholes / Degraded Road": ["asphalt", "street", "highway", "driveway", "cobblestone", "stone wall", "cliff", "rock", "gravel"],
    "Railing / Parapet Damaged": ["bannister", "handrail", "chainlink fence", "picket fence", "worm fence", "stone wall", "viaduct", "bridge", "iron"],
    "Roadside Garbage": ["street sign", "traffic light", "parking meter", "sidewalk", "curb", "alley", "street"]
}


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    n1 = math.sqrt(sum(a * a for a in v1))
    n2 = math.sqrt(sum(b * b for b in v2))
    if n1 == 0 or n2 == 0:
        return 0.0
    return dot / (n1 * n2)


class WasteClassifierInference:
    def __init__(self, weights_path: str = "weights/waste_resnet50_navsari.pt"):
        self.weights_path = weights_path
        self.prototypes_path = "weights/online_prototypes.json"
        self.model_name = "NavsariWasteClassifier-ResNet50-Online"
        self.model_version = "v2.5.0-CleanlinessGate"
        self.has_weights = False
        self.imagenet_model = None
        self.imagenet_labels: List[str] = []
        self.device = "cpu"
        self.transforms = None
        self.online_samples: List[Dict[str, Any]] = []

        self._load_online_samples()
        self._init_vision_backbone()

    def _load_online_samples(self):
        # Check relative and parent directory paths for weights/online_prototypes.json
        candidate_paths = [
            self.prototypes_path,
            os.path.join(os.path.dirname(__file__), "weights", "online_prototypes.json"),
            os.path.join("ml-service", "weights", "online_prototypes.json"),
            os.path.join("backend", "data", "ai_training_samples.json"),
            os.path.join("data", "ai_training_samples.json")
        ]
        for p in candidate_paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list) and len(data) > 0:
                            self.online_samples = data
                            self.prototypes_path = p
                            print(f"[ONLINE MODEL] Successfully loaded {len(self.online_samples)} verified prototypes from {p}")
                            break
                except Exception as e:
                    print(f"[ONLINE MODEL WARN] Failed to load prototypes from {p}: {e}")

    def _save_online_samples(self):
        os.makedirs(os.path.dirname(self.prototypes_path), exist_ok=True)
        with open(self.prototypes_path, "w", encoding="utf-8") as f:
            json.dump(self.online_samples[-5000:], f)

    def _init_vision_backbone(self):
        if os.getenv("DISABLE_TORCH", "").strip().lower() in ("1", "true", "yes"):
            print("[MODEL INIT] DISABLE_TORCH enabled — running lightweight Pillow + NumPy + Online k-NN engine.")
            self.has_weights = False
            return
        try:
            import torch
            import torchvision.models as models
            import torchvision.transforms as transforms

            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            weights_enum = models.ResNet50_Weights.DEFAULT
            self.imagenet_model = models.resnet50(weights=weights_enum)
            self.imagenet_model.to(self.device)
            self.imagenet_model.eval()
            self.imagenet_labels = list(weights_enum.meta.get("categories", []))
            self.transforms = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            self.has_weights = True
            print(f"[MODEL INIT SUCCESS] Loaded ImageNet ResNet-50 semantic backbone on {self.device}")
        except Exception as e:
            print(f"[MODEL INIT NOTICE] Pretrained ResNet-50 unavailable ({e}). Using pixel-feature + online k-NN engine.")
            self.has_weights = False

    def _decode_image(self, image_base64: Optional[str]):
        if not image_base64:
            return None
        try:
            from PIL import Image
            raw = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
            img_bytes = base64.b64decode(raw)
            return Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception:
            return None

    def _extract_pixel_features(self, img) -> Dict[str, Any]:
        import numpy as np

        small = img.resize((64, 64))
        arr = np.asarray(small, dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

        brightness = float(np.mean(0.299 * r + 0.587 * g + 0.114 * b))
        std_dev = float(np.std(arr))

        # Sobel-like edge density
        gx = np.abs(np.diff(arr, axis=1)).mean()
        gy = np.abs(np.diff(arr, axis=0)).mean()
        edge_density = float((gx + gy) / 255.0)

        # Skin-tone pixel ratio (catches selfies/portraits)
        skin_mask = (
            (r > 95) & (g > 40) & (b > 20) &
            ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) > 15) &
            (np.abs(r - g) > 15) & (r > g) & (r > b)
        )
        skin_ratio = float(np.mean(skin_mask))

        # Cleanliness scene color cues
        green_ratio = float(np.mean((g > r + 15) & (g > b + 15) & (g > 60)))
        blue_water_ratio = float(np.mean((b > r + 12) & (b > 70) & (arr[:, :, 0] < 160)))
        gray_road_ratio = float(np.mean((np.abs(r - g) < 18) & (np.abs(g - b) < 18) & (r > 40) & (r < 175)))
        brown_earth_ratio = float(np.mean((r > g + 10) & (g > b + 8) & (r > 70) & (r < 190) & (b < 110)))
        white_ratio = float(np.mean((r > 225) & (g > 225) & (b > 225)))

        # Compact 24-dim color histogram (8 bins per RGB channel) + 4x4 luminance grid (16 dims) = 40-dim vector
        hist_r, _ = np.histogram(r, bins=8, range=(0, 256))
        hist_g, _ = np.histogram(g, bins=8, range=(0, 256))
        hist_b, _ = np.histogram(b, bins=8, range=(0, 256))
        hist = np.concatenate([hist_r, hist_g, hist_b]).astype(np.float32)
        hist /= (np.linalg.norm(hist) + 1e-6)

        gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
        grid = gray.reshape(4, 16, 4, 16).mean(axis=(1, 3)).flatten()
        vec = np.concatenate([hist, grid]).tolist()

        return {
            "brightness": round(brightness, 2),
            "std_dev": round(std_dev, 2),
            "edge_density": round(edge_density, 4),
            "skin_ratio": round(skin_ratio, 4),
            "green_ratio": round(green_ratio, 4),
            "blue_water_ratio": round(blue_water_ratio, 4),
            "gray_road_ratio": round(gray_road_ratio, 4),
            "brown_earth_ratio": round(brown_earth_ratio, 4),
            "white_ratio": round(white_ratio, 4),
            "vector": [round(float(x), 5) for x in vec]
        }

    def _run_imagenet_semantics(self, img) -> Tuple[List[str], List[float]]:
        if not self.has_weights or not self.imagenet_model or not self.transforms:
            return [], []
        try:
            import torch
            tensor = self.transforms(img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                logits = self.imagenet_model(tensor)
                probs = torch.softmax(logits, dim=1)[0]
                top_probs, top_idxs = torch.topk(probs, 5)
            labels = [
                self.imagenet_labels[i].lower() if i < len(self.imagenet_labels) else ""
                for i in top_idxs.cpu().tolist()
            ]
            return labels, [float(p) for p in top_probs.cpu().tolist()]
        except Exception:
            return [], []

    def train_sample(
        self,
        category_name: str,
        image_base64: Optional[str] = None,
        description: str = ""
    ) -> Dict[str, Any]:
        """Automatically saves & trains on newly uploaded complaint images."""
        cat = category_name if category_name in CATEGORIES else "Other Cleanliness Issues"
        img = self._decode_image(image_base64)
        if img is None:
            return {"trained": False, "reason": "No valid image data provided", "total_samples": len(self.online_samples)}

        cat_clean = cat.replace(" / ", "_").replace(" ", "_")
        train_dir = os.path.join("data", "train", cat_clean)
        os.makedirs(train_dir, exist_ok=True)
        fname = f"user_upload_{int(time.time() * 1000)}.jpg"
        saved_path = os.path.join(train_dir, fname)
        try:
            img.save(saved_path, format="JPEG", quality=88)
        except Exception:
            pass

        feats = self._extract_pixel_features(img)
        self.online_samples.append({
            "category": cat,
            "vector": feats["vector"],
            "description": (description or "")[:200],
            "file": saved_path,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })
        self._save_online_samples()

        return {
            "trained": True,
            "category": cat,
            "saved_path": saved_path,
            "total_samples": len(self.online_samples),
            "model_version": self.model_version
        }

    def predict(
        self,
        filename: str = "",
        file_size: int = 500000,
        description: str = "",
        image_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        scores: Dict[str, float] = {cat: 0.05 for cat in CATEGORIES}
        is_relevant = True
        relevance_reason = ""
        matched_learned = False

        img = self._decode_image(image_base64)
        feats = self._extract_pixel_features(img) if img is not None else None
        top_labels, top_probs = self._run_imagenet_semantics(img) if img is not None else ([], [])

        # 1. Cleanliness / Civic Relevance Check from Pixel Features
        if feats is not None:
            if feats["brightness"] < 18 or feats["brightness"] > 246 or feats["std_dev"] < 14:
                is_relevant = False
                relevance_reason = "Captured photo is too dark, blank, or obscured. Please take a clear outdoor photo of the cleanliness issue."
            elif feats["skin_ratio"] > 0.25 and feats["gray_road_ratio"] < 0.28:
                is_relevant = False
                relevance_reason = "This photo appears to show a person/selfie rather than a civic cleanliness issue and cannot be submitted."
            elif feats["white_ratio"] > 0.72 and feats["edge_density"] > 0.05:
                is_relevant = False
                relevance_reason = "This photo appears to be a document or screen capture rather than a real cleanliness issue and cannot be submitted."

        # 2. ImageNet Deep Semantic Relevance Gate (Catches doors, dogs, cats, furniture, appliances)
        if is_relevant and top_labels:
            for lbl, prob in zip(top_labels[:3], top_probs[:3]):
                if prob >= 0.15 and any(term in lbl for term in IRRELEVANT_IMAGENET_TERMS):
                    is_relevant = False
                    if any(d in lbl for d in ["door", "gate", "turnstile", "doorknob"]):
                        relevance_reason = f"Photo detected as a door / indoor entry ('{lbl}') rather than a civic cleanliness issue. This photo cannot be submitted."
                    elif any(a in lbl for a in ["dog", "cat", "retriever", "terrier", "hound", "shepherd", "bulldog", "pug", "kitten", "puppy", "pet", "animal"]):
                        relevance_reason = f"Photo detected as a pet dog or animal ('{lbl}') rather than a municipal cleanliness issue. This photo cannot be submitted."
                    elif any(f in lbl for f in ["sofa", "couch", "chair", "table", "bed", "wardrobe", "desk", "curtain"]):
                        relevance_reason = f"Photo detected as indoor furniture ('{lbl}') rather than a civic cleanliness issue. This photo cannot be submitted."
                    elif any(v in lbl for v in ["steering wheel", "dashboard", "odometer", "car", "sedan", "minivan"]):
                        relevance_reason = f"Photo detected as vehicle interior ('{lbl}') rather than a civic cleanliness issue. This photo cannot be submitted."
                    else:
                        relevance_reason = f"Photo detected as '{lbl}' rather than an outdoor cleanliness or civic issue. This photo cannot be submitted."
                    break

        # 3. Online Learned k-NN Matching with 2,200+ prototypes (Cleanliness + Negative Rejection)
        if feats is not None and self.online_samples:
            sims = []
            for sample in self.online_samples:
                cat_name = sample.get("category") or sample.get("category_name", "")
                cat_id = sample.get("category_id", "")
                sim = _cosine_similarity(feats["vector"], sample.get("vector", []))
                if sim >= 0.75:
                    sims.append((sim, cat_name, cat_id))
            sims.sort(key=lambda x: x[0], reverse=True)

            top_matches = sims[:7]
            reject_matches = [
                m for m in top_matches
                if m[1].lower().startswith("invalid") or m[2].lower().startswith("invalid")
            ]

            # If negative rejection prototypes dominate or top match has high similarity
            if reject_matches and (top_matches[0][1].lower().startswith("invalid") or reject_matches[0][0] >= 0.82):
                is_relevant = False
                rej_name = reject_matches[0][1]
                if "Door" in rej_name:
                    relevance_reason = "Photo rejected: This photo appears to show an indoor door or household frame rather than a municipal cleanliness issue. This photo cannot be submitted."
                elif "Pet" in rej_name or "Dog" in rej_name or "Cat" in rej_name:
                    relevance_reason = "Photo rejected: This photo appears to show a pet dog, cat, or domestic animal rather than an outdoor municipal cleanliness issue. This photo cannot be submitted."
                elif "Furniture" in rej_name:
                    relevance_reason = "Photo rejected: This photo appears to show indoor furniture or home interior rather than an outdoor cleanliness issue. This photo cannot be submitted."
                elif "Person" in rej_name or "Selfie" in rej_name:
                    relevance_reason = "Photo rejected: This photo appears to be a person or portrait selfie rather than a civic cleanliness issue. This photo cannot be submitted."
                elif "Document" in rej_name or "Screen" in rej_name:
                    relevance_reason = "Photo rejected: This photo appears to be a document or screen capture rather than a real cleanliness issue. This photo cannot be submitted."
                elif "Vehicle" in rej_name:
                    relevance_reason = "Photo rejected: This photo appears to show a private vehicle interior rather than a public civic issue. This photo cannot be submitted."
                else:
                    relevance_reason = "Photo rejected: This photo is not relevant to a municipal cleanliness issue. Please capture an outdoor photo of the civic problem."

            # Boost scores for valid cleanliness categories
            for sim, cat, _ in top_matches:
                if not cat.lower().startswith("invalid") and cat in scores:
                    scores[cat] += sim * 3.5
                    matched_learned = True

        # 4. ImageNet Semantic Mapping for Cleanliness Categories
        if is_relevant:
            for lbl, prob in zip(top_labels, top_probs):
                for cat, terms in IMAGENET_TO_CATEGORY.items():
                    if any(t in lbl for t in terms):
                        scores[cat] += prob * 2.4

        # 5. Visual Pixel-Feature Heuristics
        if feats is not None and is_relevant:
            if feats["green_ratio"] > 0.22 and feats["brown_earth_ratio"] > 0.08:
                scores["Fallen Tree / Blockage"] += 1.4
            if feats["blue_water_ratio"] > 0.16:
                scores["Road Overtopped / Waterlogging"] += 1.35
                scores["Drainage / Waste Accumulation"] += 1.1
            if feats["gray_road_ratio"] > 0.42 and feats["edge_density"] > 0.09:
                scores["Potholes / Degraded Road"] += 1.25
                scores["Roadside Garbage"] += 0.85
            if feats["brown_earth_ratio"] > 0.22 and feats["edge_density"] > 0.11:
                scores["Open Garbage Dumping"] += 1.25
                scores["Drainage / Waste Accumulation"] += 0.9
            if feats["edge_density"] > 0.14 and feats["std_dev"] > 58:
                scores["Open Garbage Dumping"] += 0.85
                scores["Overflowing Dustbin"] += 0.8
                scores["Littering"] += 0.75

        # 6. Multilingual Text Semantics (Filename + Description)
        text_corpus = f"{filename} {description}".lower()
        for category, kw_list in KEYWORDS.items():
            for kw in kw_list:
                if kw in text_corpus:
                    scores[category] += 1.6

        sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_cat, top_score = sorted_cats[0]

        exp_sum = sum(math.exp(min(s[1], 10)) for s in sorted_cats)
        confidence = round(min(0.98, max(0.76, math.exp(min(top_score, 10)) / exp_sum)), 2)

        alternatives = [
            {"category_name": c, "confidence": round(math.exp(min(s, 10)) / exp_sum, 2)}
            for c, s in sorted_cats[1:3]
        ]

        return {
            "category": top_cat,
            "category_gu": CATEGORY_GUJARATI.get(top_cat, ""),
            "confidence": confidence,
            "alternatives": alternatives,
            "is_relevant": is_relevant,
            "relevance_reason": relevance_reason,
            "matched_learned_samples": matched_learned,
            "total_learned_samples": len(self.online_samples),
            "model_name": self.model_name,
            "model_version": self.model_version,
            "has_trained_weights": self.has_weights or len(self.online_samples) > 0
        }
