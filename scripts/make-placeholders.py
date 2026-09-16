"""מייצר נכסים חלופיים זמניים בסגנון ניאון עד להורדת הנכסים המקוריים.

הרצת scripts/fetch-assets.sh דורסת את הקבצים האלה בנכסים המקוריים.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "public", "assets")

PURPLE = (138, 43, 226)
MAGENTA = (255, 45, 149)
TURQUOISE = (34, 226, 216)
GOLD = (255, 198, 61)
DEEP = (26, 6, 46)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        px[0, y] = lerp(top, bottom, y / max(1, h - 1))
    return img.resize(size, Image.BICUBIC).convert("RGBA")


def radial_glow(size, color, radius_ratio=0.55, alpha=170):
    w, h = size
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    r = int(min(w, h) * radius_ratio)
    steps = 26
    for i in range(steps):
        t = i / steps
        rr = int(r * (1 - t))
        a = int(alpha * (t ** 2))
        d.ellipse(
            [w // 2 - rr, h // 2 - rr, w // 2 + rr, h // 2 + rr],
            fill=color + (a,),
        )
    return glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.04))


def star(draw, cx, cy, r, color, points=5, inner=0.45):
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rad = r if i % 2 == 0 else r * inner
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    draw.polygon(pts, fill=color)


def sparkle_layer(size, rng, count=70, colors=(TURQUOISE, MAGENTA, GOLD)):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = size
    for _ in range(count):
        x = rng.randint(0, w)
        y = rng.randint(0, h)
        r = rng.randint(2, 9)
        c = rng.choice(colors)
        star(d, x, y, r, c + (rng.randint(110, 230),), points=4, inner=0.3)
    return layer.filter(ImageFilter.GaussianBlur(0.6))


# ---------- רקעים ----------

BG_PAIRS = {
    2: ((72, 12, 122), (18, 8, 58)),
    3: ((142, 18, 96), (28, 8, 60)),
    4: ((12, 78, 118), (10, 12, 54)),
    5: ((104, 20, 140), (24, 6, 52)),
    6: ((18, 104, 108), (8, 16, 56)),
    7: ((136, 40, 40), (30, 8, 48)),
    8: ((44, 32, 150), (12, 8, 52)),
    9: ((132, 88, 16), (34, 10, 50)),
    10: ((26, 56, 140), (10, 10, 56)),
}


def make_bg(n, path):
    size = (720, 1280)
    top, bottom = BG_PAIRS[n]
    img = vertical_gradient(size, top, bottom)
    rng = random.Random(n * 977)
    accent = [MAGENTA, TURQUOISE, GOLD, PURPLE][n % 4]
    img.alpha_composite(radial_glow(size, accent, 0.45, 120))
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(7):
        r = rng.randint(90, 260)
        cx = rng.randint(0, size[0])
        cy = rng.randint(0, size[1])
        c = rng.choice([MAGENTA, TURQUOISE, GOLD, PURPLE])
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=c + (70,), width=rng.randint(3, 9))
    layer = layer.filter(ImageFilter.GaussianBlur(3))
    img.alpha_composite(layer)
    img.alpha_composite(sparkle_layer(size, rng, 90))
    img.convert("RGB").save(path, "PNG", optimize=True)


# ---------- הגיבורה ----------

def make_hero(path, accent, mood):
    size = (768, 1024)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    img.alpha_composite(radial_glow(size, accent, 0.62, 150))
    d = ImageDraw.Draw(img)
    cx = size[0] // 2
    hair_back = lerp(accent, (255, 255, 255), 0.15) + (235,)
    skin = (255, 214, 196, 255)
    outfit = lerp(accent, DEEP, 0.35) + (255,)

    # שיער אחורי
    d.ellipse([cx - 210, 150, cx + 210, 760], fill=hair_back)
    # גוף
    d.polygon(
        [(cx - 170, 1024), (cx - 105, 560), (cx + 105, 560), (cx + 170, 1024)],
        fill=outfit,
    )
    # צוואר
    d.rounded_rectangle([cx - 38, 470, cx + 38, 600], radius=30, fill=skin)
    # פנים
    d.ellipse([cx - 125, 230, cx + 125, 520], fill=skin)
    # פוני
    d.chord([cx - 145, 170, cx + 145, 430], 180, 360, fill=lerp(accent, DEEP, 0.15) + (255,))
    # עיניים
    eye_y = 390 if mood != "celebrate" else 380
    for sx in (-52, 52):
        if mood == "cheer":
            d.arc([cx + sx - 30, eye_y - 26, cx + sx + 30, eye_y + 22], 200, 340, fill=DEEP + (255,), width=9)
        else:
            d.ellipse([cx + sx - 22, eye_y - 26, cx + sx + 22, eye_y + 26], fill=(28, 14, 44, 255))
            d.ellipse([cx + sx - 8, eye_y - 18, cx + sx + 8, eye_y - 2], fill=(255, 255, 255, 230))
    # פה
    if mood == "encourage":
        d.arc([cx - 46, 430, cx + 46, 486], 200, 340, fill=(190, 60, 110, 255), width=10)
    else:
        d.chord([cx - 58, 420, cx + 58, 500], 0, 180, fill=(196, 48, 104, 255))
        d.chord([cx - 44, 424, cx + 44, 466], 0, 180, fill=(255, 255, 255, 235))
    # סומק
    for sx in (-88, 88):
        d.ellipse([cx + sx - 26, 440, cx + sx + 26, 476], fill=MAGENTA + (70,))
    # כתר ניאון
    star(d, cx - 120, 205, 34, GOLD + (235,))
    star(d, cx + 128, 236, 26, TURQUOISE + (225,))

    if mood == "celebrate":
        rng = random.Random(7)
        img.alpha_composite(sparkle_layer(size, rng, 60))

    img.save(path, "PNG", optimize=True)


# ---------- חפצים ----------

def coin_image(size=512, rim=GOLD, face=(255, 232, 150)):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(radial_glow((size, size), GOLD, 0.5, 120))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.12)
    d.ellipse([pad, pad, size - pad, size - pad], fill=rim + (255,))
    inner = int(size * 0.2)
    d.ellipse([inner, inner, size - inner, size - inner], fill=face + (255,))
    star(d, size // 2, size // 2, int(size * 0.2), lerp(GOLD, (180, 110, 10), 0.4) + (255,))
    d.arc([pad, pad, size - pad, size - pad], 190, 300, fill=(255, 255, 255, 200), width=int(size * 0.03))
    return img


def make_coin(path):
    coin_image().save(path, "PNG", optimize=True)


def make_coins(path, count):
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rng = random.Random(count)
    small = coin_image(int(size * 0.46))
    for _ in range(count):
        x = rng.randint(0, size - small.width)
        y = rng.randint(int(size * 0.2), size - small.height)
        img.alpha_composite(small, (x, y))
    img.save(path, "PNG", optimize=True)


def make_jar(path):
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(radial_glow((size, size), TURQUOISE, 0.5, 110))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([120, 150, 392, 470], radius=60, fill=(180, 240, 255, 110), outline=TURQUOISE + (230,), width=8)
    d.rounded_rectangle([150, 100, 362, 160], radius=26, fill=MAGENTA + (235,))
    d.rounded_rectangle([140, 330, 372, 452], radius=40, fill=GOLD + (210,))
    small = coin_image(120)
    img.alpha_composite(small, (150, 300))
    img.alpha_composite(small, (240, 336))
    img.save(path, "PNG", optimize=True)


def make_chest(path):
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(radial_glow((size, size), PURPLE, 0.5, 120))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([80, 230, 432, 430], radius=26, fill=(92, 36, 140, 255), outline=GOLD + (255,), width=8)
    d.chord([80, 130, 432, 330], 180, 360, fill=(126, 48, 186, 255), outline=GOLD + (255,), width=8)
    d.rounded_rectangle([226, 268, 286, 360], radius=18, fill=GOLD + (255,))
    d.ellipse([238, 292, 274, 328], fill=DEEP + (255,))
    img.save(path, "PNG", optimize=True)


def make_trophy(path):
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(radial_glow((size, size), GOLD, 0.5, 130))
    d = ImageDraw.Draw(img)
    d.chord([150, 90, 362, 330], 0, 180, fill=GOLD + (255,))
    d.rectangle([150, 90, 362, 210], fill=GOLD + (255,))
    d.arc([88, 110, 188, 250], 90, 270, fill=GOLD + (255,), width=18)
    d.arc([324, 110, 424, 250], 270, 90, fill=GOLD + (255,), width=18)
    d.rectangle([232, 300, 280, 390], fill=lerp(GOLD, (160, 100, 10), 0.3) + (255,))
    d.rounded_rectangle([170, 386, 342, 436], radius=16, fill=lerp(GOLD, (160, 100, 10), 0.45) + (255,))
    star(d, 256, 190, 52, (255, 255, 255, 210))
    img.save(path, "PNG", optimize=True)


def make_medal(path):
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(radial_glow((size, size), MAGENTA, 0.5, 120))
    d = ImageDraw.Draw(img)
    d.polygon([(196, 60), (256, 250), (150, 250)], fill=MAGENTA + (255,))
    d.polygon([(316, 60), (362, 250), (256, 250)], fill=TURQUOISE + (255,))
    img.alpha_composite(coin_image(280), (116, 200))
    img.save(path, "PNG", optimize=True)


def make_gift(path):
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(radial_glow((size, size), MAGENTA, 0.52, 140))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([96, 200, 416, 436], radius=22, fill=PURPLE + (255,))
    d.rounded_rectangle([84, 150, 428, 216], radius=18, fill=lerp(PURPLE, (255, 255, 255), 0.2) + (255,))
    d.rectangle([232, 150, 280, 436], fill=GOLD + (255,))
    d.rectangle([84, 172, 428, 200], fill=GOLD + (255,))
    d.ellipse([160, 90, 264, 178], outline=GOLD + (255,), width=22)
    d.ellipse([248, 90, 352, 178], outline=GOLD + (255,), width=22)
    img.save(path, "PNG", optimize=True)


def main():
    os.makedirs(ASSETS, exist_ok=True)
    for n in range(2, 11):
        make_bg(n, os.path.join(ASSETS, f"bg-{n}.png"))
    make_hero(os.path.join(ASSETS, "hero.png"), PURPLE, "idle")
    make_hero(os.path.join(ASSETS, "hero-cheer.png"), TURQUOISE, "cheer")
    make_hero(os.path.join(ASSETS, "hero-encourage.png"), MAGENTA, "encourage")
    make_hero(os.path.join(ASSETS, "hero-celebrate.png"), GOLD, "celebrate")
    make_coin(os.path.join(ASSETS, "coin.png"))
    make_coins(os.path.join(ASSETS, "coins-small.png"), 3)
    make_coins(os.path.join(ASSETS, "coins-big.png"), 9)
    make_jar(os.path.join(ASSETS, "jar.png"))
    make_chest(os.path.join(ASSETS, "chest.png"))
    make_trophy(os.path.join(ASSETS, "trophy.png"))
    make_medal(os.path.join(ASSETS, "medal.png"))
    make_gift(os.path.join(ASSETS, "gift.png"))
    print("נוצרו נכסים חלופיים בתיקייה public/assets")


if __name__ == "__main__":
    main()
