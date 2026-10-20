# Estado de implementación de la biblioteca 3D

Fecha de revisión: 13 de octubre de 2026.

## Resultado

La biblioteca solicitada (cuatro avatares intercambiables y diez prendas independientes vestibles) **no está implementada**. No se agregaron GLB ficticios, recursos sin licencia comprobada, ni una interfaz que afirme que prendas incompatibles se pueden vestir.

## Auditoría local reproducible

Se leyeron los encabezados GLB y los chunks JSON con Node.js 24.11.1:

| Archivos | Resultado estructural | Uso en el probador |
| --- | --- | --- |
| 44 archivos en `client/public/models/fitting/` | GLB 2.0 válido; cada uno declara 13 mallas, 14 nodos, 2 materiales, 0 esqueletos y 0 animaciones | No pueden deformarse sobre un cuerpo. Los nombres de archivo no prueban que su geometría corresponda a la categoría. |
| `client/public/models/vestido-elegante-demo.glb` | GLB 2.0, creado localmente en Blender; 8 mallas, silueta de vestido largo con escote corazón, cuerpo, cintura, falda A-line y detalles de acabado | Modelo independiente para la vista de producto/RA. Renderizado y reimportado para comprobar la geometría. No está riggeado para vestir el avatar. |

Que un GLB pase la lectura de encabezado/JSON solo confirma que el contenedor y su JSON se pueden analizar. No valida la apariencia, anatomía, licencia, ajuste o deformación del modelo.

Blender 4.5 LTS se ejecutó desde una copia portable local; no se agregó una dependencia al sistema. `client/package.json` tampoco incluye Three.js; el visor de producto existente usa `model-viewer` para la vista de modelo/RA, que no implementa por sí mismo el sistema de ropa sobre un rig.

## Recursos revisados y decisión

| Recurso | Licencia / capacidad publicada | Decisión para esta entrega |
| --- | --- | --- |
| [Grab3D Character Mixer](https://grab3d.com/tools/character-mixer/) | Publica exportación GLB con skinning, 19 huesos y animaciones bajo CC0-1.0. Sus personajes se arman con piezas y tres estilos; exporta un personaje completo con ropa. | No incorporado. No documenta perfiles específicos de niño/niña y el archivo exportado es el personaje vestido, no diez prendas independientes intercambiables para el probador. La apariencia es estilizada, no realista. |
| [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) | CC0, modelos humanoides con rig y proporciones anunciadas como Regular, Superhero y Teen. | No incorporado. Teen no acredita proporciones infantiles; tampoco aporta por sí solo la biblioteca de ropa de boutique. |
| [Quaternius Modular Character Outfits - Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) | CC0, 12 atuendos/62 partes, rig humanoide y compatibilidad declarada con Universal Base Characters. | No incorporado. Es indumentaria de fantasía; no se presenta como camiseta, blusa, jeans, vestido, falda, chaqueta, camisola y zapatos de Glory's Boutique preparados por talla. |
| [Innerscene: Mina, toddler](https://www.innerscene.com/tools/library/3d-parts/mina-3d-person-toddler-standing-a3361460) | La ficha declara CC0 y un modelo GLB con materiales derivado de activos MakeHuman/MPFB. | No incorporado. La ficha consultada no declara que el GLB descargable contenga un esqueleto; un avatar infantil aislado tampoco resuelve el rig compartido ni las prendas adaptadas. |

Los recursos de Grab3D y Quaternius son alternativas de autoría o posibles bases, no archivos examinados e instalados en este repositorio. No se afirma que se hayan descargado ni probado.

## Integración y datos comerciales

La relación existente `productos_ar` configura un modelo de producto para su visor, no una prenda adaptable al avatar. No se agregaron tablas ni seeds de avatares/ropa. El migrador actual ejecuta `sequelize.sync({ alter: true })` y, salvo que `DB_SEED=false`, ejecuta además el seed comercial. Ampliar los modelos Sequelize y arrancar la aplicación podría cambiar el esquema; por eso no se hizo una migración aditiva o un seed no solicitado sin una estrategia revisada de migración y protección de datos.

## Pendientes para cumplir el criterio de aceptación

1. Obtener cuatro modelos con licencia redistribuible comprobada, incluyendo avatares infantiles con proporciones infantiles reales, y comprobar que sus archivos contienen el rig previsto.
2. Obtener o producir diez prendas 3D independientes (incluidos calzado), con mallas/materiales reconocibles y archivos fuente/licencia.
3. Adaptar y pesar cada prenda a un rig común; preparar perfiles infantiles/adultos y archivos de talla modelados, no escalados globalmente.
4. Validar deformación, colisiones, penetración y escala en un visor WebGL, en poses y vistas múltiples.
5. Implementar manifiesto local, compatibilidad validada en cliente/API, selector de color/talla y migración reversible aislada de inventario y demás datos comerciales.
6. Probar visualmente cada combinación permitida y las rechazadas en escritorio y móvil.

No se declara exitosa ninguna prueba de vestido sobre avatar, talla, color de material o compatibilidad: todavía no existen recursos adecuados para ejecutarlas.
