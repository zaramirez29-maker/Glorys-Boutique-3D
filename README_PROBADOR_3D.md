# Glory's Boutique — Probador virtual 3D (primera integración)

## Qué se incorporó

- Nueva sección **Probador virtual 3D** dentro del módulo de Realidad Aumentada.
- Acceso público desde `http://localhost:5173/ar`, en la pestaña **Probador virtual 3D**.
- Selector de avatar adulto femenino o masculino.
- Selector de 22 tipos de prendas y accesorios: camisa, blusa, camiseta, camisola, polo, chaqueta, suéter, pantalón, jeans, falda, shorts, bermudas, leggings, vestido, enterizo, conjunto, zapatos, tenis, sandalias, botas, bolso y accesorio.
- 12 colores configurables para el material de la prenda.
- Tallas de referencia XS, S, M, L, XL, XXL, 3XL y 4XL. El visor intenta ajustar el ancho/profundidad del nodo de la prenda si el modelo lo permite.
- 44 modelos GLB de demostración (22 tipos por 2 avatares) incluidos en `client/public/models/fitting/`.
- El catálogo de RA que ya existía y su administración se conservaron.

## Cómo ejecutar

No se agregaron dependencias npm ni se modificó el esquema MySQL para esta primera integración. Se utiliza el `model-viewer` que ya cargaba el proyecto desde `client/index.html`.

1. Conservá una copia de seguridad de tu carpeta actual.
2. Reemplazá el código del proyecto por el contenido de este ZIP. Si ya tenés un `server/.env` configurado, conservá ese archivo y no lo sustituyás por `.env.example`.
3. En una terminal, ejecutá el servidor:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

4. En otra terminal, ejecutá el cliente:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

5. Abrí `http://localhost:5173/ar` y seleccioná la pestaña **Probador virtual 3D**.

## Limitaciones técnicas que deben quedar claras

Esta entrega es un prototipo funcional de visualización 3D, no un sistema de simulación textil profesional. Los avatares y prendas incluidos son modelos geométricos estilizados generados para validar la integración, los selectores, la carga GLB, el cambio de material y el control de cámara. No tienen todavía anatomía fotorrealista, rigging de animación, simulación de tela, patrones de confección ni correspondencia de medidas corporales reales.

La talla es una referencia visual y el cambio de escala puede depender de las capacidades de edición del nodo del visor. No debe presentarse como garantía de ajuste. Para una versión comercial se deben sustituir los GLB de demostración por avatares y prendas profesionales compatibles entre sí, con mallas preparadas para cada talla y un flujo de pruebas en distintos navegadores.

La experiencia requiere conexión para cargar la librería `model-viewer` que el proyecto ya utiliza desde Google CDN. Los modelos GLB de demostración sí están guardados localmente en el proyecto.

## Seguimiento corporal con cámara (primera fase)

El probador incluye una pestaña **Cámara y pose** que solicita acceso a la cámara solo después de pulsar **Activar cámara**. Usa MediaPipe Pose Landmarker para detectar puntos corporales en el navegador y dibujar un esqueleto de referencia. El archivo del modelo de pose está guardado en `client/public/models/pose/`; los archivos WebAssembly de MediaPipe se cargan desde jsDelivr, por lo que esta función requiere conexión a Internet.

El video no se guarda ni se envía al backend. Al pulsar **Apagar cámara** o salir de la pestaña se detienen las pistas de cámara y el detector. Esta fase valida acceso, seguimiento y encuadre: todavía no coloca prendas sobre la persona ni calcula tallas. El esqueleto detectado no debe interpretarse como una prueba de ajuste. Para la colocación de ropa hacen falta prendas 3D con mallas, rigging y oclusión preparados para el seguimiento.
