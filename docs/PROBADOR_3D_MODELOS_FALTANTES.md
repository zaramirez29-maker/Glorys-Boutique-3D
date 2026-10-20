# Recursos pendientes para el probador 3D

El estado de los recursos se registra en `client/public/models/try-on/library.json`.
El componente solo presenta productos reales del catálogo y no utiliza los GLB
geométricos de demostración como ropa vestible.

## Archivos requeridos

Avatares:

- `client/public/models/avatars/man-adult.glb`
- `client/public/models/avatars/boy.glb`
- `client/public/models/avatars/girl.glb`

El avatar femenino disponible en `client/public/models/avatars/cc0-grab3d/woman-rigged.glb`
es un personaje de licencia CC0, pero ya lleva chaqueta, top, pantalón y zapatos.
No es una base corporal neutra para superponer prendas.

Prendas iniciales:

- `client/public/models/try-on/garments/camiseta.glb`
- `client/public/models/try-on/garments/camisa.glb`
- `client/public/models/try-on/garments/blusa.glb`
- `client/public/models/try-on/garments/pantalon.glb`
- `client/public/models/try-on/garments/jeans.glb`
- `client/public/models/try-on/garments/vestido.glb`
- `client/public/models/try-on/garments/falda.glb`
- `client/public/models/try-on/garments/chaqueta.glb`
- `client/public/models/try-on/garments/camisola.glb`
- `client/public/models/try-on/garments/zapatos.glb`

## Requisitos de integración

Cada avatar debe ser una malla humana completa en pose neutra, con escala y
esqueleto documentados. Cada prenda debe ser geometría textil propia, una malla
separada y ajustada al cuerpo compatible. Para vestirla en movimiento necesita
pesos de skinning y un armature compatible con el avatar asignado; las
dimensiones/tallas requieren variantes de patrón o malla preparadas para esa
talla. Cambiar el color o escalar globalmente un GLB no sustituye esos datos.

Los modelos independientes usados por RA tampoco se pueden asumir como ropa
vestible: el probador exige metadatos de compatibilidad y una malla preparada
para el cuerpo. La asignación del producto usa categoría/subcategoría exacta;
no infiere una prenda a partir del nombre comercial.

No se modificó el esquema comercial ni se ejecutaron migraciones.
