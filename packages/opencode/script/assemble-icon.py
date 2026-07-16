from collections import deque
from pathlib import Path
import sys

from PIL import Image


def transparent_outer_black(image):
    pixels = image.load()
    width, height = image.size
    queue = deque()
    visited = set()

    def add(x, y):
        if (x, y) in visited:
            return
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0 or (red <= 24 and green <= 24 and blue <= 24):
            visited.add((x, y))
            queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)

    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height:
                add(next_x, next_y)
    return image


def main():
    source = Path(sys.argv[1])
    png = Path(sys.argv[2])
    ico = Path(sys.argv[3])
    image = transparent_outer_black(Image.open(source).convert("RGBA"))
    image.save(png, format="PNG", optimize=False, compress_level=9)
    image.save(ico, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


if __name__ == "__main__":
    main()
