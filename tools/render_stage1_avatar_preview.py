"""Render a local visual smoke-check of the prepared GLB with Blender."""

import argparse
import os
import sys

import bpy
from mathutils import Vector


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("model_glb")
    parser.add_argument("output_png")
    return parser.parse_args(argv)


def main():
    args = arguments()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.model_glb))
    avatar = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH" and any(mod.type == "ARMATURE" for mod in obj.modifiers))
    shirt = next(material for material in avatar.data.materials if material.name == "Glorys_Stage1_Tshirt")
    shirt.diffuse_color = (0.10, 0.27, 0.74, 1.0)
    for node in shirt.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            node.inputs["Base Color"].default_value = (0.10, 0.27, 0.74, 1.0)

    points = [avatar.matrix_world @ vertex.co for vertex in avatar.data.vertices]
    mins = [min(point[axis] for point in points) for axis in range(3)]
    maxs = [max(point[axis] for point in points) for axis in range(3)]
    vertical = max(range(3), key=lambda axis: maxs[axis] - mins[axis])
    center = [(mins[axis] + maxs[axis]) * 0.5 for axis in range(3)]
    center[vertical] = mins[vertical] + (maxs[vertical] - mins[vertical]) * 0.52
    center = Vector(center)
    depth = (maxs[1] - mins[1]) if vertical != 1 else (maxs[2] - mins[2])
    depth = max(depth, 0.5)

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = center + Vector((0.0, -depth * 4.6, 0.0))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(maxs[vertical] - mins[vertical], 1.0) * 1.22
    bpy.context.scene.camera = camera

    for name, location, energy, size in [
        ("Key", (-2.5, -3.5, 3.3), 950, 4.0),
        ("Fill", (2.5, -2.0, 2.1), 500, 3.0),
        ("Rim", (0.0, 2.4, 3.0), 700, 2.5),
    ]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        bpy.context.scene.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()

    world = bpy.data.worlds.new("PreviewWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value = (0.48, 0.52, 0.60, 1.0)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value = 0.45

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 720
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.abspath(args.output_png)
    bpy.ops.render.render(write_still=True)
    print("Rendered", scene.render.filepath)


if __name__ == "__main__":
    main()
