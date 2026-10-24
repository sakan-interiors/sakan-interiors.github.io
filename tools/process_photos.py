"""Upscale (Real-ESRGAN x4), gently correct and export the client's photos.

usage: python -I process_photos.py <work_dir> <out_img_dir> <model.pth> [n n n ...]
  work_dir/orig/NN.jpg  -> out_img_dir/hNN-3840.webp, hNN-1920.webp, hNN-1080.webp
  and work_dir/master/NN.jpg (4x, corrected, q95, no metadata)
"""
import os, sys, time
import numpy as np
import torch
from PIL import Image, ImageFilter
import spandrel

work, out, model_path = sys.argv[1], sys.argv[2], sys.argv[3]
nums = [int(n) for n in sys.argv[4:]]
os.makedirs(out, exist_ok=True)
os.makedirs(os.path.join(work, 'master'), exist_ok=True)
torch.set_num_threads(os.cpu_count() or 4)
model = spandrel.ModelLoader().load_from_file(model_path).eval()
SCALE = model.scale


def upscale(img, tile=320, pad=16):
    """Tiled inference so memory stays small on CPU."""
    x = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255.0).permute(2, 0, 1)[None]
    _, _, h, w = x.shape
    out_t = torch.zeros((1, 3, h * SCALE, w * SCALE))
    with torch.inference_mode():
        for y0 in range(0, h, tile):
            for x0 in range(0, w, tile):
                y1, x1 = min(y0 + tile, h), min(x0 + tile, w)
                ya, xa = max(y0 - pad, 0), max(x0 - pad, 0)
                yb, xb = min(y1 + pad, h), min(x1 + pad, w)
                r = model(x[:, :, ya:yb, xa:xb])
                oy, ox = (y0 - ya) * SCALE, (x0 - xa) * SCALE
                out_t[:, :, y0 * SCALE:y1 * SCALE, x0 * SCALE:x1 * SCALE] = r[:, :, oy:oy + (y1 - y0) * SCALE, ox:ox + (x1 - x0) * SCALE]
    arr = (out_t[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255.0 + 0.5).astype(np.uint8)
    return Image.fromarray(arr)


def correct(img):
    """Gentle, photo-friendly correction: soften strong colour casts, set black and
    white points, add a light contrast curve. Keeps warm evening light warm."""
    a = np.asarray(img, dtype=np.float32) / 255.0
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    mid = (lum > 0.25) & (lum < 0.85)
    if mid.sum() > 1000:
        means = a[mid].mean(axis=0)
        gray = means.mean()
        gains = gray / np.maximum(means, 1e-4)
        gains = 1 + (gains - 1) * 0.22          # a fifth of the way to neutral: keeps warm light warm
        a = a * gains
    lo, hi = np.percentile(a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32), [0.4, 99.6])
    hi = max(hi, lo + 0.2)
    a = (a - lo) / (hi - lo)
    a = np.clip(a, 0, 1)
    a = a + 0.06 * np.sin(np.pi * a) * (a - 0.5) * 2   # light S-curve
    a = np.clip(a, 0, 1)
    l2 = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    a = l2[..., None] + (a - l2[..., None]) * 1.06    # a touch of saturation
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


for n in nums:
    t = time.time()
    src = Image.open(os.path.join(work, 'orig', f'{n:02d}.jpg')).convert('RGB')
    raw_path = os.path.join(work, 'up', f'{n:02d}.png')
    os.makedirs(os.path.dirname(raw_path), exist_ok=True)
    if os.environ.get('NO_AI'):
        raw = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS) if not os.path.exists(raw_path) else Image.open(raw_path).convert('RGB')
    elif os.path.exists(raw_path):
        raw = Image.open(raw_path).convert('RGB')
    else:
        raw = upscale(src)
        raw.save(raw_path, compress_level=1)
    big = correct(raw)
    big = big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=35, threshold=2))
    big.save(os.path.join(work, 'master', f'{n:02d}.jpg'), quality=95, subsampling=0)
    width = big.width
    for target in (3840, 1920, 1080):
        im = big
        if width > target:
            r = target / width
            im = big.resize((round(big.width * r), round(big.height * r)), Image.LANCZOS)
        im.save(os.path.join(out, f'h{n:02d}-{target}.webp'), 'WEBP', quality=82 if target == 3840 else 80, method=5)
    print(f'{n:02d}: {src.size} -> {big.size} in {time.time() - t:.0f}s', flush=True)
