"""Sharpens the SAKAN logo cut from the brand board (Real-ESRGAN x4) and exports the
files the site uses, until the original logo file arrives.

usage: python -I logo_prep.py <brand_dir> <model.pth> <out_img_dir>
  brand_dir/lockup-crop.png -> out/brand/logo-lockup.webp (arch + سكن + INTERIORS, on its paper)
  brand_dir/mark-crop.png   -> out/brand/mark.webp, out/favicon-32.png, apple-touch-icon.png, icon-512.png
"""
import os, sys
import numpy as np
import torch
from PIL import Image, ImageFilter
import spandrel

brand, model_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(out, 'brand'), exist_ok=True)
torch.set_num_threads(max(1, (os.cpu_count() or 4) // 2))
model = spandrel.ModelLoader().load_from_file(model_path).eval()


def upscale(img, tile=256, pad=16):
    x = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255.0).permute(2, 0, 1)[None]
    _, _, h, w = x.shape
    s = model.scale
    res = torch.zeros((1, 3, h * s, w * s))
    with torch.inference_mode():
        for y0 in range(0, h, tile):
            for x0 in range(0, w, tile):
                y1, x1 = min(y0 + tile, h), min(x0 + tile, w)
                ya, xa, yb, xb = max(y0 - pad, 0), max(x0 - pad, 0), min(y1 + pad, h), min(x1 + pad, w)
                r = model(x[:, :, ya:yb, xa:xb])
                oy, ox = (y0 - ya) * s, (x0 - xa) * s
                res[:, :, y0 * s:y1 * s, x0 * s:x1 * s] = r[:, :, oy:oy + (y1 - y0) * s, ox:ox + (x1 - x0) * s]
    return Image.fromarray((res[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255 + .5).astype(np.uint8))


for name, target_h in (('lockup', 1600), ('mark', 1200)):
    src = Image.open(os.path.join(brand, f'{name}-crop.png')).convert('RGB')
    big = upscale(src).filter(ImageFilter.UnsharpMask(radius=1.0, percent=30, threshold=2))
    big.save(os.path.join(brand, f'{name}-x4.png'), compress_level=1)
    r = target_h / big.height
    im = big.resize((round(big.width * r), target_h), Image.LANCZOS)
    im.save(os.path.join(out, 'brand', f'logo-{name}.webp' if name == 'lockup' else 'mark.webp'), 'WEBP', quality=90, method=6)
    print(name, src.size, '->', big.size, '->', im.size, flush=True)

# tab and home-screen icons: the arch mark centred on its own paper
mark = Image.open(os.path.join(brand, 'mark-x4.png')).convert('RGB')
side = max(mark.size)
sq = Image.new('RGB', (side, side), mark.getpixel((8, 8)))
sq.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
for size, fname in ((32, 'favicon-32.png'), (180, 'apple-touch-icon.png'), (512, 'icon-512.png')):
    sq.resize((size, size), Image.LANCZOS).save(os.path.join(out, fname))
print('icons done')
