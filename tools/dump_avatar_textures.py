import bpy, sys, os
source, folder = sys.argv[sys.argv.index('--') + 1:]
os.makedirs(folder, exist_ok=True)
bpy.ops.import_scene.gltf(filepath=source)
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in material.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            image = node.image
            name = f'{material.name}_{node.name}_{image.name}'.replace('/', '_')
            path = os.path.join(folder, name + '.png')
            image.filepath_raw = path
            image.file_format = 'PNG'
            image.save()
            print('TEXTURE', path, image.size[:])
