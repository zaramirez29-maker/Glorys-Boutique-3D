import bpy
import sys

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)

for obj in bpy.context.scene.objects:
    print('OBJECT', obj.name, obj.type)
    if obj.type != 'MESH':
        continue
    print('  VERTICES', len(obj.data.vertices), 'POLYGONS', len(obj.data.polygons))
    print('  MATERIALS', [material.name if material else None for material in obj.data.materials])
    for material in obj.data.materials:
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                print('  IMAGE', node.image.name, node.image.size[:], node.image.file_format)
