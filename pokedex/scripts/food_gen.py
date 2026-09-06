import json
import os
import time
from pathlib import Path

from google import genai
import base64

API_KEY = os.environ["API_KEY"]
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "images"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

client = genai.Client(api_key=API_KEY)


master_prompt = """Create a polished, friendly illustration for a Japanese food encyclopedia card.
Use a cute minimalist anime-inspired editorial style with clean, moderately thick outlines,
soft flat colors, subtle shading, and a warm off-white background. Show exactly one clearly
recognizable serving of the named food, centered in a wide 16:9 landscape composition with
comfortable empty margins so it remains legible when cropped responsively. Use an appropriate
plate, bowl, skewer, tray, or serving vessel when that is part of the dish, but do not add
extraneous ingredients or multiple dishes. Keep the camera angle and visual scale consistent
across the series. No people, hands, logos, labels, captions, Japanese characters, or other text."""

def get_food_names() -> list[str]:
    with open(DATA_DIR / "foods.json", encoding="utf-8") as fo:
        data = json.load(fo)
    names = [element['name'].lower().replace(" ", "-") for element in data]
    return names

def generate_image(food):
    output_path = ASSETS_DIR / f"{food}_image.png"
    if output_path.exists():
        print(f"Skipping {food}. Already exists.")
        return
    interaction = client.interactions.create(
        model="gemini-3.1-flash-lite-image",
        input=f"{master_prompt} The food is {food}.",
        service_tier="flex"
    )
    with output_path.open("wb") as f:
        f.write(base64.b64decode(interaction.output_image.data))
    print(f"Created image of {food}.")
    time.sleep(1) # hard rate limit on api and expensive call!

def main():
    foods = get_food_names()
    for food in foods:
        generate_image(food)

if __name__ == "__main__":
    main()
