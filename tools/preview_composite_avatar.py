import bpy, sys
from mathutils import Vector

source, output = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world.color = (.22, .22, .22)

def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add(location=(0, -4.3, .87))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.0
aim(camera, (0, 0, .87))
scene.camera = camera

for location, energy, size in [((-3, -4, 5), 750, 4), ((3, -1, 3), 450, 3), ((0, 2, 4), 500, 3)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light, (0, 0, .85))

scene.render.filepath = output
bpy.ops.render.render(write_still=True)
