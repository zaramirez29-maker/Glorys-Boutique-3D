# Decisión técnica: activos 3D de ropa y probador

Fecha de revisión: 13 de octubre de 2026.

## Decisión

No se conectó un generador de fotografías a 3D. En la revisión no se encontró un servicio que, a partir de fotos de una prenda, entregue de forma garantizada una malla de confección con patrón, texturas revisables, rig compatible y ajuste validado para el avatar. Integrar un generador genérico como si resolviera ese trabajo produciría modelos que no se pueden probar correctamente.

## Alternativas revisadas

| Solución | Lo que documenta | Límite para Glory's Boutique |
| --- | --- | --- |
| Meshy Multi-Image to 3D | Genera GLB desde 1–4 imágenes y ofrece tareas de rigging/animación. La tarifa publicada para el modelo con textura es 30 créditos por generación. | Es generación de objetos 3D general; no promete patrones de ropa, ajuste a un cuerpo ni prendas listas para probar. La API es prepaga. No se enviaron imágenes ni se consumieron créditos. |
| WEARFITS API | Ofrece prueba de ropa en imagen, avatares digitales y generación GLB de zapatos/bolsos. | La prueba de ropa documentada produce una imagen; la generación GLB documentada se limita a calzado y bolsos. No cubre el vestido 3D riggeado requerido. Términos comerciales dependen de la cuenta. |
| Browzwear VStitcher | Software de creación de prendas digitales con patrones, materiales, costuras y simulación; ofrece API de plugins en C/C++/C#/Python y CLI para procesamiento. | Es un flujo de diseño de ropa digital, no una API que reconstruya una prenda a partir de fotos. Requiere licencia, archivos de patrón/garment y confirmación comercial. |
| Activos de MakeHuman | Los activos incluidos se publican bajo CC0 según la licencia del proyecto. | Es una fuente potencial para producir avatares base; aún requiere generar/exportar los modelos, inspeccionar el rig y validar la licencia de cada activo adicional. No resuelve la ropa. |

## Flujo propuesto

1. Incorporar un avatar humano adulto con licencia comprobada y un esqueleto definido.
2. Crear o conseguir un vestido 3D de confección preparado para ese esqueleto, incluyendo su archivo fuente, materiales, licencia y variante de talla.
3. Exportar el avatar y vestido a GLB/GLTF, verificar pesos de skinning y deformación sobre el mismo rig y revisar la geometría desde varios ángulos.
4. Asociar solo el modelo aprobado al producto existente. Mantener la foto comercial como respaldo.
5. Añadir la reconstrucción automática de fotos cuando se seleccione un proveedor que entregue resultados adecuados y se aprueben cuenta, privacidad y costos.

## Requisitos antes de activar generación remota

- Proveedor y cuenta comercial aprobados.
- Presupuesto o créditos autorizados por el usuario.
- Clave almacenada solo en `server/.env`; nunca en `client`.
- Retención y eliminación de imágenes revisadas.
- Validación de archivo GLB, revisión humana y aprobación antes de asociarlo al producto.

## Fuentes oficiales

- Meshy API y exportaciones: https://docs.meshy.ai/en
- Precios Meshy API: https://docs.meshy.ai/en/api/pricing
- WEARFITS API: https://api.wearfits.com/
- VStitcher API: https://help.browzwear.com/en/articles/13066093-vstitcher-api
- Licencia de MakeHuman: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md
