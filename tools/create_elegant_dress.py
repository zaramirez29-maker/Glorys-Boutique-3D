"""Create a standalone, recognizable sleeveless evening dress GLB with Blender.

Usage:
  blender --background --python tools/create_elegant_dress.py -- OUTPUT.glb PREVIEW.png

The garment is authored locally as fitted bodice and flared skirt cloth meshes,
with shoulder straps, seams, hem piping and a satin PBR material. It is a
standalone display model, not rigged to an avatar or made-to-measure clothing.
"""

import math
import os
import sys

import bpy
from mathutils import Vector


def args():
    argv = sys.argv[sys.argv.index("--") + 1:]
    if len(argv) != 2:
        raise SystemExit("Expected output GLB and preview PNG paths")
    return argv


def satin_material():
    material = bpy.data.materials.new("Emerald satin | formal dress")
    material.diffuse_color = (0.002, 0.035, 0.012, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.002, 0.035, 0.012, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.025
    bsdf.inputs["Roughness"].default_value = 0.45
    if "Sheen Weight" in bsdf.inputs:
        bsdf.inputs["Sheen Weight"].default_value = 0.14
        bsdf.inputs["Sheen Roughness"].default_value = 0.36
    return material


def trim_material():
    material = bpy.data.materials.new("Warm gold | dress details")
    material.diffuse_color = (0.58, 0.34, 0.095, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.58, 0.34, 0.095, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.68
    bsdf.inputs["Roughness"].default_value = 0.28
    return material


def smooth_profile(controls, t):
    for index in range(len(controls) - 1):
        a, va = controls[index]
        b, vb = controls[index + 1]
        if t <= b:
            span = b - a
            local = max(0.0, min(1.0, (t - a) / span))
            if index == 0:
                slope_a = (vb - va) / span
            else:
                prev_t, prev_v = controls[index - 1]
                slope_a = (vb - prev_v) / (b - prev_t)
            if index + 2 >= len(controls):
                slope_b = (vb - va) / span
            else:
                next_t, next_v = controls[index + 2]
                slope_b = (next_v - va) / (next_t - a)
            t2 = local * local
            t3 = t2 * local
            return (
                (2 * t3 - 3 * t2 + 1) * va
                + (t3 - 2 * t2 + local) * slope_a * span
                + (-2 * t3 + 3 * t2) * vb
                + (t3 - t2) * slope_b * span
            )
    return controls[-1][1]


def mesh_object(name, vertices, faces, material, solidify=0.0):
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    if solidify:
        modifier = obj.modifiers.new("Light textile thickness", "SOLIDIFY")
        modifier.thickness = solidify
        modifier.offset = 0.0
        modifier.use_rim = True
    return obj


def make_bodice(material):
    around = 96
    rows = 36
    vertices = []
    faces = []
    rx_profile = [(0, .158), (.22, .17), (.48, .194), (.70, .205), (.88, .193), (1, .178)]
    ry_profile = [(0, .087), (.22, .096), (.48, .115), (.70, .118), (.88, .105), (1, .09)]
    for row in range(rows + 1):
        t = row / rows
        rx = smooth_profile(rx_profile, t)
        ry = smooth_profile(ry_profile, t)
        for step in range(around):
            angle = 2.0 * math.pi * step / around
            front = max(0.0, math.cos(angle))
            bust = .018 * math.exp(-((t - .67) / .15) ** 2) * front ** 5
            x = (rx + bust * .24) * math.sin(angle)
            y = -(ry + bust) * math.cos(angle)
            neckline = .078 * math.exp(-((math.atan2(math.sin(angle), math.cos(angle))) / .52) ** 2)
            z_top = 1.205 - neckline
            z = .775 + t * (z_top - .775)
            # Small cloth easing around the waist and side seams.
            z += .004 * math.sin(angle * 4.0) * math.sin(math.pi * t)
            vertices.append((x, y, z))
    for row in range(rows):
        for step in range(around):
            nxt = (step + 1) % around
            a = row * around + step
            b = row * around + nxt
            c = (row + 1) * around + nxt
            d = (row + 1) * around + step
            faces.append((a, b, c, d))
    return mesh_object("Tailored sleeveless bodice", vertices, faces, material, .006)


def make_skirt(material):
    around = 128
    rows = 72
    vertices = []
    faces = []
    rx_profile = [(0, .168), (.12, .183), (.28, .22), (.48, .28), (.72, .36), (1, .435)]
    ry_profile = [(0, .092), (.12, .098), (.28, .116), (.48, .15), (.72, .19), (1, .228)]
    for row in range(rows + 1):
        t = row / rows
        rx = smooth_profile(rx_profile, t)
        ry = smooth_profile(ry_profile, t)
        for step in range(around):
            angle = 2.0 * math.pi * step / around
            pleat = (math.cos(angle * 18.0 + .35) * .008 + math.sin(angle * 9.0 - .5) * .003) * (0.25 + .75 * t)
            waist_gather = .003 * math.cos(angle * 24.0) * (1.0 - t)
            radius_x = rx + pleat + waist_gather
            radius_y = ry + pleat * .58 + waist_gather * .6
            x = radius_x * math.sin(angle)
            y = -radius_y * math.cos(angle)
            z = .758 - .698 * t
            z += .012 * math.cos(angle * 18.0 + .35) * (t ** 1.6)
            z += .0025 * math.sin(angle * 7.0) * t
            vertices.append((x, y, z))
    for row in range(rows):
        for step in range(around):
            nxt = (step + 1) % around
            a = row * around + step
            b = row * around + nxt
            c = (row + 1) * around + nxt
            d = (row + 1) * around + step
            faces.append((a, d, c, b))
    return mesh_object("Flowing A-line skirt", vertices, faces, material, .008)


def curve_detail(name, points, bevel, material, cyclic=False):
    curve = bpy.data.curves.new(name + " path", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = bevel
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def make_neckline(material):
    points = []
    for step in range(160):
        angle = 2.0 * math.pi * step / 160
        front_angle = math.atan2(math.sin(angle), math.cos(angle))
        z = 1.205 - .078 * math.exp(-(front_angle / .52) ** 2)
        points.append((.178 * math.sin(angle), -.09 * math.cos(angle), z))
    curve_detail("Sweetheart neckline piping", points, .0022, material, True)


def make_waist_seam(material):
    points = []
    for step in range(128):
        angle = 2.0 * math.pi * step / 128
        points.append((.171 * math.sin(angle), -.093 * math.cos(angle), .774))
    curve_detail("Defined waist seam", points, .003, material, True)


def make_waistband(material):
    around = 128
    rows = 8
    vertices = []
    faces = []
    for row in range(rows + 1):
        t = row / rows
        z = .747 + .054 * t
        edge_taper = .002 * abs(t - .5) * 2.0
        for step in range(around):
            angle = 2.0 * math.pi * step / around
            rx = .171 + edge_taper
            ry = .099 + edge_taper * .5
            vertices.append((rx * math.sin(angle), -ry * math.cos(angle), z))
    for row in range(rows):
        for step in range(around):
            nxt = (step + 1) % around
            a = row * around + step
            b = row * around + nxt
            c = (row + 1) * around + nxt
            d = (row + 1) * around + step
            faces.append((a, b, c, d))
    return mesh_object("Continuous fitted waist band", vertices, faces, material, .004)


def make_hem(material):
    points = []
    for step in range(192):
        angle = 2.0 * math.pi * step / 192
        rx = .435 + .008 * math.cos(angle * 18.0 + .35)
        ry = .228 + .004 * math.cos(angle * 18.0 + .35)
        z = .060 + .012 * math.cos(angle * 18.0 + .35)
        points.append((rx * math.sin(angle), -ry * math.cos(angle), z))
    curve_detail("Fine curved hem piping", points, .0028, material, True)


def make_darts(material):
    for sign in (-1, 1):
        points = [
            (sign * .018, -.116, .85),
            (sign * .028, -.122, .91),
            (sign * .052, -.128, .99),
        ]
        curve_detail("Bodice shaping dart", points, .0018, material)


def scene_for_preview():
    bpy.ops.object.camera_add(location=(2.5, -4.8, 2.0))
    camera = bpy.context.object
    camera.name = "Preview camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.72
    target = Vector((0.0, 0.0, .64))
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    for name, location, energy, size in [
        ("Large soft key", (1.5, -3.2, 3.0), 450, 3.0),
        ("Front fill", (-2.4, -2.2, 1.7), 280, 2.5),
        ("Rim", (1.0, 2.2, 2.4), 500, 2.2),
    ]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.rotation_euler = (Vector((0.0, 0.0, .7)) - light.location).to_track_quat("-Z", "Y").to_euler()

    world = bpy.context.scene.world
    world.color = (.28, .28, .28)
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.30, .32, .36, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .5

    ground_material = bpy.data.materials.new("Preview background")
    ground_material.diffuse_color = (.91, .91, .93, 1)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0.0, 0.0, -.002))
    ground = bpy.context.object
    ground.name = "Preview ground (not exported)"
    ground.data.materials.append(ground_material)


def main():
    output_path, preview_path = args()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    cloth = satin_material()
    trim = trim_material()
    garment_objects = [make_bodice(cloth), make_skirt(cloth)]
    garment_objects.append(make_waistband(cloth))
    make_waist_seam(trim)
    make_neckline(trim)
    make_hem(trim)
    make_darts(cloth)
    for obj in bpy.context.scene.objects:
        obj["asset_type"] = "standalone_garment"
        obj["garment_category"] = "vestido"
        obj["body_regions"] = "torso, waist, legs"
        obj["avatar_compatibility"] = "standalone_display_only; not rigged"

    # Export only garment geometry, never the preview camera/lights/background.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in list(bpy.context.scene.objects):
        if obj.type in {"MESH", "CURVE"} and obj.name != "Preview ground (not exported)":
            obj.select_set(True)
    bpy.context.view_layer.objects.active = garment_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(output_path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )

    scene_for_preview()
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1050
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.abspath(preview_path)
    scene.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True)
    print("WROTE_GLB", os.path.abspath(output_path))
    print("WROTE_PREVIEW", os.path.abspath(preview_path))


if __name__ == "__main__":
    main()
