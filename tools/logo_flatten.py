"""Evens out the paper behind the logo so it sits seamlessly on a flat background.
Fits a smooth light falloff (2nd-degree surface) to the paper pixels and divides it out,
leaving the embossed logo and its shadows untouched.

usage: python -I logo_flatten.py <in.png> <out.webp> <height> [target_hex]
"""
import sys
import numpy as np
from PIL import Image

src, out, height = sys.argv[1], sys.argv[2], int(sys.argv[3])
target = np.array([int((sys.argv[4] if len(sys.argv) > 4 else 'E4D9CB')[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)
im = Image.open(src).convert('RGB')
im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
a = np.asarray(im, dtype=np.float32)
h, w, _ = a.shape
lum = a @ np.array([.3, .59, .11], dtype=np.float32)
sat = a.max(2) - a.min(2)
paper = (lum > 195) & (sat < 34)
# fit each channel as c(x, y) = a + bx + cy + dx^2 + exy + fy^2 on a sample of paper pixels
ys, xs = np.nonzero(paper)
pick = np.random.default_rng(0).choice(len(xs), size=min(60000, len(xs)), replace=False)
x, y = xs[pick] / w - .5, ys[pick] / h - .5
A = np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], 1)
gx, gy = np.meshgrid(np.arange(w) / w - .5, np.arange(h) / h - .5)
G = np.stack([np.ones_like(gx), gx, gy, gx * gx, gx * gy, gy * gy], -1)
flat = np.empty_like(a)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, a[ys[pick], xs[pick], c], rcond=None)
    flat[..., c] = a[..., c] * (target[c] / (G @ coef))
Image.fromarray(np.clip(flat, 0, 255).round().astype(np.uint8)).save(out, 'WEBP', quality=90, method=6)
edge = lambda v: '#%02X%02X%02X' % tuple(int(t) for t in v.reshape(-1, 3).mean(0))
print('edges now', edge(flat[:30]), edge(flat[-30:]), edge(flat[:, :30]), edge(flat[:, -30:]), 'target #%02X%02X%02X' % tuple(int(t) for t in target))
