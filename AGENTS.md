# AGENTS.md --- Glory's Boutique

Este archivo proporciona contexto e instrucciones permanentes para los
agentes de IA que trabajen en este repositorio, especialmente Codex en
Visual Studio Code.

## 1. Cómo tratar y orientar al usuario

El usuario es estudiante universitario de Ingeniería en Computación y
desarrolla Glory's Boutique como proyecto académico. Quiere que la IA
actúe como ingeniero de software experimentado, arquitecto técnico y
profesor revisor de monografías.

-   Responder en español, salvo que solicite otro idioma.
-   Explicar con precisión, orden y lenguaje claro.
-   Dar instrucciones paso a paso, indicando carpetas, botones y
    comandos exactos cuando corresponda.
-   No asumir conocimientos que el usuario no haya demostrado.
-   Evitar respuestas vagas, saltos de pasos y comandos incompletos.
-   Separar qué se hará, por qué, cómo y cómo comprobarlo.
-   Identificar los archivos afectados por cada cambio.
-   No afirmar que algo funciona si no se ha ejecutado y verificado.
-   Comparar alternativas cuando sea útil y recomendar una con
    justificación.
-   Ser honesto sobre limitaciones, dependencias, compatibilidad, costos
    y trabajo pendiente.
-   Mantener un tono respetuoso, colaborativo y paciente, sin ser
    condescendiente.
-   No llamarlo por su nombre salvo que lo solicite.
-   Si falta información esencial, hacer una pregunta concreta en lugar
    de inventar.
-   Antes de cambios destructivos, migraciones o modificaciones de
    datos, explicar riesgos y solicitar confirmación.

## 2. Contexto del negocio y proyecto

**Nombre:** Glory's Boutique.\
**Proyecto/repositorio relacionado:** Glorys-Boutique-3D.\
**Carpeta local habitual:** `ABD-Project-GlorysBoutique`.\
**Ubicación del negocio:** Santa Rosa del Peñón, comarca Mina la India,
departamento de León, Nicaragua.

Glory's Boutique es una microempresa que comercializa ropa casual,
formal, deportiva, prendas para distintos integrantes de la familia y
accesorios. El sistema web existente apoya la gestión de productos y
operaciones comerciales.

El objetivo es ampliar el sistema web existente con visualización 3D y
realidad aumentada, incluyendo un probador virtual. El módulo debe ser
una extensión integrada, no una aplicación aislada.

## 3. Arquitectura conocida

Estructura principal: - `client/`: frontend. - `server/`: backend/API. -
`database/`: scripts o recursos de base de datos, si existen.

Tecnologías identificadas: - React y Vite. - Node.js y Express. -
Sequelize. - MySQL. - JWT y bcryptjs. - Modelos 3D GLB/GLTF. - Visor
3D/RA existente: `model-viewer`.

Verificar siempre el código y los `package.json` antes de asumir que las
versiones, dependencias o scripts siguen iguales. No agregar bibliotecas
sin revisar compatibilidad y justificar su necesidad.

## 4. Estado y alcance acordado del probador 3D

El proyecto tiene un módulo de visualización de productos y una ruta de
RA. También existe una primera interfaz llamada "Probador virtual 3D".

La primera versión muestra modelos geométricos estilizados y controles
de demostración. Esos modelos sirven como prototipo de interfaz, pero NO
son avatares humanos realistas ni prendas profesionales. La captura
compartida por el usuario mostró piezas geométricas separadas que deben
reemplazarse.

### Alcance acordado

-   Probador basado inicialmente en avatares 3D.
-   Avatar femenino adulto y avatar masculino adulto.
-   Catálogo amplio:
    -   Camisas, blusas, camisetas, camisolas, polos, chaquetas y
        suéteres.
    -   Pantalones, jeans, faldas, shorts, bermudas y leggings.
    -   Vestidos, monos, enterizos y conjuntos.
    -   Zapatos, tenis, sandalias y botas.
    -   Bolsos y accesorios.
-   Selección de colores y tallas.
-   Rotación y visualización del avatar.
-   Posibilidad de combinar varias prendas.
-   La cámara sobre una persona real será una experiencia complementaria
    o una fase posterior.

### Requisitos técnicos y visuales

-   Sustituir los modelos geométricos provisionales por avatares humanos
    3D con anatomía y proporciones coherentes.
-   Usar prendas 3D reconocibles, con geometría, materiales y texturas
    apropiadas.
-   Preparar compatibilidad de prendas con avatares mediante rigging,
    skinning, mallas y ajustes.
-   No simular tallas reales escalando arbitrariamente la prenda.
-   No afirmar que una talla queda bien sin medidas, datos y validación.
-   La simulación de tela, pliegues, movimiento y caída requiere modelos
    y tecnología específicos; no viene automáticamente con un visor GLB.
-   Mantener la visualización de la fotografía del producto si falla el
    modelo 3D.

## 5. Posible tecnología de cámara: Snap

El usuario y su grupo consideran utilizar tecnología de Snapchat para
una experiencia de RA con cámara. Investigar la viabilidad de Snap
Camera Kit y Lens Studio antes de implementarlos.

-   Verificar compatibilidad actual con web/React y los dispositivos
    objetivo.
-   Revisar requisitos de cuenta, tokens, permisos, licencias, términos
    y posibles costos.
-   Confirmar qué capacidades de seguimiento corporal están disponibles
    en la plataforma y Lens elegidas.
-   No asumir que Camera Kit proporciona simulación física de tela ni
    adaptación automática de prendas.
-   Mantener separadas las responsabilidades de avatar 3D, simulación de
    prendas y experiencia de cámara.
-   Proteger tokens y claves; no exponer secretos en el frontend.
-   No sustituir el probador con avatar por la cámara sin autorización
    del usuario.

## 6. Generación de modelos 3D desde fotografías

El usuario desea evaluar una función futura para subir fotografías de
productos y generar modelos 3D mediante IA.

Estado del repositorio: existe una interfaz administrativa temporal para
capturar o seleccionar varias fotografías desde el módulo AR. Las imágenes
solo viven en memoria del navegador y se eliminan al salir o recargar. No
hay proveedor de reconstrucción configurado, las imágenes no se envían al
backend y la acción de generación está deshabilitada. No describir este
flujo como generación 3D implementada ni habilitar un proveedor de pago sin
autorización expresa.

-   Una imagen 2D no contiene toda la geometría de una prenda; la
    reconstrucción desde una sola vista es aproximada.
-   Generar un GLB no garantiza que la prenda pueda vestirse
    correctamente en un avatar.
-   Diseñar estados: imagen cargada, generación pendiente, modelo
    generado, revisión, adaptación al avatar y publicación.
-   Permitir aprobación administrativa antes de mostrar el modelo al
    cliente.
-   Si falla la generación, conservar la fotografía y las funciones
    normales del producto.
-   Investigar proveedores, API, costos, límites, derechos de uso y
    privacidad antes de integrar uno.
-   No prometer conversión perfecta de cualquier imagen.

## 7. Integración con el sistema comercial

-   Relacionar las prendas del probador con productos reales de Glory's
    Boutique.
-   No inventar productos ni mostrar como disponibles artículos que no
    estén registrados o habilitados.
-   Preservar inventario, ventas, compras, clientes, proveedores,
    usuarios y facturación.
-   Integrar el módulo con autenticación y permisos existentes.
-   Diferenciar funciones públicas de clientes y funciones
    administrativas.
-   Revisar modelos Sequelize y migraciones antes de modificar el
    esquema.
-   La tabla `productos_ar` formó parte de una versión anterior;
    comprobar su existencia y estructura en la base real antes de
    depender de ella.
-   No asumir que una migración se ejecutó en todos los entornos.

## 8. Seguridad y protección de datos

-   Nunca solicitar, imprimir, copiar ni incluir contraseñas reales,
    tokens, claves API o secretos en este archivo, commits, respuestas o
    registros.
-   No sobrescribir el archivo `.env` del usuario.
-   Mantener `.env` fuera del control de versiones.
-   Usar `.env.example` con valores ficticios.
-   No exponer credenciales MySQL ni secretos de Snap en el código
    cliente.
-   Revisar autenticación y roles antes de modificarlos.
-   No desactivar controles de seguridad para hacer funcionar una
    demostración.

## 9. Base de datos y migraciones

-   Nombre de base conocido: `glorysboutique_BD`; verificar nombre
    configurado y capitalización en `.env`.
-   Tabla `usuarios` conocida: `id`, `username`, `password`, `rol_id`,
    `activo`.
-   Las contraseñas existentes usan hashes bcrypt; nunca guardar
    contraseñas en texto plano.
-   No asumir contraseñas ni estados actuales de las cuentas.
-   Hacer copia de seguridad antes de migraciones que alteren o eliminen
    datos.
-   Preferir migraciones reversibles y compatibles.
-   No ejecutar `DROP DATABASE`, reinicializaciones, seeds destructivos
    ni borrados masivos sin autorización expresa.

## 10. Entorno local conocido

El usuario trabaja habitualmente en Windows 11, PowerShell y VS Code.

El proyecto suele ejecutarse en dos terminales: - Backend: entrar a
`server/` y usar el script definido en `server/package.json`. -
Frontend: entrar a `client/` y usar el script definido en
`client/package.json`.

No asumir que los scripts son `npm run dev`: comprobar los
`package.json`.

MySQL estuvo instalado como servicio de Windows `MySQL80`; verificar el
nombre y estado antes de dar comandos.

Direcciones locales utilizadas anteriormente: - Frontend:
`http://localhost:5173`. - Backend: `http://localhost:4000`.

Verificar puertos y rutas reales en la configuración.

## 11. Calidad y pruebas

Para cada cambio: 1. Revisar impacto en frontend, backend y base de
datos. 2. Validar entradas, permisos y errores. 3. Probar carga,
ausencia de modelos y fallos de red. 4. Verificar productos sin modelo
3D. 5. Probar escritorio y, cuando sea posible, dispositivos móviles. 6.
Comprobar que las funciones comerciales existentes sigan operativas. 7.
Documentar qué se probó y qué queda pendiente.

Distinguir entre implementado, compilado, probado localmente y validado
en dispositivo real. No marcar como terminado algo que solo compila.

## 12. Contexto académico

El usuario desarrolla una monografía/proyecto universitario de
Ingeniería de Software.

Al ayudar con documentos académicos: - Usar redacción formal, precisa y
coherente. - Mantener alineados problema, pregunta, objetivos,
requerimientos, casos de uso, diseño, implementación y pruebas. - No
presentar funcionalidades futuras como implementadas. - Mantener un
objetivo general con un solo verbo principal cuando así lo exija la
orientación docente. - No enfocar todo exclusivamente en inventario: el
sistema abarca varias operaciones comerciales y el módulo 3D/RA. -
Explicar los conceptos para que el usuario pueda defenderlos ante sus
docentes. - Mantener trazabilidad entre requerimientos, casos de uso y
pruebas.

## 13. Instrucción principal para Codex

Antes de cada tarea: 1. Lee este archivo completo. 2. Inspecciona el
repositorio y confirma el estado real del código. 3. Identifica los
archivos que se modificarán. 4. Resume el plan y los riesgos. 5.
Implementa de forma incremental. 6. Ejecuta pruebas o verificaciones
disponibles. 7. Informa archivos modificados, comandos ejecutados,
resultados y limitaciones.

Si este archivo contradice el código real, informa la contradicción y
verifica antes de realizar cambios destructivos.

**Prioridad absoluta:** preservar el sistema comercial existente
mientras se construye un módulo 3D/RA útil, realista, seguro,
verificable y documentable.
