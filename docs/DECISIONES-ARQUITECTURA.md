# Decisiones iniciales de arquitectura

## ADR-001: Stack tecnológico
React, Node.js, Express, Prisma ORM 6 y MongoDB. Prisma es la única capa de persistencia; no se usa Mongoose en paralelo.

## ADR-002: Separación por capas
Las rutas/controladores atienden HTTP, los servicios concentran reglas de negocio y Prisma se consume mediante un cliente compartido.

## ADR-003: Políticas configurables y versionadas
Las reglas crediticias se almacenarán como datos. Cada evaluación conservará la política y versión utilizadas, junto con indicadores y resultados calculados.

## ADR-004: Decisión humana y trazabilidad
La evaluación de riesgo apoya al funcionario, no decide autónomamente. Toda decisión exige justificación. Las decisiones y pagos confirmados no se sobrescriben silenciosamente.

## ADR-005: Precisión monetaria
Prisma ORM 6 no admite Decimal para MongoDB. Los campos Float son provisionales; la API recibe importes enteros en COP. Se debe definir una representación exacta y reglas de redondeo antes de producción.

## ADR-006: Separación de solicitud y préstamo
Una solicitud recibida no es un préstamo. Solo después de una aprobación humana y formalización se crea un préstamo; el formulario público no aprueba ni desembolsa.

## Pendientes
- Confirmar políticas, umbrales y fórmulas con el Product Owner.
- Definir roles y permisos.
- Definir estados y transiciones permitidas.
- Definir pagos parciales, anticipados y reversos.
- Implementar autenticación y autorización antes de exponer operaciones administrativas.
