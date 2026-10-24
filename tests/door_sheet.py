"""Frames from the door recordings -> contact sheets. usage: python3 door_sheet.py <dir>"""
import os, subprocess, sys
from PIL import Image, ImageDraw
os.chdir(sys.argv[1])
for d, cols, w in (('iphone', 8, 195), ('computer', 6, 360)):
    f = [x for x in os.listdir('v-' + d) if x.endswith('.webm')][0]
    os.makedirs('f-' + d, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'v-{d}/{f}', '-vf', 'fps=5', f'f-{d}/%03d.png'], check=True)
    fs = sorted(os.listdir('f-' + d))[:32]
    ims = [Image.open(f'f-{d}/{x}') for x in fs]
    h = int(ims[0].height * w / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * (h + 16)), 'white')
    dr = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * (h + 16)
        sheet.paste(im.convert('RGB').resize((w, h)), (x, y + 16))
        dr.text((x + 4, y + 2), f'{i * 0.2:.1f}s', fill='black')
    sheet.save(f'sheet-{d}.jpg', quality=85)
