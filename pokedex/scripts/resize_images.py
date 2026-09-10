from io import BytesIO
from pathlib import Path
import argparse

from PIL import Image, ImageOps


def display_name(value: str) -> str:
    return value.encode("ascii", "backslashreplace").decode("ascii")


def encode_webp(image: Image.Image, quality: int) -> bytes:
    """Encode an image as WebP and return the encoded bytes."""
    buffer = BytesIO()

    image.save(
        buffer,
        format="WEBP",
        quality=quality,
        method=6,  # Higher compression effort; slower but smaller files
    )

    return buffer.getvalue()


def convert_png(
    source: Path,
    destination: Path,
    max_size: int,
    target_kb: int,
    min_quality: int = 35,
    max_quality: int = 90,
) -> None:
    with Image.open(source) as image:
        # Apply camera/mobile EXIF orientation before resizing.
        image = ImageOps.exif_transpose(image)

        # Preserve aspect ratio and never enlarge smaller images.
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        # Keep transparency when present. Otherwise use RGB.
        has_alpha = (
            image.mode in ("RGBA", "LA")
            or "transparency" in image.info
        )

        if has_alpha:
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        target_bytes = target_kb * 1024
        selected_data = None
        selected_quality = None

        # Try the highest quality first, then reduce until the target is met.
        for quality in range(max_quality, min_quality - 1, -1):
            data = encode_webp(image, quality)

            if selected_data is None or len(data) < len(selected_data):
                selected_data = data
                selected_quality = quality

            if len(data) <= target_bytes:
                selected_data = data
                selected_quality = quality
                break

        destination.write_bytes(selected_data)

        actual_kb = len(selected_data) / 1024
        print(
            f"{display_name(source.name)} -> {display_name(destination.name)} | "
            f"{image.width}x{image.height} | "
            f"{actual_kb:.1f} KB | quality {selected_quality}"
        )

        if actual_kb > target_kb:
            print(
                f"  Warning: could not reach {target_kb} KB without "
                f"using quality below {min_quality}."
            )

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

IMAGE_SUFFIXES = {".bmp", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}


if __name__ == "__main__":
    source_dir = ASSETS_DIR / "images"
    thumbnail_dir = ASSETS_DIR / "thumbnails"
    thumbnail_dir.mkdir(parents=True, exist_ok=True)

    for source in sorted(source_dir.iterdir()):
        if not source.is_file() or source.suffix.lower() not in IMAGE_SUFFIXES:
            continue

        thumbnail_name = source.stem.removesuffix("_image") + ".webp"
        destination = thumbnail_dir / thumbnail_name
        convert_png(source, destination, 600, 10, min_quality=50, max_quality=95)
