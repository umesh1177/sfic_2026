"""
Standalone PyTorch Training & Fine-Tuning Script for Navsari Waste Classifier
Model: Deep Convolutional Neural Network (ResNet-50 Backbone with Transfer Learning)
SIH Problem Statement: PS000089 - My Clean Navsari
"""

import os
import sys
import time
import argparse
from typing import List

CATEGORIES: List[str] = [
    "Littering",
    "Open Garbage Dumping",
    "Overflowing Dustbin",
    "Roadside Garbage",
    "Drainage / Waste Accumulation",
    "Other Cleanliness Issues"
]

def generate_sample_dataset_if_empty(dataset_dir: str):
    """
    Creates sample category directories and synthetic training images
    if no external dataset has been placed in dataset_dir.
    """
    from PIL import Image, ImageDraw

    os.makedirs(dataset_dir, exist_ok=True)
    for split in ["train", "val"]:
        split_dir = os.path.join(dataset_dir, split)
        for cat in CATEGORIES:
            cat_clean = cat.replace(" / ", "_").replace(" ", "_")
            cat_folder = os.path.join(split_dir, cat_clean)
            os.makedirs(cat_folder, exist_ok=True)

            # Generate synthetic samples if empty
            if len(os.listdir(cat_folder)) == 0:
                count = 8 if split == "train" else 3
                for i in range(count):
                    img = Image.new("RGB", (256, 256), color=(20 + i*15, 60 + i*10, 40 + i*20))
                    draw = ImageDraw.Draw(img)
                    draw.rectangle([20, 20, 236, 236], outline=(255, 255, 255), width=3)
                    draw.text((30, 110), f"{cat}\nSample {i+1}", fill=(240, 240, 240))
                    img.save(os.path.join(cat_folder, f"sample_{i+1}.jpg"))

def train_model(
    data_dir: str = "data",
    weights_output: str = "weights/waste_resnet50_navsari.pt",
    epochs: int = 5,
    batch_size: int = 4,
    learning_rate: float = 0.0003
):
    print("=" * 70)
    print("  MY CLEAN NAVSARI - PyTorch ResNet-50 Waste Classifier Training")
    print(f"  Target Classes ({len(CATEGORIES)}): {CATEGORIES}")
    print("=" * 70)

    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from torch.utils.data import DataLoader
        import torchvision.models as models
        import torchvision.transforms as transforms
        from torchvision.datasets import ImageFolder
    except ImportError as e:
        print(f"[ERROR] Required packages not found: {e}")
        print("Please install PyTorch & Torchvision: pip install torch torchvision pillow")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[DEVICE] Training on device: {device} (CUDA available: {torch.cuda.is_available()})")

    # Ensure dataset exists
    generate_sample_dataset_if_empty(data_dir)

    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "val")

    # Data Transforms & Augmentations
    train_transforms = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transforms = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_dataset = ImageFolder(train_dir, transform=train_transforms)
    val_dataset = ImageFolder(val_dir, transform=val_transforms)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    print(f"[DATASET] Loaded {len(train_dataset)} training images and {len(val_dataset)} validation images.")

    # Initialize ResNet-50
    print("[MODEL] Initializing ResNet-50 Backbone...")
    try:
        model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        print("  - Pretrained ImageNet weights loaded.")
    except Exception:
        print("  - Pretrained weights unavailable offline; initializing clean weights.")
        model = models.resnet50(weights=None)

    # Freeze base feature extractor layers for fast convergence
    for param in model.parameters():
        param.requires_grad = True

    # Replace classifier head for Navsari 6 waste classes
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(num_ftrs, len(CATEGORIES))
    )
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.5)

    print(f"\n[TRAINING] Starting {epochs} training epochs...")
    start_time = time.time()
    best_acc = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()

            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

        epoch_loss = running_loss / max(1, total)
        epoch_acc = (correct / max(1, total)) * 100

        # Validation Step
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += torch.sum(preds == labels.data).item()
                val_total += labels.size(0)

        val_epoch_loss = val_loss / max(1, val_total)
        val_epoch_acc = (val_correct / max(1, val_total)) * 100

        scheduler.step()

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] "
            f"Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc:.1f}% || "
            f"Val Loss: {val_epoch_loss:.4f} | Val Acc: {val_epoch_acc:.1f}%"
        )

        if val_epoch_acc >= best_acc:
            best_acc = val_epoch_acc

    total_time = time.time() - start_time
    print(f"\n[DONE] Training completed in {total_time:.1f}s. Best Validation Accuracy: {best_acc:.1f}%")

    # Save trained weights
    os.makedirs(os.path.dirname(weights_output), exist_ok=True)
    torch.save(model.state_dict(), weights_output)
    print(f"[SAVED] Trained model weights saved to: {weights_output}")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Navsari Waste Classifier ResNet-50")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.0003, help="Learning rate")
    parser.add_argument("--data-dir", type=str, default="data", help="Directory containing train/ and val/ images")
    parser.add_argument("--weights-output", type=str, default="weights/waste_resnet50_navsari.pt", help="Path to save weights")
    args = parser.parse_args()

    train_model(
        data_dir=args.data_dir,
        weights_output=args.weights_output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr
    )

