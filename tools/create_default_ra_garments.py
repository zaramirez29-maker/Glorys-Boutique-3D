"""Create standalone, project-authored clothing display GLBs for the RA gallery.

These are independent product-display models. They are not skinned or claimed
to fit the avatar in the virtual fitting room.
"""
import math
import os
import sys

import bpy
from mathutils import Vector


def material(name, color, roughness=0.78):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat


def ring_mesh(name, rings, material_slot, sides=32):
    verts, faces = [], []
    for z, cx, rx, ry in rings:
        for i in range(sides):
            a = 2 * math.pi * i / sides
            verts.append((cx + rx * math.cos(a), ry * math.sin(a), z))
    for row in range(len(rings) - 1):
        for i in range(sides):
            a = row * sides + i
            b = row * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material_slot)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = True
    solid = obj.modifiers.new('Fabric thickness', 'SOLIDIFY')
    solid.thickness = 0.008
    bevel = obj.modifiers.new('Soft cloth edges', 'BEVEL')
    bevel.width, bevel.segments = 0.006, 2
    return obj


def sleeve(name, start, end, r0, r1, mat):
    axis = Vector(end) - Vector(start)
    direction = axis.normalized()
    basis_a = direction.cross(Vector((0, 1, 0))).normalized()
    basis_b = direction.cross(basis_a).normalized()
    verts, faces = [], []
    n = 20
    for t, radius in ((0, r0), (.28, r0 * .96), (.75, r1 * 1.08), (1, r1)):
        center = Vector(start).lerp(Vector(end), t)
        for i in range(n):
            a = 2 * math.pi * i / n
            p = center + basis_a * (radius * math.cos(a)) + basis_b * (radius * math.sin(a))
            verts.append(tuple(p))
    for row in range(3):
        for i in range(n):
            a = row * n + i
            b = row * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = True
    solid = obj.modifiers.new('Fabric thickness', 'SOLIDIFY')
    solid.thickness = 0.008


def make_top(name, mat, long_sleeve=True, jacket=False):
    rings = [(.82, 0, .19, .105), (.88, 0, .205, .115), (1.08, 0, .195, .11),
             (1.27, 0, .23, .115), (1.38, 0, .255, .12), (1.43, 0, .105, .09)]
    ring_mesh(name + ' fabric body', rings, mat)
    for sign in (-1, 1):
        start = (sign * .205, 0, 1.34)
        end = (sign * (.36 if long_sleeve else .30), 0, 1.08 if long_sleeve else 1.22)
        sleeve(name + ' sleeve', start, end, .09, .065 if long_sleeve else .075, mat)
    if jacket:
        accent = material('Jacket lapel', (.26, .13, .07))
        for sign in (-1, 1):
            mesh = bpy.data.meshes.new('Lapel panel')
            mesh.from_pydata([(0, -.124, 1.42), (sign * .09, -.126, 1.33),
                              (sign * .055, -.126, 1.08), (0, -.123, 1.22)], [], [(0, 1, 2, 3)])
            mesh.materials.append(accent)
            obj = bpy.data.objects.new('Tailored lapel', mesh)
            bpy.context.collection.objects.link(obj)


def make_trousers(name, mat, denim=False):
    for sign in (-1, 1):
        cx = sign * .115
        ring_mesh(name + ' leg', [(.05, cx, .078, .085), (.13, cx, .082, .09),
            (.43, cx, .095, .10), (.68, cx, .12, .115), (.91, cx, .125, .12)], mat)
    ring_mesh(name + ' waistband', [(.87, 0, .255, .13), (.96, 0, .25, .13)], mat)
    if denim:
        seam = material('Denim seam', (.16, .28, .34))
        # Narrow front fly and pocket stitching are raised cloth strips.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=(0, -.132, .82), scale=(.008, .004, .075))
        bpy.context.object.name = 'Denim fly seam'
        bpy.context.object.data.materials.append(seam)


def make_skirt(mat):
    ring_mesh('A-line skirt panels', [(.74, 0, .20, .12), (.78, 0, .205, .12),
        (.92, 0, .215, .125), (1.12, 0, .28, .16), (1.34, 0, .37, .21)], mat, 40)
    ring_mesh('Skirt waistband', [(.73, 0, .205, .123), (.79, 0, .205, .123)],
        material('Skirt waistband trim', (.22, .12, .18)), 40)


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False,
                              export_apply=True, export_yup=True)


def main():
    out_dir = sys.argv[sys.argv.index('--') + 1]
    os.makedirs(out_dir, exist_ok=True)
    looks = [
        ('camiseta-ra.glb', lambda: make_top('Classic T-shirt', material('Cotton | ivory', (.72, .59, .42)), False)),
        ('camisa-ra.glb', lambda: make_top('Oxford shirt', material('Cotton | blue', (.17, .34, .52)), True)),
        ('pantalon-ra.glb', lambda: make_trousers('Tailored trousers', material('Woven cloth | navy', (.035, .065, .16)))),
        ('jeans-ra.glb', lambda: make_trousers('Denim jeans', material('Denim | indigo', (.12, .27, .37)), True)),
        ('falda-ra.glb', lambda: make_skirt(material('Soft fabric | plum', (.32, .075, .23)))),
        ('chaqueta-ra.glb', lambda: make_top('Tailored jacket', material('Wool | camel', (.34, .18, .09)), True, True)),
    ]
    for filename, create in looks:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        create()
        export(os.path.join(out_dir, filename))


main()
