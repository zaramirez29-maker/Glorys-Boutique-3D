"""Create a neutral copy of the rigged avatar by removing clothing faces.

The source avatar is preserved. Clothing is identified from the base-color
texture through the face UVs, then removed from a duplicated mesh while the
original armature, skin weights and remaining body faces are retained.
"""

import json
import os
import sys

import bpy
import bmesh


def args():
    values = sys.argv[sys.argv.index('--') + 1:]
    if len(values) != 2:
        raise SystemExit('Usage: blender --background --python create_neutral_avatar.py -- INPUT.glb OUTPUT.glb')
    return os.path.abspath(values[0]), os.path.abspath(values[1])


def image_from_material(mesh):
    for material in mesh.data.materials:
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image and 'basecolor' in node.image.name.lower():
                return node.image
    raise RuntimeError('No base-color image was found on the avatar material.')


def sample(pixels, width, height, uv):
    # Clamp UVs because a few imported seam coordinates can be just outside 0..1.
    u = max(0.0, min(1.0, uv.x))
    v = max(0.0, min(1.0, uv.y))
    x = min(width - 1, int(u * (width - 1)))
    y = min(height - 1, int((1.0 - v) * (height - 1)))
    offset = (y * width + x) * 4
    return tuple(pixels[offset + channel] for channel in range(3))


def is_clothing(rgb):
    red, green, blue = rgb
    # Navy/blue trouser regions.
    blue_trousers = blue > red * 1.18 and blue > green * 1.08 and blue > 0.07
    # Orange jacket regions. The green floor avoids dark brown hair pixels.
    orange_jacket = red > 0.22 and green > 0.055 and green < red * 0.78 and blue < green * 0.9
    return blue_trousers or orange_jacket


def main():
    source, output = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    avatar = next((obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name == 'char1'), None)
    if not avatar:
        raise RuntimeError('The expected char1 mesh was not found.')
    uv_layer = avatar.data.uv_layers.active
    if not uv_layer:
        raise RuntimeError('The avatar mesh has no UV map.')
    image = image_from_material(avatar)
    pixels = list(image.pixels[:])
    width, height = image.size[:]

    remove_indices = set()
    for polygon in avatar.data.polygons:
        colors = [sample(pixels, width, height, uv_layer.data[loop_index].uv) for loop_index in polygon.loop_indices]
        average = tuple(sum(color[channel] for color in colors) / len(colors) for channel in range(3))
        if is_clothing(average):
            remove_indices.add(polygon.index)

    if len(remove_indices) < 1000:
        raise RuntimeError(f'The texture classifier found only {len(remove_indices)} clothing faces; no output was written.')

    neutral = avatar.copy()
    neutral.data = avatar.data.copy()
    neutral.name = 'char1_neutral'
    bpy.context.collection.objects.link(neutral)
    bpy.context.view_layer.objects.active = neutral
    avatar.hide_viewport = True
    avatar.hide_render = True

    mesh = neutral.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.index in remove_indices], context='FACES')
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    # Keep the neutral copy and armature; remove unrelated helper geometry.
    for obj in list(bpy.context.scene.objects):
        if obj == avatar or obj == neutral or obj.type == 'ARMATURE':
            continue
        bpy.data.objects.remove(obj, do_unlink=True)

    os.makedirs(os.path.dirname(output), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    neutral.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            obj.select_set(True)
    bpy.context.view_layer.objects.active = neutral
    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format='GLB',
        export_animations=True,
        export_skins=True,
        export_image_format='AUTO',
        export_apply=False,
    )
    with open(output + '.metadata.json', 'w', encoding='utf-8') as stream:
        json.dump({
            'asset_kind': 'neutral_avatar',
            'avatar_type': 'adult_female',
            'source_avatar': '/models/avatars/woman-clean.glb',
            'removed_clothing_faces': len(remove_indices),
            'method': 'UV base-color clothing segmentation',
            'rigged': True,
            'cloth_simulation': False,
            'review_required': True,
        }, stream, ensure_ascii=False, indent=2)
    print(json.dumps({'output': output, 'removed_clothing_faces': len(remove_indices)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
