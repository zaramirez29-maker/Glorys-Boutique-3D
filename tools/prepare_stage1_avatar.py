"""Prepare a tintable shirt material group from the CC0 Grab3D rigged avatar.

Run with Blender 4.5 LTS:
  blender --background --python tools/prepare_stage1_avatar.py -- INPUT.glb OUTPUT.glb

This only groups existing shirt-colored triangles from the supplied model. It
does not generate garment geometry, retarget a garment, or claim cloth physics.
The script aborts unless it finds a plausible white garment region on the torso.
"""

import argparse
import array
import json
import os
import sys

import bpy
from mathutils import Vector


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("input_glb")
    parser.add_argument("output_glb")
    return parser.parse_args(argv)


def base_color_image(material):
    if not material.use_nodes:
        return None
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            return node.image
    return None


def torso_white_mask(obj, image):
    uv_layer = obj.data.uv_layers.active
    if not uv_layer:
        raise RuntimeError("The model has no active UV map.")

    pixels = array.array("f", [0.0]) * (image.size[0] * image.size[1] * 4)
    image.pixels.foreach_get(pixels)
    width, height = image.size

    world_points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    mins = [min(point[axis] for point in world_points) for axis in range(3)]
    maxs = [max(point[axis] for point in world_points) for axis in range(3)]
    vertical_axis = max(range(3), key=lambda axis: maxs[axis] - mins[axis])
    extent = maxs[vertical_axis] - mins[vertical_axis]

    def sample_face(poly, flip_v):
        loops = list(poly.loop_indices)
        u = sum(uv_layer.data[index].uv.x for index in loops) / len(loops)
        v = sum(uv_layer.data[index].uv.y for index in loops) / len(loops)
        x = min(width - 1, max(0, int(u * (width - 1))))
        y = min(height - 1, max(0, int((1.0 - v if flip_v else v) * (height - 1))))
        offset = (y * width + x) * 4
        return pixels[offset], pixels[offset + 1], pixels[offset + 2]

    masks = []
    for flip_v in (False, True):
        mask = []
        for poly in obj.data.polygons:
            center = sum((world_points[index] for index in poly.vertices), Vector()) / len(poly.vertices)
            relative_height = (center[vertical_axis] - mins[vertical_axis]) / extent
            red, green, blue = sample_face(poly, flip_v)
            brightness = (red + green + blue) / 3.0
            saturation = max(red, green, blue) - min(red, green, blue)
            is_white_fabric = brightness > 0.58 and saturation < 0.18
            mask.append(0.58 <= relative_height <= 0.86 and is_white_fabric)
        masks.append(mask)

    mask = max(masks, key=sum)
    count = sum(mask)
    if count < 150 or count > int(len(mask) * 0.25):
        raise RuntimeError(
            "Could not isolate a plausible white shirt region; found "
            f"{count} faces out of {len(mask)}. No output was written."
        )
    return mask


def main():
    args = arguments()
    source = os.path.abspath(args.input_glb)
    output = os.path.abspath(args.output_glb)
    os.makedirs(os.path.dirname(output), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(mesh_objects) != 1:
        print("Imported meshes:", [(obj.name, len(obj.data.polygons), [modifier.type for modifier in obj.modifiers]) for obj in mesh_objects])
    candidates = [obj for obj in mesh_objects if any(mod.type == "ARMATURE" for mod in obj.modifiers)]
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one skinned mesh; found {len(candidates)}.")
    avatar = candidates[0]
    if not any(mod.type == "ARMATURE" for mod in avatar.modifiers):
        raise RuntimeError("The avatar mesh is not attached to an armature.")
    if not avatar.data.materials:
        raise RuntimeError("The avatar mesh has no material to inspect.")

    image = base_color_image(avatar.data.materials[0])
    if not image:
        raise RuntimeError("Could not find the avatar base-color texture.")
    mask = torso_white_mask(avatar, image)

    original = avatar.data.materials[0]
    shirt_material = original.copy()
    shirt_material.name = "Glorys_Stage1_Tshirt"
    avatar.data.materials.append(shirt_material)
    shirt_slot = len(avatar.data.materials) - 1
    for polygon, is_shirt in zip(avatar.data.polygons, mask):
        if is_shirt:
            polygon.material_index = shirt_slot

    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_image_format="AUTO",
        export_apply=False,
    )

    report = {
        "avatar": "adult_female",
        "source": "Grab3D Casual Woman rigged GLB",
        "source_license": "CC0-1.0",
        "source_url": "https://grab3d.com/models/characters/woman/",
        "source_ai_disclosure": "AI-assisted; see adjacent LICENSE.txt and manifest.json",
        "rigged_mesh": avatar.name,
        "shirt_material": shirt_material.name,
        "shirt_faces_grouped": sum(mask),
        "shirt_fit": "The shirt surface is part of the source avatar mesh and shares its skin weights; no separate garment pattern or size fit is implied.",
        "animations": [animation.name for animation in bpy.data.actions],
        "cloth_simulation": False,
    }
    with open(output + ".metadata.json", "w", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
