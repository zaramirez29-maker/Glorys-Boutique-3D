"""Compose the existing woman avatar with the existing RA dress GLB.

The avatar is static in the fitting room, so this creates a fixed-pose outfit
preview from the exact RA garment meshes. It does not claim transferable skinning.
"""
import bpy
import os
import sys
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
avatar_path, dress_path, out_avatar, out_dress = args


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def remove_helper_spheres():
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and (
            obj.name.lower().startswith('icosphere')
            or not any(material is not None for material in obj.data.materials)
        ):
            bpy.data.objects.remove(obj, do_unlink=True)
    print('REMAINING_MESHES', [(o.name, len(o.data.materials)) for o in bpy.context.scene.objects if o.type == 'MESH'])


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False,
                              export_apply=True, export_yup=True)


def replace_visible_jacket_sleeves_with_skin():
    avatar = next((obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name.startswith('char1')), None)
    if not avatar or not avatar.data.uv_layers.active:
        return
    material = avatar.data.materials[0] if avatar.data.materials else None
    image = next((node.image for node in material.node_tree.nodes
                  if node.type == 'TEX_IMAGE' and node.image and 'basecolor' in node.image.name.lower()), None) if material and material.use_nodes else None
    if not image:
        return
    width, height = image.size
    pixels = np.asarray(image.pixels[:], dtype=np.float32).reshape((height, width, 4))
    uv_layer = avatar.data.uv_layers.active.data
    selected_faces = []
    for poly in avatar.data.polygons:
        center = avatar.matrix_world @ poly.center
        uv = sum((uv_layer[loop_index].uv for loop_index in poly.loop_indices), Vector((0, 0))) / len(poly.loop_indices)
        x = min(width - 1, max(0, int(uv.x * (width - 1))))
        y = min(height - 1, max(0, int(uv.y * (height - 1))))
        red, green, blue = pixels[y, x, :3]
        orange_jacket_arm = .66 < center.z < 1.40 and red > green * 1.22 and green > blue * 1.08 and red > .20
        if not orange_jacket_arm:
            continue
        selected_faces.append(poly)
    print('RECOLORED_COVERED_ORIGINAL_CLOTHING_FACES', len(selected_faces))
    if not selected_faces:
        return
    skin = bpy.data.materials.new('Skin | exposed arms after dress fitting')
    skin.diffuse_color = (.78, .47, .34, 1)
    skin.use_nodes = True
    skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.78, .47, .34, 1)
    skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .82
    avatar.data.materials.append(skin)
    skin_index = len(avatar.data.materials) - 1
    for poly in selected_faces:
        poly.material_index = skin_index


clear()
bpy.ops.import_scene.gltf(filepath=avatar_path)
remove_helper_spheres()
export(out_avatar)

clear()
bpy.ops.import_scene.gltf(filepath=avatar_path)
remove_helper_spheres()
avatar_objects = set(bpy.context.scene.objects)
# Keep the original rigged avatar mesh intact. Reassigning parts of its
# skinned material atlas caused unstable exported poses in the composite.
bpy.ops.import_scene.gltf(filepath=dress_path)
remove_helper_spheres()
for obj in set(bpy.context.scene.objects) - avatar_objects:
    # The source GLBs share the same upright scale, but the avatar's chest is
    # forward of the dress origin. Bring the dress over the body surface.
    if obj.type == 'MESH':
        name = obj.name.lower()
        fitted_bodice = any(part in name for part in ('bodice', 'neckline', 'dart'))
        if fitted_bodice:
            obj.location.y -= 0.17
            obj.location.z += 0.03
            obj.scale.x *= 0.84
            obj.scale.y *= 0.90
        elif 'flowing a-line skirt' in name:
            obj.location.y -= 0.19
            obj.scale.x *= 0.75
            obj.scale.y *= 0.82
        else:
            obj.location.y -= 0.17
            obj.scale.x *= 0.84
            obj.scale.y *= 0.88
export(out_dress)
