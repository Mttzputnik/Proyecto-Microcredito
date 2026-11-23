# Reglas de negocio confirmadas por el Product Owner

**Proyecto:** Plataforma de Microcrédito y Decisión de Préstamos  
**Fuente:** respuestas del Product Owner a la consulta del equipo  
**Fecha de la consulta:** 22 de noviembre de 2026  
**Estado:** referencia funcional para análisis, diseño, implementación y pruebas

Este documento consolida las respuestas recibidas del Product Owner. En caso de contradicción con una implementación, mock o supuesto previo, prevalece esta definición funcional. Las decisiones de diseño que el Product Owner dejó a cargo del equipo se identifican expresamente y no se presentan como requisitos confirmados.

## 1. Registro y seguimiento de solicitantes

### Reglas confirmadas

- El solicitante presenta su información mediante un formulario guiado adaptado a su perfil.
- Al registrar la solicitud se entrega un número único de caso para su seguimiento.
- La respuesta del Product Owner no exige cuentas, contraseñas ni autenticación tradicional para solicitantes.
- La información financiera personal es confidencial y debe protegerse con controles de acceso adecuados.

### Decisión de diseño pendiente del equipo

El equipo puede implementar un portal con cuenta o una consulta mediante token y número de caso. No se debe asumir que el número de caso, por sí solo, constituye una credencial suficiente. Cualquier mecanismo elegido debe impedir que terceros consulten información financiera de otra persona.

**Criterio de implementación:** mantener el formulario guiado y el identificador único de caso; documentar y probar el mecanismo de autenticación/autorización de la consulta antes de exponer datos del expediente.

## 2. Actores y responsabilidades

| Actor | Responsabilidades |
|---|---|
| Solicitantes | Presentar información personal y financiera, indicar el propósito del préstamo, entregar documentos de respaldo y aportar información complementaria cuando corresponda. |
| Oficiales de crédito | Revisar solicitudes, verificar documentos y comunicar decisiones. |
| Analistas de riesgo | Establecer políticas y criterios para reducir la probabilidad de incumplimiento. |
| Área administrativa | Monitorear pagos, identificar retrasos y generar reportes financieros. |
| Comité supervisor | Revisar patrones de aprobación, detectar sesgos e inconsistencias, analizar estadísticas desagregadas por perfil, verificar excepciones justificadas y analizar correlaciones entre características del préstamo y comportamiento de pago. |

### Límites explícitos del comité supervisor

El comité supervisor no realiza la gestión rutinaria de casos individuales, no configura políticas y no registra pagos.

### Implicación técnica

Los actores del negocio no deben confundirse automáticamente con los roles técnicos actuales del sistema. La correspondencia entre actores, roles de autenticación y permisos debe definirse en una matriz de autorización y verificarse contra las rutas del backend. No se considera validado que los roles técnicos existentes representen correctamente a los cinco actores.

## 3. Elegibilidad

El sistema verifica, en conjunto con el oficial de crédito, los requisitos mínimos definidos por la política vigente:

1. Edad mínima.
2. Residencia verificable.
3. Ausencia de préstamos en mora activa con la cooperativa.
4. No superar el límite de endeudamiento simultáneo.
5. Propósito del préstamo dentro de las categorías permitidas.
6. Historial crediticio interno y obligaciones impagas con la cooperativa.

### Antecedentes ya saldados

Si existe un antecedente previo —por ejemplo, rechazo por mora pasada que ya fue saldada— el sistema debe mostrar el registro al oficial. Se aplica el período mínimo de espera únicamente cuando la política vigente lo defina y permita continuar cuando las reglas lo autoricen.

### Reglas de configuración y decisión humana

- Los parámetros de elegibilidad son datos configurables de política, no constantes rígidas del código.
- El sistema verifica y alerta sobre incumplimientos.
- El sistema no toma por sí solo la decisión final de rechazo; la decisión corresponde al proceso humano y debe quedar justificada.

## 4. Reconsideración

- La reconsideración puede iniciarse después de que una solicitud haya sido rechazada, cuando el solicitante aporte nueva información o argumentos.
- Debe asignarse obligatoriamente a un oficial diferente del que tomó la decisión original.
- Se permite una sola reconsideración por solicitud.
- El resultado se registra en el expediente original.
- El solicitante no puede modificar los datos originales después de presentar la solicitud.
- Puede aportar información complementaria o argumentos nuevos para el análisis.
- La decisión original y los registros iniciales son inmutables; no se sobrescriben.

**Implicación técnica:** la reconsideración debe conservar el expediente y la decisión original, y registrar un nuevo evento/resultado vinculado a la misma solicitud. No debe implementarse como una edición del formulario original ni como una sustitución de la decisión histórica.

## 5. Mora, alertas y gestión administrativa

### Clasificación por días de incumplimiento

| Días sin pago desde el vencimiento | Clasificación |
|---|---|
| 1 a 30 días | Retraso leve |
| 31 a 60 días | Mora temprana |
| Más de 60 días | Mora establecida |

### Alertas y seguimiento

- Al cumplirse el primer día de retraso, el sistema genera una alerta automática para el área administrativa.
- El área administrativa dispone de alertas configurables para cuotas que vencen en los próximos N días.
- Debe poder consultar listas de préstamos clasificados por días de mora.
- Debe registrar las gestiones de cobro realizadas.
- La clasificación debe escalar automáticamente conforme aumentan los días de incumplimiento.

### Aspectos operativos por precisar antes de cerrar el diseño

La respuesta no especifica si el conteo se realiza en días calendario o hábiles, la zona horaria de referencia, el horario de ejecución del proceso automático, la frecuencia de notificación ni las reglas para evitar alertas duplicadas. Estos detalles deben resolverse como decisiones técnicas o consultarse al Product Owner si afectan la regla de negocio.

## 6. Reestructuración

- Un préstamo puede reestructurarse cuando está en mora temprana o establecida debido a dificultades de pago.
- Debe existir un acuerdo con las nuevas condiciones.
- El oficial registra el acuerdo y las condiciones pactadas.
- El sistema genera un nuevo cronograma de pagos.

**Implicación técnica:** conservar el cronograma y los movimientos históricos; el nuevo cronograma debe quedar asociado a la reestructuración y al préstamo original. No se deben borrar ni alterar pagos confirmados o cuotas históricas.

### Aspectos por precisar

La respuesta no define límites de cantidad de reestructuraciones, campos obligatorios del acuerdo, aprobación adicional, tratamiento de cuotas vencidas, saldo e intereses al reestructurar, ni si el cronograma anterior se cierra o queda marcado como sustituido. No inventar estas reglas: registrar las decisiones pendientes y solicitar validación cuando sean necesarias para implementar.

## 7. Trazabilidad y seguridad

Las siguientes condiciones se derivan directamente de las respuestas del Product Owner:

- Proteger la confidencialidad de los datos financieros.
- Preservar la solicitud original y sus documentos presentados.
- Preservar la decisión inicial y el historial de reconsideración.
- Mantener la relación entre solicitud, reconsideración, préstamo, reestructuraciones, cronogramas, pagos y alertas.
- Restringir las operaciones según las responsabilidades de cada actor.
- Permitir que el comité consulte información agregada y estadísticas de supervisión sin otorgarle funciones operativas de gestión de casos, configuración o pagos.

## 8. Referencias indicadas por el Product Owner

Las respuestas citaron los siguientes apartados de sus materiales de referencia:

- Enunciado §3, §4, §7 y §8.
- BC §1.5, §2.2, §2.4, §2.5, §3, §3.2, §3.5, §3.6, §3.7.
- BC §5 (fases 1, 2, 3, 5, 8 y 9).
- BC §6.2, §7.1, §7.4, §7.6.
- BC §8, §8.5, §8.8, §9.2, §11, §12, §13, §16 (escenarios 2, 3 y 8), §17 y §20.

Estas referencias se transcriben como fueron indicadas en la respuesta del Product Owner; este documento no sustituye los materiales originales ni amplía su contenido.
