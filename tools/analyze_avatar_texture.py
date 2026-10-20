import bpy
from collections import Counter
import sys

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
image = next(image for image in bpy.data.images if image.name == 'rig_basecolor')
pixels = list(image.pixels)
colors = Counter()
for index in range(0, len(pixels), 4):
    rgb = tuple(int(max(0, min(1, pixels[index + channel])) * 16) for channel in range(3))
    colors[rgb] += 1
for color, count in colors.most_common(30):
    print(color, count)
