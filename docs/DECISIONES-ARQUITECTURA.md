# Decisiones iniciales de arquitectura

## ADR-001: Stack tecnológico
React, Node.js, Express, Prisma y MongoDB se adoptan por continuidad con la experiencia del equipo en ProyectoFlota.

## ADR-002: Separación por capas
Los controladores atenderán HTTP; los servicios concentrarán reglas de negocio; Prisma será accedido desde los servicios mediante un cliente compartido.

## ADR-003: Políticas configurables y versionadas
Las reglas crediticias se almacenarán como datos. Cada evaluación conservará la política y versión utilizadas, junto con los indicadores y resultados calculados.

## ADR-004: Decisión humana y trazabilidad
La evaluación de riesgo apoya al funcionario, no decide autónomamente. Toda decisión exige justificación. Las decisiones y pagos confirmados no se sobrescriben silenciosamente: las correcciones deben dejar evidencia auditable.

## ADR-005: Precisión monetaria
Antes de implementar cálculos financieros se definirán con el Product Owner las reglas de redondeo, representación monetaria y fórmulas. No se asumirán tasas ni límites no validados.

## Pendientes de validación
- Requisitos y políticas concretas con el Product Owner.
- Roles y permisos exactos.
- Reglas de capacidad de pago y cálculo de cuotas.
- Tratamiento de pagos parciales, anticipados y reversos.
- Estados y transiciones permitidas del préstamo.
