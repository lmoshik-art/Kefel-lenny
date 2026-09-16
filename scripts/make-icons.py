"""מייצר את אייקוני ה-PWA מתוך public/assets/coin.png."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "public", "assets")
PUBLIC = os.path.join(ROOT, "public")
BG = (26, 6, 46, 255)

TARGETS = [
    ("apple-touch-icon.png", 180),
    ("icon-192.png", 192),
    ("icon-512.png", 512),
]


def build(src: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    inner = int(size * 0.86)
    coin = src.copy()
    coin.thumbnail((inner, inner), Image.LANCZOS)
    x = (size - coin.width) // 2
    y = (size - coin.height) // 2
    canvas.paste(coin, (x, y), coin if coin.mode == "RGBA" else None)
    return canvas


def main() -> None:
    coin_path = os.path.join(ASSETS, "coin.png")
    src = Image.open(coin_path).convert("RGBA")
    for name, size in TARGETS:
        out = os.path.join(PUBLIC, name)
        build(src, size).save(out, "PNG", optimize=True)
        print(f"{name} {size}x{size} -> {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    main()
