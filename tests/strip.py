"""Cuts a tall full-page screenshot into side-by-side columns. usage: strip.py in.png out.jpg col_width n_cols"""
import sys
from PIL import Image
src, out, cw, n = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB'); im = im.resize((cw, round(im.height * cw / im.width)), Image.LANCZOS)
h = -(-im.height // n)
s = Image.new('RGB', (n * (cw + 10), h), (60, 60, 60))
for k in range(n):
    s.paste(im.crop((0, k * h, cw, min(im.height, (k + 1) * h))), (k * (cw + 10), 0))
s.save(out, quality=85); print(s.size)
