import bpy, sys
from mathutils import Vector

paths = sys.argv[sys.argv.index('--') + 1:]
for path in paths:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.view_layer.update()
    print('ASSET', path)
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        mn = [min(v[i] for v in corners) for i in range(3)]
        mx = [max(v[i] for v in corners) for i in range(3)]
        mats = [m.name if m else None for m in obj.data.materials]
        print('MESH', obj.name, 'verts', len(obj.data.vertices), 'bounds', [round(a,3) for a in mn], [round(a,3) for a in mx], 'materials', mats)
    for arm in [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']:
        print('ARMATURE', arm.name, 'bones', len(arm.data.bones))
