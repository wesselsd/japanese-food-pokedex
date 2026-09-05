import os
import time

from google import genai
import base64
from os import path

API_KEY = os.environ["API_KEY"]

client = genai.Client(api_key=API_KEY)

foods = [
    'ramen',
    'sushi',
    'okonomiyaki',
    'onigiri',
    'takoyaki',
    'matcha',
    'soba',
    'udon',
    'tsukemen',
    'hiyashi-chuka',
    'tempura',
    'tonkatsu',
    'karaage',
    'yakitori',
    'chicken-nanban',
    'kushikatsu',
    'sukiyaki',
    'shabu-shabu',
    'gyutan',
    'motsunabe',
    'katsudon',
    'gyudon',
    'oyakodon',
    'tendon',
    'kaisendon',
    'omurice',
    'ochazuke',
    'takikomi-gohan',
    'curry-rice',
    'katsu-curry',
    'curry-pan',
    'gyoza',
    'chahan',
    'nikuman',
    'shumai',
    'edamame',
    'agedashi-tofu',
    'nikujaga',
    'taiyaki',
    'dango',
    'kakigori',
    'mochi',
    'daifuku',
    'ichigo-daifuku',
    'warabi-mochi',
    'dorayaki',
    'castella',
    'anmitsu',
    'melon-pan',
    'senbei',
]

master_prompt = """Create a polished, friendly illustration for a Japanese food encyclopedia card.
Use a cute minimalist anime-inspired editorial style with clean, moderately thick outlines,
soft flat colors, subtle shading, and a warm off-white background. Show exactly one clearly
recognizable serving of the named food, centered in a wide 16:9 landscape composition with
comfortable empty margins so it remains legible when cropped responsively. Use an appropriate
plate, bowl, skewer, tray, or serving vessel when that is part of the dish, but do not add
extraneous ingredients or multiple dishes. Keep the camera angle and visual scale consistent
across the series. No people, hands, logos, labels, captions, Japanese characters, or other text."""

def generate_image(food):
    if path.exists(f"{food}_image.png"):
        print(f"Skipping {food}. Already exists.")
        return
    interaction = client.interactions.create(
        model="gemini-3.1-flash-lite-image",
        input=f"Create a picture of {food}. {master_prompt}",
    )
    with open(f"{food}_image.png", "wb") as f:
        f.write(base64.b64decode(interaction.output_image.data))
    time.sleep(1) # hard rate limit on api and expensive call!

def main():
    for food in foods:
        generate_image(food)

if __name__ == "__main__":
    main()
