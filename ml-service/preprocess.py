"""
Navsari Municipal Waste Vision - Image Preprocessing Pipeline
Techniques adapted from Image_Classification_Project:
  1. Median Filter: removes salt-and-pepper noise and camera sensor artifacts
  2. CLAHE (Contrast-Limited Adaptive Histogram Equalization):
     Enhances outdoor local contrast in LAB color space under harsh sunlight/shadows
  3. Dynamic aspect-ratio preserving resizing to 224x224
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional


def apply_median_filter(img_np: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """Applies median blur to eliminate camera speckles while preserving sharp waste edges."""
    if kernel_size % 2 == 0:
        kernel_size += 1
    return cv2.medianBlur(img_np, kernel_size)


def apply_clahe(img_np: np.ndarray, clip_limit: float = 2.0, grid_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Applies CLAHE on the L (Luminance) channel in LAB color space.
    Normalizes deep shadows and blown-out bright sunlight in Indian outdoor scenes.
    """
    try:
        lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=grid_size)
        l_enhanced = clahe.apply(l)
        enhanced_lab = cv2.merge((l_enhanced, a, b))
        return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
    except Exception:
        return img_np


def preprocess_cv_image(
    image: Image.Image,
    target_size: Tuple[int, int] = (224, 224),
    use_clahe: bool = True,
    use_median: bool = True
) -> Image.Image:
    """
    Full CV preprocessing pipeline:
      PIL Image -> RGB NumPy -> Median Filter -> CLAHE -> Resize -> PIL Image
    """
    if isinstance(image, np.ndarray):
        img_rgb = Image.fromarray(image).convert("RGB")
    else:
        img_rgb = image.convert("RGB")
    arr = np.array(img_rgb)

    if use_median:
        arr = apply_median_filter(arr, kernel_size=3)

    if use_clahe:
        arr = apply_clahe(arr, clip_limit=2.0, grid_size=(8, 8))

    # High quality Lanczos/Area resizing
    resized = cv2.resize(arr, target_size, interpolation=cv2.INTER_AREA)
    return Image.fromarray(resized)
