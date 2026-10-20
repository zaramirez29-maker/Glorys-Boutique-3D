# Captura y generación 3D desde fotografías

## Qué está implementado en esta fase

El componente administrativo GarmentPhotoStudio está disponible dentro del módulo AR solo para usuarios con rol admin. Permite:

- Elegir un producto registrado y describir la categoría, el público y el grupo de edad.
- Activar explícitamente una cámara y capturar imágenes JPG.
- Seleccionar o arrastrar varios archivos JPG/JPEG, PNG o WEBP.
- Clasificar fotos como frontal, posterior, laterales o detalle; ver y eliminar miniaturas.
- Validar decodificación de imagen, formato, tamaño máximo de 12 MB, resolución máxima de 40 MP y hasta 8 imágenes.
- Ver instrucciones de captura y un indicador de cobertura por vistas.

Las imágenes y metadatos se guardan solamente en el estado de React y URLs temporales del navegador. No se envían al servidor ni persisten tras salir o recargar. La interfaz informa que falta un proveedor; el botón Generar modelo 3D permanece deshabilitado. No hay generación, tarea de reconstrucción, GLB ni almacenamiento de imágenes implementados.

## Comparación de proveedores documentados

La selección queda pendiente de revisión de términos, derechos de datos e imágenes, plan/compra de créditos y autorización del propietario del proyecto.

| Proveedor | Entrada/salida documentada | Precio API documentado | Observaciones para Glory's Boutique |
| --- | --- | --- | --- |
| Meshy | Image-to-3D y Multi-Image-to-3D, tarea asíncrona; entrega URL temporal de GLB. Multi-Image acepta entre 1 y 4 imágenes del mismo objeto; la primera es la vista frontal. | Créditos prepagados. En Meshy-7.1, 20 créditos sin textura y 30 con textura para Multi-Image; Ultra añade 5 créditos. La documentación pública no fija aquí el equivalente en USD por crédito. | Mejor encaje inicial para un adaptador de varias vistas y GLB. Enviar fotos implica transferirlas al proveedor; revisar retención y contrato antes. La salida requiere validar forma, escala, licencia y preparación para avatar. |
| Tripo | Image-to-3D y Multi-view-to-3D; API de tareas, carga por tokens o almacenamiento temporal (STS), consulta de estado y exportación GLB documentada en el esquema API. | Créditos prepagados. En modelo P1.0, imagen o multivista cuesta 40 créditos sin textura y 50 con textura estándar; generaciones anteriores tienen otros costos. No se fija aquí equivalencia en USD por crédito. | Alternativa funcional con multivista y procesamiento asíncrono. La ruta STS carga archivos en almacenamiento del proveedor; requiere revisar alcance/retención y no se integraría desde el cliente con claves permanentes. |

Fuentes oficiales: [Meshy Multi-Image API](https://docs.meshy.ai/en/api/multi-image-to-3d), [tarifas de API Meshy](https://docs.meshy.ai/en/api/pricing), [ciclo y retención de tareas Meshy](https://docs.meshy.ai/en/api/task-lifecycle), [Tripo facturación](https://platform.tripo3d.ai/docs/billing), [Tripo carga STS](https://platform.tripo3d.ai/docs/upload-sts), [Tripo esquema API](https://platform.tripo3d.ai/docs/schema).

Los créditos no son dólares; el importe pagadero depende del paquete y cuenta vigentes. Ningún proveedor se integra ni se compra en esta fase. Aunque entreguen GLB, sus páginas documentan reconstrucción de objetos en general; no prometen patrones de confección, topología de tela, colisiones con cuerpo, ajuste por tallas ni compatibilidad con el rig de Glory's Boutique. Es necesario evaluar una muestra real de vestido antes de considerar adopción.

## Arquitectura propuesta para el siguiente paso

Mantener un adaptador propio independiente del proveedor:

    Admin UI
      -> POST /api/fitting/reconstruction-jobs (requiere admin)
      -> ReconstructionProvider.createJob(inputViews, metadata)
      -> proveedor externo (solo backend; secreto en server/.env)
      -> jobId guardado + estado consultable
      -> Provider.getJobStatus(jobId)
      -> descarga GLB a staging privado
      -> inspección geométrica + vista previa + revisión humana
      -> corrección/rigging/compatibilidad en DCC
      -> aprobación del administrador
      -> publicación del activo asociado a producto/variante

No debe enviarse nada hasta que el admin confirme de forma explícita el envío a un proveedor externo y la interfaz explique que las fotos saldrán del sistema. No usar URL pública para fotos privadas. Preferir transferencia backend o carga STS corta y controlada; eliminar copias temporales según una política documentada. Nunca poner una API key fija en Vite.

Estados recomendados: draft, queued, processing, generated, review_required, rejected, needs_modeling, rigged, approved, published, failed. Generar geometry no significa que el activo esté listo para vestir un avatar.

## Validación antes de aprobación/publicación

1. Descargar a almacenamiento de staging fuera de la carpeta pública.
2. Comprobar MIME/magic bytes y tamaño del GLB; procesar en worker con límites de memoria/tiempo.
3. Validar contenedor glTF, mallas no vacías, buffers/materiales, bounds, escala, orientación, normales y complejidad.
4. Previsualizar el resultado aislado; no cargar activos sin revisión directa.
5. Marcar explícitamente si contiene esqueleto, morph targets, UVs y materiales. Un vestido puede ser una malla visible sin skinning y aun así no servir para vestir.
6. Ajustar topología/UV/rig y tallas en herramienta 3D; comprobar colisión visual sobre el avatar objetivo.
7. Asociar un producto y variantes reales; definir compatibilidad de avatar, edad, rig, talla, color y licencia.
8. Mantenerlo como borrador hasta aprobación humana.

## Pendiente de autorización/recursos

- Elegir el proveedor tras comparar términos, tratamiento de imágenes y coste real en USD del plan/cuenta.
- Autorizar créditos/API externos antes de realizar una generación pagada.
- Crear almacenamiento privado y política de eliminación para fotos y GLB.
- Definir un trabajo backend y tablas aditivas para tareas/activos, con migración reversible revisada contra la BD de cada entorno.
- Conseguir un avatar humano profesional y una prenda de referencia con licencia y rig comunes. Un resultado de IA debe pasar por revisión de geometría y confección.
