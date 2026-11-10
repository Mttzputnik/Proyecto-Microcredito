# Plan — Formulario de solicitud y elegibilidad preliminar

## Objetivo
Construir el primer incremento del frontend para capturar información personal, situación económica y datos básicos de una solicitud de microcrédito, ofreciendo una verificación preliminar clara antes de enviarla a evaluación humana.

## Alcance de esta entrega
- Flujo guiado de cuatro pasos: datos personales, situación económica, solicitud y revisión.
- Validación de campos obligatorios y mensajes de ayuda en lenguaje sencillo.
- Verificación preliminar de mayoría de edad, residencia informada y capacidad mensual positiva.
- Resumen de la información antes de enviar.
- Estado de envío simulado, sin persistencia ni integración con backend todavía.
- Diseño responsive para escritorio, tablet y móvil.

Las reglas de monto máximo, tasas, cuotas y políticas de riesgo no se fijan en el frontend porque todavía deben validarse con el Product Owner y llegarán posteriormente como datos configurables.

## Estructura
- `frontend/src/App.jsx`: flujo y estado local del formulario.
- `frontend/src/styles.css`: sistema visual de la pantalla y responsive.
- `frontend/public/manus-routes.json`: declaración de la ruta principal.
- `TODO.md`: resultados pendientes y criterios de aceptación.

## Diseño

### Opciones consideradas
- **Modern Warm Humanism:** 0.06 — superficies suaves, lenguaje humano y controles grandes.
- **Institutional Minimal:** 0.05 — estructura sobria, navegación compacta y densidad operativa.
- **Friendly Civic Service:** 0.04 — formularios progresivos, orientación constante y mensajes de acompañamiento.

Se elige **Modern Warm Humanism**, alineado con `DESIGN.md`.

### Movimiento de diseño
Interfaz de servicio financiero comunitario con estética de formulario acompañado: cada pantalla responde una pequeña pregunta, muestra el progreso y evita ruido visual.

### Principios
1. Claridad antes que densidad: una tarea principal por paso.
2. Dignidad y transparencia: la elegibilidad es preliminar, no una promesa de aprobación.
3. Accesibilidad práctica: etiquetas permanentes, controles grandes, contraste y mensajes explícitos.
4. Configurabilidad futura: no codificar políticas financieras que aún no han sido aprobadas.

### Color y layout
El lienzo usa el azul muy claro de `DESIGN.md`; el verde esmeralda representa avance y acciones positivas; el azul profundo sostiene encabezado y textos de confianza. Un contenedor de lectura cómoda mantiene el formulario centrado sin convertirlo en un dashboard complejo.

### Elementos distintivos
- Banda superior azul marino con marca textual y contexto de la tarea.
- Barra de progreso simple con cuatro pasos nombrados.
- Panel lateral de orientación en escritorio que se apila arriba en móvil.

### Interacción y animación
Los pasos cambian sin animaciones fuertes. Los estados de validación son visibles y el avance solo ocurre después de completar el paso actual. No se usan interacciones dependientes exclusivamente de color.

### Tipografía y voz
Inter, con títulos de peso 700 y texto de lectura de 16px. La voz es cercana, directa y no técnica. Ejemplos: “Primero conozcamos un poco de ti” y “Esto es una revisión inicial; la decisión final la toma una persona de la cooperativa”.

### Esencia de marca
Una cooperativa digital que acompaña a las personas a solicitar apoyo financiero con claridad, respeto y reglas visibles. Personalidad: humana, confiable y transparente.

### Color de marca
Verde esmeralda `#1f7a5a`, usado como señal de avance y acción principal.
