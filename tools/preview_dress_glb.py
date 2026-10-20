"""Import and render a dress GLB to verify the exported asset itself.

Usage:
  blender --background --python tools/preview_dress_glb.py -- INPUT.glb PREVIEW.png
"""
import math
import os
import sys
from mathutils import Vector
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
if len(argv) != 2:
    raise SystemExit("Expected input GLB and preview PNG paths")
input_path, preview_path = argv
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(input_path))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if len(meshes) < 4:
    raise SystemExit(f"Expected multiple garment meshes, found {len(meshes)}")

world_points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector((min(p.x for p in world_points), min(p.y for p in world_points), min(p.z for p in world_points)))
high = Vector((max(p.x for p in world_points), max(p.y for p in world_points), max(p.z for p in world_points)))
center = (low + high) * .5
size = high - low
if size.z < 1.0 or size.x < .6 or size.z < size.x * 1.3:
    raise SystemExit(f"Unexpected dress proportions after GLB import: {tuple(round(v, 3) for v in size)}")

bpy.ops.object.camera_add(location=(center.x + size.x * 2.2, center.y - size.z * 3.1, center.z + size.z * .32))
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = size.z * 1.3
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = camera

for name, location, energy, power in [
    ("Key", (1.5, -3.0, 2.7), 430, 2.6),
    ("Fill", (-2.0, -2.3, 1.5), 220, 2.4),
    ("Rim", (1.0, 1.8, 2.2), 420, 2.0),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = power
    light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.mesh.primitive_plane_add(size=20, location=(center.x, center.y, low.z - .003))
ground = bpy.context.object
ground.name = "Preview floor"
ground_mat = bpy.data.materials.new("Preview floor material")
ground_mat.diffuse_color = (.9, .9, .92, 1)
ground.data.materials.append(ground_mat)
scene = bpy.context.scene
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.30, .32, .36, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .5
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.resolution_x = 900
scene.render.resolution_y = 1050
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.abspath(preview_path)
scene.view_settings.view_transform = "AgX"
bpy.ops.render.render(write_still=True)
print("GLB_RENDERED", os.path.abspath(preview_path))
print("GLB_BOUNDS_METERS", tuple(round(v, 4) for v in size))
print("GLB_MESH_COUNT", len(meshes))
