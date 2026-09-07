import subprocess, sys, os, tempfile
from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "screenshots")
os.makedirs(OUT, exist_ok=True)
BG = (245, 237, 217)  # #f5edd9

pages = ["01-input", "02-plans", "03-itinerary", "04-share", "05-history"]
SCALE = 2
WIN_W, WIN_H = 800, 5200

for name in pages:
    src = os.path.join(HERE, name + ".html")
    raw = os.path.join(HERE, name + "_raw.png")
    prof = tempfile.mkdtemp()
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        f"--user-data-dir={prof}", f"--force-device-scale-factor={SCALE}",
        f"--window-size={WIN_W},{WIN_H}", "--virtual-time-budget=6000",
        f"--screenshot={raw}", src,
    ], check=True, capture_output=True)

    im = Image.open(raw).convert("RGB")
    w, h = im.size
    px = im.load()
    # 下から上へ、背景色でない行が現れるまで走査してクロップ
    cut = h
    midxs = [int(w * f) for f in (0.15, 0.35, 0.5, 0.65, 0.85)]
    for y in range(h - 1, -1, -1):
        if any(abs(px[x, y][c] - BG[c]) > 6 for x in midxs for c in range(3)):
            cut = min(h, y + 24 * SCALE)
            break
    im.crop((0, 0, w, cut)).save(os.path.join(OUT, name + ".png"))
    os.remove(raw)
    print(f"{name}.png  {w}x{cut}")
