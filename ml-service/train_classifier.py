"""
Fast & Efficient Training Script for Navsari Waste Classifier
Backbone: EfficientNet-B0 with Anti-Overfitting Regularization
SIH Problem Statement: PS000089 - My Clean Navsari
"""

import os
import sys
import time
import json
import random
import shutil
import argparse
from typing import List, Dict

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision.models as models
import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder
from PIL import Image, ImageDraw

from model import NavsariWasteNet, CIVIC_CATEGORIES
from preprocess import preprocess_cv_image


# ---------------------------------------------------------------------
# 1. AUTO-SPLIT & BOOTSTRAP DATASET GENERATOR
# ---------------------------------------------------------------------

def auto_split_dataset_if_needed(data_dir: str, val_ratio: float = 0.20):
    """
    Automatic Smart Train/Val Split:
      - If user dumps images in `data/train/<category>` or `data/dataset/<category>`,
        this automatically splits 80% into `train/` and 20% into `val/`.
      - If user already placed custom images in both `train/` and `val/`, their manual split is respected!
    """
    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "val")
    dataset_dir = os.path.join(data_dir, "dataset")

    # Case A: If user provided a single data/dataset/ directory
    if os.path.exists(dataset_dir) and os.path.isdir(dataset_dir):
        print("[DATA PREP] Detected single `data/dataset/` folder. Auto-splitting 80% train / 20% val...")
        for cat_folder in os.listdir(dataset_dir):
            src_cat_path = os.path.join(dataset_dir, cat_folder)
            if not os.path.isdir(src_cat_path):
                continue
            images = [f for f in os.listdir(src_cat_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
            if not images:
                continue
            random.seed(42)
            random.shuffle(images)
            split_idx = max(1, int(len(images) * (1.0 - val_ratio)))
            train_imgs = images[:split_idx]
            val_imgs = images[split_idx:]

            dst_train_cat = os.path.join(train_dir, cat_folder)
            dst_val_cat = os.path.join(val_dir, cat_folder)
            os.makedirs(dst_train_cat, exist_ok=True)
            os.makedirs(dst_val_cat, exist_ok=True)

            for img in train_imgs:
                shutil.copy2(os.path.join(src_cat_path, img), os.path.join(dst_train_cat, img))
            for img in val_imgs:
                shutil.copy2(os.path.join(src_cat_path, img), os.path.join(dst_val_cat, img))
        return

    # Case B: Traverse train_dir (including inside Invalid_Categories/) and split any leaf class folder
    if os.path.exists(train_dir):
        for dirpath, dirs, files in os.walk(train_dir):
            if dirpath == train_dir:
                continue
            # If this folder has subdirectories (e.g. Invalid_Categories has Clean_Not_Garbage etc.), don't split the wrapper
            if dirs:
                continue
            rel_path = os.path.relpath(dirpath, train_dir)
            cat_train_path = dirpath
            cat_val_path = os.path.join(val_dir, rel_path)
            train_files = [f for f in os.listdir(cat_train_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) and not f.startswith("bootstrap_")]
            val_files = [f for f in os.listdir(cat_val_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) and not f.startswith("bootstrap_")] if os.path.exists(cat_val_path) else []

            # If user provided real images in train but none in val, auto-split 20% to val!
            if len(train_files) >= 5 and len(val_files) == 0:
                print(f"[DATA PREP] Category '{rel_path}' has {len(train_files)} images in train with 0 in val. Auto-splitting 20% to val/...")
                os.makedirs(cat_val_path, exist_ok=True)
                for f in os.listdir(cat_val_path):
                    if f.startswith("bootstrap_"):
                        try: os.remove(os.path.join(cat_val_path, f))
                        except Exception: pass
                for f in os.listdir(cat_train_path):
                    if f.startswith("bootstrap_"):
                        try: os.remove(os.path.join(cat_train_path, f))
                        except Exception: pass

                random.seed(42)
                random.shuffle(train_files)
                num_val = max(1, int(len(train_files) * val_ratio))
                val_selected = train_files[:num_val]
                for vf in val_selected:
                    shutil.move(os.path.join(cat_train_path, vf), os.path.join(cat_val_path, vf))


def bootstrap_sample_dataset(data_dir: str):
    """
    Ensures data/train and data/val have sample images across all categories
    so training can be verified immediately even before the user provides the final dataset.
    """
    palette = {
        "Overflowing_Dustbin": ((80, 120, 90), "DUSTBIN\nOVERFLOW"),
        "Open_Garbage_Dumping": ((140, 100, 70), "OPEN DUMP\nHEAP"),
        "Roadside_Garbage": ((110, 110, 115), "ROADSIDE\nKERB LITTER"),
        "Littering": ((160, 140, 90), "PLASTIC\nBOTTLE LITTER"),
        "Drainage_Waste_Accumulation": ((40, 75, 95), "CHOKED DRAIN\nSEWAGE"),
        "Clean_Not_Garbage": ((70, 160, 80), "CLEAN STREET\nNO LITTER"),
        "Garbage_Sketch": ((200, 200, 200), "SKETCH / DRAWING\nNOT REAL PHOTO"),
        "Non_Overflowed_Dustbin": ((90, 110, 130), "NORMAL BIN\nNOT OVERFLOWED")
    }

    for split, count in [("train", 12), ("val", 4)]:
        split_dir = os.path.join(data_dir, split)
        os.makedirs(split_dir, exist_ok=True)
        for cat in CIVIC_CATEGORIES:
            cat_clean = cat.replace(" / ", "_").replace("-", "_").replace(" ", "_")
            if cat in ["Clean / Not Garbage", "Garbage Sketch / Drawing", "Non-Overflowed Dustbin"]:
                cat_folder = os.path.join(split_dir, "Invalid_Categories", cat_clean)
            else:
                cat_folder = os.path.join(split_dir, cat_clean)
            os.makedirs(cat_folder, exist_ok=True)

            existing = [f for f in os.listdir(cat_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            if len(existing) == 0:
                base_color, label = palette.get(cat_clean, ((100, 100, 100), cat))
                for i in range(count):
                    r = min(255, max(0, base_color[0] + (i * 7) % 40 - 20))
                    g = min(255, max(0, base_color[1] + (i * 9) % 40 - 20))
                    b = min(255, max(0, base_color[2] + (i * 11) % 40 - 20))
                    img = Image.new("RGB", (256, 256), color=(r, g, b))
                    draw = ImageDraw.Draw(img)
                    for k in range(5):
                        draw.rectangle([20 + k*10, 30 + k*15, 230 - k*8, 220 - k*12], outline=(255, 255, 255), width=2)
                    draw.text((30, 110), f"{label}\nSample #{i+1}", fill=(255, 255, 255))
                    img.save(os.path.join(cat_folder, f"bootstrap_{i+1}.jpg"), quality=90)


# ---------------------------------------------------------------------
# 2. DATA AUGMENTATION PIPELINE (Anti-Overfitting & Label Mapping)
# ---------------------------------------------------------------------

def get_civic_category_index(folder_name: str) -> int:
    """Strict canonical mapping between directory folder name and CIVIC_CATEGORIES index."""
    clean_name = folder_name.replace("_", " ").lower().strip()
    mappings = {
        "overflowing dustbin": "Overflowing Dustbin",
        "open garbage dumping": "Open Garbage Dumping",
        "roadside garbage": "Roadside Garbage",
        "littering": "Littering",
        "drainage waste accumulation": "Drainage / Waste Accumulation",
        "clean not garbage": "Clean / Not Garbage",
        "garbage sketch": "Garbage Sketch / Drawing",
        "sketch": "Garbage Sketch / Drawing",
        "drawing": "Garbage Sketch / Drawing",
        "non overflowed dustbin": "Non-Overflowed Dustbin",
        "non-overflowed dustbin": "Non-Overflowed Dustbin",
        "normal dustbin": "Non-Overflowed Dustbin"
    }
    for k, v in mappings.items():
        if k in clean_name or clean_name in k:
            if v in CIVIC_CATEGORIES:
                return CIVIC_CATEGORIES.index(v)

    for idx, cat in enumerate(CIVIC_CATEGORIES):
        c_clean = cat.replace(" / ", " ").replace("-", " ").replace(" ", "").lower()
        if c_clean in clean_name.replace(" ", "") or clean_name.replace(" ", "") in c_clean:
            return idx
    for idx, cat in enumerate(CIVIC_CATEGORIES):
        folder_clean = cat.replace(" / ", "_").replace("-", "_").replace(" ", "_").lower()
        if folder_name.lower() == folder_clean:
            return idx
    raise ValueError(f"Unknown folder '{folder_name}' not in CIVIC_CATEGORIES: {CIVIC_CATEGORIES}")


class PreprocessedDataset(Dataset):
    """Recursively collects images from root, supporting nested folders like Invalid_Categories/."""
    def __init__(self, root: str, transform=None, is_training: bool = True):
        self.root = root
        self.transform = transform
        self.is_training = is_training
        self.samples = []

        valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
        class_tally = {c: 0 for c in CIVIC_CATEGORIES}

        for dirpath, dirs, filenames in os.walk(root):
            folder_name = os.path.basename(dirpath)
            # Skip root directory and wrapper group folders like Invalid_Categories
            if folder_name in (os.path.basename(root), "Invalid_Categories", "invalid_categories", "Invalid"):
                continue

            try:
                civic_idx = get_civic_category_index(folder_name)
            except ValueError:
                continue

            for fname in filenames:
                ext = os.path.splitext(fname)[1].lower()
                if ext in valid_exts and not fname.startswith((".", "bootstrap_", "sample_")):
                    full_path = os.path.join(dirpath, fname)
                    self.samples.append((full_path, civic_idx))
                    class_tally[CIVIC_CATEGORIES[civic_idx]] += 1

        if is_training:
            print(f"[DATASET SCAN] Found {len(self.samples)} images across {len(CIVIC_CATEGORIES)} classes:")
            for cat, count in class_tally.items():
                print(f"  - {cat:30}: {count} images")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, target_label = self.samples[idx]
        with open(path, "rb") as f:
            img = Image.open(f).convert("RGB")

        # Apply CLAHE & Median filter to match inference pipeline
        img_prep = preprocess_cv_image(img, target_size=(224, 224), use_clahe=True, use_median=True)

        if self.transform:
            img_tensor = self.transform(img_prep)
        else:
            img_tensor = transforms.ToTensor()(img_prep)

        return img_tensor, target_label


# ---------------------------------------------------------------------
# 3. TRAINING LOOP WITH EARLY STOPPING & COSINE SCHEDULING
# ---------------------------------------------------------------------

def train_waste_model(
    data_dir: str = "data",
    output_weights: str = "weights/waste_efficientnet_navsari.pt",
    output_prototypes: str = "weights/online_prototypes.json",
    epochs: int = 10,
    batch_size: int = 8,
    lr: float = 0.0003,
    patience: int = 3
):
    print("=" * 70)
    print("  MY CLEAN NAVSARI - Fast EfficientNet-B0 Waste Classifier Training")
    print(f"  Target Classes ({len(CIVIC_CATEGORIES)}):")
    for i, c in enumerate(CIVIC_CATEGORIES):
        print(f"    [{i}] {c}")
    print("=" * 70)

    device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    print(f"[COMPUTE] Training on device: {device}")

    # Smart auto-split user dataset if provided in single folder
    auto_split_dataset_if_needed(data_dir)

    # Ensure dataset is ready
    bootstrap_sample_dataset(data_dir)

    train_path = os.path.join(data_dir, "train")
    val_path = os.path.join(data_dir, "val")

    # Anti-Overfitting Data Augmentation
    train_transforms = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.80, 1.0)),
        transforms.RandomRotation(degrees=15),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.20, contrast=0.20, saturation=0.20),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_ds = PreprocessedDataset(train_path, transform=train_transforms, is_training=True)
    val_ds = PreprocessedDataset(val_path, transform=val_transforms, is_training=False)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    print(f"[DATASET] Loaded {len(train_ds)} training images and {len(val_ds)} validation images.")

    # Compute balanced class weights for loss function
    class_counts = [0] * len(CIVIC_CATEGORIES)
    for _, civic_idx in train_ds.samples:
        class_counts[civic_idx] += 1

    total_samples = sum(class_counts)
    num_classes = len(CIVIC_CATEGORIES)
    class_weights = []
    for c in class_counts:
        w = total_samples / (num_classes * max(c, 1))
        w = max(0.4, min(3.0, w))
        class_weights.append(w)

    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"[CLASS BALANCING] Class sample distribution: {dict(zip(CIVIC_CATEGORIES, class_counts))}")
    print(f"[CLASS BALANCING] Computed loss weights: {[round(w, 2) for w in class_weights]}")

    # Instantiate model
    model = NavsariWasteNet(num_classes=len(CIVIC_CATEGORIES), pretrained=True)
    model.to(device)

    # Freeze lower backbone layers for the first 2 epochs for ultra-fast warmup, then unfreeze top layers
    for param in model.features.parameters():
        param.requires_grad = False

    # Label smoothing cross entropy with class weighting prevents overconfidence and balances categories
    criterion = nn.CrossEntropyLoss(weight=weights_tensor, label_smoothing=0.10)
    optimizer = optim.AdamW(model.classifier.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_loss = float("inf")
    best_weights = None
    epochs_no_improve = 0

    os.makedirs(os.path.dirname(output_weights), exist_ok=True)

    print("\n[TRAINING START] Beginning training with Early Stopping & Cosine LR Schedule...")
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        # Unfreeze top feature layers after 2 warmup epochs
        if epoch == 3:
            print("[INFO] Unfreezing top backbone layers for fine-tuning...")
            for param in model.features[-3:].parameters():
                param.requires_grad = True
            optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=lr * 0.5, weight_decay=1e-4)
            scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(1, epochs - 2), eta_min=1e-6)

        # Train step
        model.train()
        train_loss = 0.0
        train_correct = 0
        total_train = 0

        for b_idx, (images, labels) in enumerate(train_loader):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            logits, _ = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            preds = logits.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            total_train += images.size(0)

            if (b_idx + 1) % 30 == 0 or (b_idx + 1) == len(train_loader):
                batch_acc = (train_correct / max(total_train, 1)) * 100.0
                print(f"  [Epoch {epoch:02d}] Batch {b_idx + 1:03d}/{len(train_loader):03d} - Loss: {loss.item():.4f} - Acc: {batch_acc:.1f}%")

        scheduler.step()

        # Validation step
        model.eval()
        val_loss = 0.0
        val_correct = 0
        total_val = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                labels = labels.to(device)

                logits, _ = model(images)
                loss = criterion(logits, labels)

                val_loss += loss.item() * images.size(0)
                preds = logits.argmax(dim=1)
                val_correct += (preds == labels).sum().item()
                total_val += images.size(0)

        epoch_train_loss = train_loss / max(total_train, 1)
        epoch_train_acc = (train_correct / max(total_train, 1)) * 100.0
        epoch_val_loss = val_loss / max(total_val, 1)
        epoch_val_acc = (val_correct / max(total_val, 1)) * 100.0

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] "
            f"Train Loss: {epoch_train_loss:.4f} (Acc: {epoch_train_acc:.1f}%) | "
            f"Val Loss: {epoch_val_loss:.4f} (Acc: {epoch_val_acc:.1f}%)"
        )

        # Early Stopping check
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            best_weights = model.state_dict().copy()
            epochs_no_improve = 0
            torch.save(best_weights, output_weights)
            print(f"  --> Saved new best checkpoint to {output_weights}")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"[EARLY STOPPING] Validation loss stopped improving for {patience} epochs. Stopping early to prevent overfitting.")
                break

    # Restore best weights
    if best_weights is not None:
        model.load_state_dict(best_weights)
        print("[RESTORE] Restored best model weights from checkpoint.")

    # -----------------------------------------------------------------
    # 4. EXPORT INITIAL PROTOTYPE CENTROIDS FOR CONTINUAL ONLINE LEARNER
    # -----------------------------------------------------------------
    print("\n[PROTOTYPES] Computing normalized class centroids for continuous online learner...")
    model.eval()
    class_features: Dict[str, List[torch.Tensor]] = {c: [] for c in CIVIC_CATEGORIES}

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            _, feats = model(images)
            for feat, civic_idx in zip(feats, labels):
                idx_val = civic_idx.item() if hasattr(civic_idx, "item") else int(civic_idx)
                if 0 <= idx_val < len(CIVIC_CATEGORIES):
                    civic_cat = CIVIC_CATEGORIES[idx_val]
                    class_features[civic_cat].append(feat.cpu())

    prototypes = {}
    for cat, feat_list in class_features.items():
        if feat_list:
            stacked = torch.stack(feat_list)
            centroid = stacked.mean(dim=0)
            centroid = centroid / (centroid.norm(p=2) + 1e-6)
            prototypes[cat] = [round(float(x), 5) for x in centroid.tolist()]

    # Save to online_prototypes.json
    os.makedirs(os.path.dirname(output_prototypes), exist_ok=True)
    with open(output_prototypes, "w", encoding="utf-8") as f:
        json.dump({
            "prototypes": prototypes,
            "samples": [],
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }, f, indent=2)

    elapsed = time.time() - start_time
    print("=" * 70)
    print(f"  TRAINING COMPLETED IN {elapsed:.1f}s")
    print(f"  Model Weights Saved: {output_weights}")
    print(f"  Continual Prototypes Exported: {output_prototypes}")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Navsari Waste Classifier")
    parser.add_argument("--data_dir", type=str, default="data", help="Path to data directory")
    parser.add_argument("--epochs", type=int, default=8, help="Number of epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.0003, help="Learning rate")
    parser.add_argument("--patience", type=int, default=3, help="Early stopping patience")
    parser.add_argument("--output", type=str, default="weights/waste_efficientnet_navsari.pt", help="Output model path")
    args = parser.parse_args()

    train_waste_model(
        data_dir=args.data_dir,
        output_weights=args.output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience
    )
