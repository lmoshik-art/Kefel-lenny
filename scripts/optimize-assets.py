"""מכין את הנכסים שירדו לשימוש באפליקציה.

שתי פעולות:
1. חפצים ודמויות: הסרת רקע הצבע האחיד והפיכתו לשקוף, חיתוך לשוליים והקטנה.
2. רקעים: הקטנה לגודל מסך טלפון וצמצום משקל הקובץ.

הקבצים המקוריים נשמרים בשרת המקור, והרצת scripts/fetch-assets.sh מחזירה אותם.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "public", "assets")

# גודל התצוגה המרבי לכל סוג נכס, בפיקסלים
CUTOUT_SIZES = {
    "hero.png": 768,
    "hero-cheer.png": 768,
    "hero-encourage.png": 768,
    "hero-celebrate.png": 768,
    "coin.png": 512,
    "coins-small.png": 512,
    "coins-big.png": 512,
    "jar.png": 512,
    "chest.png": 512,
    "trophy.png": 512,
    "medal.png": 512,
    "gift.png": 512,
}

BG_SIZE = (720, 1280)
BG_COLORS = 160
FLOOD_TOLERANCE = 42
SENTINEL = (1, 2, 3)


def remove_flat_background(image: Image.Image) -> Image.Image:
    """מסיר את רקע הצבע האחיד בעזרת מילוי משוליים, כך שצבעים זהים בתוך הדמות נשמרים."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    work = rgb.copy()
    seeds = [
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (width // 2, height - 1),
        (0, height // 2),
        (width - 1, height // 2),
    ]
    for seed in seeds:
        ImageDraw.floodfill(work, seed, SENTINEL, thresh=FLOOD_TOLERANCE)

    import numpy as np

    data = np.array(work)
    is_background = (
        (data[:, :, 0] == SENTINEL[0])
        & (data[:, :, 1] == SENTINEL[1])
        & (data[:, :, 2] == SENTINEL[2])
    )
    alpha = Image.fromarray(np.where(is_background, 0, 255).astype("uint8"), mode="L")
    # ריכוך קל של הקצה כדי למנוע שפה חדה סביב הדמות
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))

    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def process_cutout(name: str, max_size: int) -> str:
    path = os.path.join(ASSETS, name)
    before = os.path.getsize(path)
    image = Image.open(path)
    if image.mode == "RGBA" and image.getextrema()[3][0] < 255:
        cut = image  # כבר שקוף, אין צורך להסיר רקע
    else:
        cut = remove_flat_background(image)
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    cut.thumbnail((max_size, max_size), Image.LANCZOS)
    cut.save(path, "PNG", optimize=True)
    after = os.path.getsize(path)
    return f"{name:22} {before // 1024}KB -> {after // 1024}KB  {cut.size[0]}x{cut.size[1]} שקוף"


def process_background(name: str) -> str:
    path = os.path.join(ASSETS, name)
    before = os.path.getsize(path)
    image = Image.open(path).convert("RGB")
    image = image.resize(BG_SIZE, Image.LANCZOS)
    image = image.quantize(colors=BG_COLORS, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    image.save(path, "PNG", optimize=True)
    after = os.path.getsize(path)
    return f"{name:22} {before // 1024}KB -> {after // 1024}KB  {BG_SIZE[0]}x{BG_SIZE[1]}"


def main() -> None:
    try:
        import numpy  # noqa: F401
    except ImportError:
        print("נדרש numpy: pip install numpy", file=sys.stderr)
        raise SystemExit(1)

    lines = []
    for name, size in CUTOUT_SIZES.items():
        if os.path.exists(os.path.join(ASSETS, name)):
            lines.append(process_cutout(name, size))
    for table in range(2, 11):
        name = f"bg-{table}.png"
        if os.path.exists(os.path.join(ASSETS, name)):
            lines.append(process_background(name))

    total = sum(
        os.path.getsize(os.path.join(ASSETS, f))
        for f in os.listdir(ASSETS)
        if f.endswith(".png")
    )
    print("\n".join(lines))
    print(f"סך הכול: {total // 1024 // 1024} MB")


if __name__ == "__main__":
    main()
