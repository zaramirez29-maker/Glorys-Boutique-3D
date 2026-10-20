import json
import os
import sys

import bpy


def args():
    values = sys.argv[sys.argv.index('--') + 1:]
    if len(values) != 2:
        raise SystemExit('Usage: blender --background --python create_neutral_avatar_texture.py -- INPUT.glb OUTPUT.glb')
    return os.path.abspath(values[0]), os.path.abspath(values[1])


def is_clothing(red, green, blue):
    blue_trousers = blue > red * 1.18 and blue > green * 1.08 and blue > 0.07
    orange_jacket = red > 0.22 and green > 0.055 and green < red * 0.78 and blue < green * 0.9
    return blue_trousers or orange_jacket


def main():
    source, output = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    avatar = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name == 'char1')
    material = avatar.data.materials[0]
    image_node = next(node for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image and 'basecolor' in node.image.name.lower())
    original = image_node.image
    image = original.copy()
    image.name = 'rig_basecolor_neutral'
    pixels = list(image.pixels[:])
    hidden = 0
    for offset in range(0, len(pixels), 4):
        if is_clothing(pixels[offset], pixels[offset + 1], pixels[offset + 2]):
            pixels[offset + 3] = 0.0
            hidden += 1
    image.pixels.foreach_set(pixels)
    image.update()
    image_node.image = image

    principled = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if principled and 'Alpha' in principled.inputs and 'Alpha' in image_node.outputs:
        material.node_tree.links.new(image_node.outputs['Alpha'], principled.inputs['Alpha'])
    if hasattr(material, 'surface_render_method'):
        material.surface_render_method = 'DITHERED'
    material.diffuse_color[3] = 0.0

    # Remove the helper object only; preserve the avatar armature and skinning.
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj != avatar:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    avatar.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            obj.select_set(True)
    bpy.context.view_layer.objects.active = avatar
    os.makedirs(os.path.dirname(output), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=True, export_skins=True, export_image_format='AUTO', export_apply=False)
    with open(output + '.metadata.json', 'w', encoding='utf-8') as stream:
        json.dump({'asset_kind': 'neutral_avatar_texture_variant', 'source_avatar': '/models/avatars/woman-clean.glb', 'transparent_texture_pixels': hidden, 'rigged': True, 'review_required': True}, stream, ensure_ascii=False, indent=2)
    print(json.dumps({'output': output, 'transparent_texture_pixels': hidden}, ensure_ascii=False))


if __name__ == '__main__':
    main()
