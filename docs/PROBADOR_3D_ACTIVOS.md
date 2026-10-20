# Incorporación de avatares y prendas profesionales

## Resultado de la inspección local

- `client/public/models/fitting/` contiene 44 GLB de demostración. Su estructura es de 12 piezas `Avatar0…Avatar11` y un nodo `Prenda`; los archivos inspeccionados no tienen `skins` ni esqueleto.
- `client/public/models/vestido-elegante-demo.glb` fue reemplazado por un vestido largo independiente, creado y renderizado con Blender. Tiene 8 mallas de cuerpo, falda, cinturilla y detalles; sigue sin rig, por lo que no es una prenda que se aplique al avatar.
- No hay avatares masculinos/infantiles ni mallas de ropa compatibles con un avatar. Blender 4.5 LTS se usó en modo portable; MakeHuman no está instalado.
- `productos_ar` es una relación uno a uno con el producto para la vista de RA. `producto_variantes` contiene color y talla comerciales, e `inventario` guarda unidades por variante. La vista de RA coloca un modelo sobre una superficie; eso no lo convierte en una prenda riggeada.

El nuevo vestido está destinado a la vista independiente de producto/RA asociada al registro existente de producto. No se presenta como prenda vestida en el avatar. La biblioteca de prueba virtual requiere todavía los cuatro cuerpos neutros y modelos de ropa riggeados compatibles.

## Fuentes de modelos y licencias

MakeHuman publica sus activos gráficos centrales bajo CC0, mientras que el código de MakeHuman se distribuye bajo AGPL. El equipo puede usar MakeHuman o MPFB como herramienta de autoría y exportar los modelos gráficos generados; no hace falta incorporar el código de MakeHuman a Glory's Boutique por seguir ese flujo. Cada paquete de terceros descargado debe revisarse por separado, porque puede llevar CC0, CC-BY u otra licencia. Fuentes: [licencia de MakeHuman](https://static.makehumancommunity.org/about/license.html), [licencia detallada del proyecto](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md), [licencia de activos de terceros](https://static.makehumancommunity.org/oldsite/faq/what_do_i_need_to_do_when_i_use_a_ccby_asset.html).

MakeHuman expone controles de edad y permite crear proporciones infantiles. Es una vía potencial para generar las cuatro bases requeridas (mujer adulta, hombre adulto, niña y niño), pero esta carpeta aún no contiene esas exportaciones; su apariencia, proporciones, anatomía y licencias de cada textura/ropa tendrán que revisarse antes de publicarlas. Referencia: [controles de edad del modelo](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/apps/human.py).

Blender puede exportar glTF/GLB con mallas, materiales, animación, skinning y shape keys. El archivo final debe validar el esqueleto, pesos de vértices, escala, materiales, polígonos y rendimiento en móvil. Fuente: [exportador glTF de Blender](https://docs.blender.org/manual/en/3.5/addons/import_export/scene_gltf2.html).

## Contrato de metadatos propuesto

Los nombres de categoría y el género comercial no bastan para decidir compatibilidad. Cada activo de ropa necesita una configuración aprobada, explícita y relacionada con el producto y sus variantes comerciales.

```json
{
  "asset_id": "uuid",
  "product_id": 123,
  "variant_id": 456,
  "asset_kind": "garment",
  "garment_category": "dress",
  "body_slot": "full_body",
  "target_group": "women",
  "age_group": "adult",
  "compatible_avatar_types": ["adult_female"],
  "rig_id": "glory_humanoid_v1",
  "model_url": "/models/garments/123/456.glb",
  "material_slots": ["fabric_main", "buttons"],
  "commercial_size": "M",
  "fit_asset_url": "/models/garments/123/456-M.glb",
  "approval_status": "draft",
  "license": { "name": "CC0-1.0", "source_url": "https://…" }
}
```

El registro anterior describe el contrato de integración, no un activo real. `variant_id`, color y talla deben corresponder a registros existentes de `producto_variantes`; un GLB no crea disponibilidad comercial ni inventario.

### Reglas de compatibilidad

1. Un avatar se identifica por `avatar_type`, `age_group` y `rig_id`; los cuatro tipos iniciales son `adult_female`, `adult_male`, `child_female` y `child_male`.
2. Una prenda se puede listar solo si está aprobada, el producto sigue registrado, existe su variante real y el `avatar_type` aparece en su lista explícita de compatibilidad.
3. El rig de la prenda y del avatar deben coincidir, o existir una adaptación aprobada declarada. Una coincidencia por categoría, nombre o público objetivo no autoriza la prueba.
4. Color y talla salen de las variantes reales con inventario. Cada talla de ajuste necesita un GLB/patrón preparado; no se escala arbitrariamente la prenda.
5. El frontend filtra y explica incompatibilidades, pero la API vuelve a validar el avatar, el activo, la variante y su aprobación antes de devolver o guardar una combinación.
6. Al cambiar avatar se retiran las prendas incompatibles y se conserva solo el resto que pase la validación de zona corporal y rig.
7. El endpoint público solo expone modelos aprobados. Las cargas, revisión y aprobación son operaciones administrativas.

## Cambios de base de datos necesarios en una fase posterior

`productos_ar` no puede representar múltiples prendas adaptadas, avatares, rigs ni perfiles de talla. La ampliación debería agregar tablas aisladas, por ejemplo:

- `fitting_avatars`: tipo, edad, rig, archivo GLB, licencia y estado de aprobación.
- `fitting_assets`: producto, variante opcional, categoría, zona del cuerpo, grupo objetivo, rig, GLB, materiales, licencia y aprobación.
- `fitting_compatibility`: activo, tipo de avatar y rig/adaptación aprobada.
- `fitting_size_assets`: activo, variante comercial, talla y archivo/patrón de ajuste preparado.

Estas tablas no deben alterar productos, ventas ni inventario. La migración debe ser aditiva, reversible y ejecutarse solo tras comprobar el esquema de cada entorno. No se creó ni ejecutó una migración en esta etapa. Conviene no añadir los modelos Sequelize antes de tener una migración explícita: el proyecto activa `sequelize.sync({ alter: true })` en su flujo de migración actual.

## Geometría, deformación y tela

- Primera capa: modelos hechos en Blender/CLO/Marvelous Designer, convertidos a mallas optimizadas y ajustadas por talla.
- Movimiento corporal: esqueleto común y skinning probado por avatar; shape keys solo para ajustes localizados preparados en la malla.
- Simulación: iniciar con deformación esquelética estable. Evaluar tela en tiempo real de forma selectiva para faldas/vestidos, con límites de polígonos y una ruta reducida para teléfonos. La tela horneada en una animación no es física interactiva.
- Render en probador: cuando haya activos riggeados, incorporar Three.js con `GLTFLoader` y renderer WebGL para escena y control de esqueletos; conservar `model-viewer` para la actual vista de producto en RA. La cámara de MediaPipe sigue siendo una experiencia distinta y no determina por sí sola profundidad, oclusión ni ajuste textil.
- Carga: traer solo el avatar y las prendas seleccionadas, liberar geometrías/texturas/materiales al cambiar, y probar los GLB en escritorio y móvil.

## Pasos para que el primer activo pueda integrarse

1. Usar Blender 4.5 LTS portable disponible y, cuando haga falta una herramienta de autoría humana, evaluar MakeHuman/MPFB; crear/exportar los cuatro avatares y guardar fuente y procedencia de cada activo.
2. Validar el CC0 del activo base y registrar por separado cualquier textura, ropa o complemento externo.
3. Crear en Blender el rig de referencia y exportar GLB con skinning; revisar que el esqueleto conserve nombres/jerarquía acordados.
4. Preparar una prenda real sobre ese rig y crear archivos de ajuste para cada talla comercial disponible; no publicar un archivo todavía sin revisar.
5. Incorporar el GLB y metadatos como borrador, validar la compatibilidad en API y visor, y aprobarlo desde flujo administrativo antes de exponerlo al cliente.

La generación de un GLB desde una foto no basta para completar los pasos de ajuste, rigging y aprobación. Un modelo derivado de una sola fotografía tampoco revela la geometría oculta de toda la prenda.
