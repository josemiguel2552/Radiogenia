# Radiogen.AI — Manual para Hospitales y Radiólogos

**Versión 2.0 | Mayo 2025**

---

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos del sistema](#2-requisitos-del-sistema)
3. [Registro y acceso](#3-registro-y-acceso)
4. [Panel principal — Generación de informes](#4-panel-principal--generación-de-informes)
5. [Dictado por voz](#5-dictado-por-voz)
6. [Plantillas](#6-plantillas)
7. [Recomendaciones clínicas](#7-recomendaciones-clínicas)
8. [Calculadoras y guías de referencia](#8-calculadoras-y-guías-de-referencia)
9. [Aprendizaje de estilo](#9-aprendizaje-de-estilo)
10. [Frases de normalidad](#10-frases-de-normalidad)
11. [Firmas](#11-firmas)
12. [Configuración del modelo IA](#12-configuración-del-modelo-ia)
13. [Gestión de organización (hospitales)](#13-gestión-de-organización-hospitales)
14. [Métricas y productividad](#14-métricas-y-productividad)
15. [Planes y suscripciones](#15-planes-y-suscripciones)
16. [Idiomas soportados](#16-idiomas-soportados)
17. [Seguridad y privacidad](#17-seguridad-y-privacidad)
18. [Soporte técnico](#18-soporte-técnico)
19. [Preguntas frecuentes](#19-preguntas-frecuentes)

---

## 1. Introducción

**Radiogen.AI** es un asistente de informes radiológicos basado en inteligencia artificial. Permite a los radiólogos generar borradores de informes estructurados a partir de dictado por voz o texto libre, utilizando modelos de IA de última generación.

### Propuesta de valor

- **Reducción de tiempo**: Genera borradores completos en segundos, permitiendo al radiólogo enfocarse en la revisión y validación clínica.
- **Consistencia**: Plantillas estandarizadas garantizan informes homogéneos dentro del servicio.
- **Aprendizaje continuo**: El sistema aprende el estilo de escritura de cada radiólogo y adapta las generaciones futuras.
- **Zero-install**: Funciona desde cualquier navegador web moderno. No requiere instalación de software.
- **Multi-idioma**: Informes en español, inglés y portugués (brasileño).

### Flujo de trabajo típico

```
Dictado/texto → IA genera hallazgos estructurados → Radiólogo revisa y edita →
IA genera conclusión → Radiólogo valida → Copiar al RIS/PACS
```

> **Importante**: Los textos generados por IA son **borradores** que deben ser revisados y validados por el radiólogo antes de su uso clínico. Radiogen.AI es una herramienta de asistencia, no un sistema de diagnóstico autónomo.

---

## 2. Requisitos del sistema

| Requisito | Especificación |
|-----------|---------------|
| Navegador | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| Conexión | Internet estable (mínimo 1 Mbps) |
| Micrófono | Necesario para dictado por voz (USB o integrado) |
| Resolución | Mínimo 1280×720 px (recomendado 1920×1080) |
| Dispositivos | PC, Mac, tablet (iPad recomendado para tablets) |

No se requiere instalación de software adicional ni plugins del navegador.

---

## 3. Registro y acceso

### 3.1 Crear cuenta

1. Acceda a la página de registro.
2. Complete los campos requeridos:
   - **Correo electrónico** institucional
   - **Contraseña** (mínimo 6 caracteres)
   - **Nombre completo**
   - **País**
   - **Hospital/Centro**
   - **Rol profesional** (radiólogo titular / residente)
3. Si dispone de un **código de invitación**, introdúzcalo para acceder al plan Starter gratuito durante 30 días (para usted y quien le invitó).
4. Acepte los términos de uso.
5. Recibirá un correo de confirmación. Su cuenta será revisada y aprobada por el equipo de Radiogen.AI.

### 3.2 Acceso con invitación de organización

Si su jefe de servicio ha configurado una organización en Radiogen.AI:
1. Recibirá un enlace de invitación por correo.
2. Al hacer clic, se le redirigirá al registro con la organización preconfigurada.
3. Tras el registro, tendrá acceso inmediato a las plantillas y recursos compartidos de su servicio.

### 3.3 Plan para residentes

Los residentes pueden acceder a un plan especial a $4.99/mes (150 informes, 120 min de dictado). Se requiere verificación mediante documento acreditativo de su condición de residente.

### 3.4 Inicio de sesión

- Acceda con su correo y contraseña.
- Opción de "Recordar sesión" disponible.
- Si olvida su contraseña, use la opción "¿Olvidó su contraseña?" para recibir un enlace de restablecimiento.

---

## 4. Panel principal — Generación de informes

El panel principal es el espacio de trabajo central del radiólogo. Se compone de las siguientes áreas:

### 4.1 Barra lateral izquierda

Contiene las pestañas principales:
- **Plantillas**: Selección de plantilla por modalidad y tipo de estudio.
- **Calculadoras**: Acceso a calculadoras médicas y guías de referencia.
- **Recomendaciones**: Biblioteca de recomendaciones basadas en evidencia.
- **Preferencias**: Configuración de modelo IA, idioma, estilo de informe.

### 4.2 Área central de trabajo

#### Sección de entrada (parte superior)
- **Selector de modalidad**: CT, MRI, Ecografía, Radiografía, Mamografía, RECIST, Procedimientos.
- **Selector de plantilla**: Lista desplegable con plantillas filtradas por modalidad.
- **Opciones de contraste**: Por defecto, sin contraste, con contraste, etc.
- **Área de dictado/texto**: Campo donde se ingresa el dictado o texto libre.
- **Botón de micrófono**: Inicia la grabación de voz.

#### Sección de hallazgos (parte media)
- **Botón "Generar hallazgos"**: Envía el dictado a la IA para generar hallazgos estructurados.
- **Editor de hallazgos**: Campo editable donde aparecen los hallazgos generados. El radiólogo puede modificar libremente.
- **Indicador de secciones**: Muestra el número de secciones de la plantilla completadas.

#### Sección de conclusión (parte inferior)
- **Botón "Generar conclusión"**: Genera la conclusión basada en los hallazgos.
- **Selector de estilo de conclusión**: "Concisa" (párrafo breve) o "Agrupada" (por categorías).
- **Editor de conclusión**: Campo editable para la conclusión generada.
- **Panel de recomendaciones**: Recomendaciones sugeridas basadas en los hallazgos.

#### Acciones
- **Copiar informe**: Copia hallazgos + conclusión + recomendaciones + firma al portapapeles, listo para pegar en el RIS/PACS.
- **Guardar como muestra de estilo**: Guarda el informe como referencia para el aprendizaje de estilo.
- **Limpiar**: Reinicia todos los campos para un nuevo informe.

### 4.3 Flujo de generación paso a paso

1. **Seleccione modalidad y plantilla** según el estudio a informar.
2. **Dicte o escriba** la descripción de los hallazgos del estudio.
3. Pulse **"Generar hallazgos"**. La IA producirá un borrador estructurado siguiendo las secciones de la plantilla.
4. **Revise y edite** los hallazgos generados. Corrija cualquier inexactitud.
5. Pulse **"Generar conclusión"**. La IA sintetizará los hallazgos en una conclusión.
6. **Revise la conclusión** y añada o seleccione **recomendaciones** si procede.
7. Pulse **"Copiar"** para transferir el informe completo a su sistema RIS/PACS.

### 4.4 Opciones de generación

| Parámetro | Opciones | Descripción |
|-----------|----------|-------------|
| Longitud de hallazgos | Concisa / Estándar / Detallada | Controla la extensión del texto generado |
| Verbosidad de campos normales | Mínima / Estándar / Explícita | Cuánto detalle para hallazgos dentro de la normalidad |
| Nivel de paráfrasis | Ninguna / Ligera / Libre | Grado de reformulación del dictado original |
| Estilo de conclusión | Concisa / Agrupada | Formato de la conclusión |
| Idioma de salida | Español / Inglés / Portugués (BR) | Idioma del informe generado |

---

## 5. Dictado por voz

### 5.1 Cómo usar el dictado

1. Asegúrese de que su navegador tiene permiso para acceder al micrófono.
2. Pulse el **botón de micrófono** en el área de dictado.
3. Hable de manera clara y natural, describiendo los hallazgos del estudio.
4. Pulse nuevamente para detener la grabación (máximo 120 segundos por clip).
5. El audio se transcribirá automáticamente y aparecerá en el campo de dictado.
6. Puede dictar múltiples clips que se concatenarán.

### 5.2 Idiomas de dictado

- **Español** (es)
- **Inglés** (en)
- **Portugués brasileño** (pt)
- **Detección automática** — el sistema identifica el idioma hablado.

### 5.3 Corrección de transcripción

Tras la transcripción, el sistema puede aplicar:
- **Corrección automática**: Ajusta terminología médica, puntuación y formato.
- **Refinamiento**: Procesamiento adicional para mejorar la calidad del texto.

### 5.4 Vocabulario médico contextual

La transcripción utiliza vocabulario médico especializado como contexto:
- Terminología radiológica por modalidad.
- Texto previo del informe para coherencia.
- Secciones de la plantilla activa para terminología específica.

### 5.5 Cuota de dictado

Cada plan incluye un límite mensual de minutos de dictado:
- Free: 30 minutos/mes
- Residente: 120 minutos/mes
- Starter: 120 minutos/mes
- Professional: 300 minutos/mes

---

## 6. Plantillas

### 6.1 Plantillas predefinidas

Radiogen.AI incluye **más de 190 plantillas** predefinidas que cubren todas las modalidades:

| Modalidad | N.° plantillas | Ejemplos |
|-----------|---------------|----------|
| CT | ~60 | Cráneo, tórax, abdomen-pelvis, columna, politrauma |
| MRI | ~40 | Cerebro, columna, rodilla, hombro, cardíaca |
| Ecografía | ~25 | Abdominal, tiroides, mama, vascular, ginecológica |
| Radiografía | ~35 | Tórax, abdomen, columna, extremidades |
| Mamografía | ~10 | Screening, diagnóstica, vistas complementarias |
| RECIST | ~12 | Seguimiento oncológico (tórax, abdomen, multi-región) |
| Procedimientos | ~8 | Intervencionismo, biopsias |

Cada plantilla define:
- **Secciones** anatómicas estructuradas (p.ej., parénquima, vía aérea, mediastino, pleura, pared torácica).
- **Campos** específicos para cada sección.
- **Opciones de técnica** (contraste, protocolos cardíacos, etc.).

### 6.2 Plantillas personalizadas

Puede crear sus propias plantillas:
1. Vaya a la pestaña **Plantillas** en la barra lateral.
2. Pulse **"Crear plantilla"**.
3. Defina el nombre, la modalidad y la estructura.
4. Use el formato de secciones con asteriscos: `**Nombre de sección**`.
5. Guarde la plantilla. Estará disponible solo para usted.

### 6.3 Ocultar plantillas predefinidas

Si no utiliza ciertas plantillas predefinidas, puede ocultarlas de su lista sin eliminarlas. Estarán disponibles para restaurar en cualquier momento.

### 6.4 Plantillas de organización

Si pertenece a una organización hospitalaria:
- El jefe de sección puede crear plantillas compartidas para todo el servicio.
- Las plantillas se organizan por secciones (tórax, abdomen, neurología, etc.).
- Puede importar plantillas de su organización a su perfil personal.

### 6.5 Traducción automática de nombres

Los nombres de plantillas se traducen automáticamente al cambiar el idioma de la interfaz. Esto incluye plantillas personalizadas — el sistema reconoce más de 160 términos médicos en español, inglés y portugués.

---

## 7. Recomendaciones clínicas

### 7.1 Biblioteca de recomendaciones

Radiogen.AI incluye **más de 50 recomendaciones** basadas en guías de sociedades médicas:

- **Nódulos pulmonares**: Criterios Fleischner 2017
- **Lesiones hepáticas**: LI-RADS v2018, hallazgos incidentales ACR
- **Nódulos tiroideos**: TI-RADS, seguimiento ecográfico
- **Lesiones renales**: Bosniak 2019, incidentalomas ACR
- **Mama**: BI-RADS v5
- **Screening pulmonar**: Lung-RADS v2022
- **Incidentalomas adrenales**: Guías ACR
- **Quistes pancreáticos**: Guías ACR
- **Hallazgos ováricos**: O-RADS, hallazgos incidentales ACR
- **Pólipos vesiculares**: Guías de seguimiento
- **Aneurismas aórticos**: Umbrales quirúrgicos y seguimiento

Cada recomendación incluye:
- Texto redactado para inclusión directa en el informe.
- Categoría anatómica y modalidad.
- Fuente bibliográfica.

### 7.2 Recomendaciones personalizadas

Puede crear sus propias recomendaciones frecuentes:
1. Acceda a la pestaña **Recomendaciones** en la barra lateral.
2. Pulse **"Crear recomendación"**.
3. Redacte el texto y asigne una etiqueta descriptiva.
4. La recomendación quedará guardada para uso futuro.

### 7.3 Uso en informes

Al generar un informe:
1. El sistema sugiere recomendaciones relevantes basadas en los hallazgos.
2. Seleccione las recomendaciones que desee incluir.
3. Se añadirán automáticamente a la sección de recomendaciones del informe.
4. El sistema registra la frecuencia de uso para ordenar las más utilizadas primero.

---

## 8. Calculadoras y guías de referencia

### 8.1 Calculadoras interactivas (11)

| Calculadora | Descripción |
|-------------|-------------|
| **Washout adrenal CT** | Cálculo de APW/RPW para evaluación de adenoma vs. no-adenoma |
| **Volumen tiroideo** | Volumen de lóbulos derecho/izquierdo y total (cm³) |
| **Volumen prostático y densidad PSA** | Cálculo de volumen con interpretación de densidad PSA |
| **ACR TI-RADS** | Estratificación de riesgo de nódulos tiroideos (TR1-TR5) |
| **PI-RADS v2.1** | Riesgo de cáncer de próstata (1-5) con lógica por zona |
| **Bosniak 2019** | Clasificación de quistes renales (I-IV) |
| **ASPECTS** | Severidad de ictus agudo (0-10) |
| **On-Track / Off-Track (hombro)** | Evaluación de inestabilidad Hill-Sachs |
| **Caracterización de lesión renal** | Análisis multifásico de HU por CT |
| **TNM Pulmonar 9.ª edición (2024)** | Estadificación completa de cáncer de pulmón |
| **TNM Laríngeo 8.ª edición** | Estadificación de cáncer de cabeza y cuello |

#### Cómo usar las calculadoras:
1. Abra la pestaña **Calculadoras** en la barra lateral.
2. Seleccione la calculadora deseada.
3. Complete los campos requeridos (medidas, hallazgos, etc.).
4. El resultado se calcula automáticamente.
5. Puede copiar el resultado para incluirlo en su informe.

### 8.2 Guías de referencia rápida (+20)

Hojas de consulta disponibles:

- **Fleischner Society 2017** — Seguimiento de nódulos pulmonares sólidos y subsólidos.
- **LI-RADS v2018** — Clasificación de lesiones hepáticas.
- **Lung-RADS v2022** — Screening pulmonar por TC de baja dosis.
- **BI-RADS v5** — Clasificación de hallazgos mamarios.
- **O-RADS** — Clasificación de hallazgos ováricos.
- **PI-RADS** — Clasificación de hallazgos prostáticos.
- **BTS (British Thoracic Society)** — Seguimiento de nódulos pulmonares.
- **Hallazgos incidentales ACR** — Hígado, suprarrenal, páncreas, ovario, vesícula, riñón.
- **Aneurisma aórtico** — Umbrales quirúrgicos y protocolos de seguimiento.
- **Nomenclatura de columna** (NASS/ASSR).
- **Estenosis foraminal y de canal central** — Grados de estenosis.
- **Anatomía RM de hombro** — Manguito rotador, labrum.
- **Anatomía RM de rodilla** — Meniscos, ligamentos, clasificación.
- **Anatomía RM de tobillo** — Tendones, ligamentos.

---

## 9. Aprendizaje de estilo

### 9.1 Concepto

Radiogen.AI aprende su estilo de escritura personal analizando informes previos. Cada vez que genera y edita un informe, el sistema:

- Detecta sus **frases de normalidad** preferidas (cómo describe hallazgos normales).
- Captura su **estilo de conclusión** (estructura, tono, longitud).
- Almacena **patrones de redacción** por modalidad y tipo de estudio.

### 9.2 Funcionamiento

1. **Active** el aprendizaje de estilo en Preferencias (activado por defecto).
2. **Configure** el número de muestras de referencia (2-5 informes recientes recomendado).
3. Al generar nuevos informes, la IA usará sus informes previos como referencia (*few-shot learning*).
4. Con el tiempo, los borradores se adaptarán cada vez más a su estilo personal.

### 9.3 Muestras de estilo

Puede gestionar manualmente las muestras que la IA utiliza como referencia:
- Guardar informes específicos como muestras de estilo.
- El sistema almacena hallazgos y conclusiones por modalidad.
- Las muestras más recientes y frecuentes tienen prioridad.

---

## 10. Frases de normalidad

### 10.1 Concepto

Las frases de normalidad son las descripciones predefinidas que se utilizan para los hallazgos dentro de la normalidad en cada sección de una plantilla. Por ejemplo:

- **Parénquima pulmonar**: "Sin condensaciones ni masas. No se identifican nódulos pulmonares."
- **Mediastino**: "Estructuras mediastínicas de aspecto normal. Sin adenopatías significativas."

### 10.2 Personalización

1. Acceda a la configuración de frases de normalidad desde Preferencias.
2. Seleccione la modalidad (CT, MRI, etc.).
3. Para cada sección de la plantilla, puede editar la frase predeterminada.
4. Las frases personalizadas se utilizarán en futuras generaciones para esa modalidad.

### 10.3 Frases de organización

Si pertenece a una organización, el jefe de sección puede definir frases de normalidad estándar para todo el servicio, garantizando homogeneidad en los informes.

---

## 11. Firmas

### 11.1 Configuración

Puede configurar una o más firmas para adjuntar a sus informes:

1. Acceda a la sección **Firmas** en Preferencias.
2. Cree una nueva firma con su nombre, especialidad, número de colegiado, etc.
3. Marque una firma como **activa** para que se adjunte automáticamente al copiar el informe.

### 11.2 Múltiples firmas

Útil si trabaja en varios centros o tiene diferentes roles (docencia, asistencial, investigación). Cambie la firma activa según el contexto.

---

## 12. Configuración del modelo IA

### 12.1 Proveedores soportados

| Proveedor | Modelos | Características |
|-----------|---------|-----------------|
| **Claude (Anthropic)** | claude-sonnet-4-6, claude-haiku-4-5 | Precisión alta, razonamiento avanzado |
| **GPT (OpenAI)** | gpt-4o, gpt-4o-mini | Velocidad, versatilidad |
| **DeepSeek** | deepseek-v4-pro, deepseek-v4-flash, deepseek-chat, deepseek-reasoner | Coste-eficiente, buen rendimiento |
| **Gemini (Google)** | gemini-1.5-pro, gemini-2.0-flash | Contexto amplio, multimodal |
| **Custom** | Cualquier modelo compatible con OpenAI API | Ollama, modelos locales, endpoints privados |

### 12.2 Configuración por usuario

Cada usuario puede configurar:
- **Proveedor y modelo** preferido (si tiene rol de administrador).
- **Clave API propia** (cifrada en reposo) — permite usar su propia cuenta de IA.
- **URL personalizada** para endpoints privados (Ollama, servidores locales).

### 12.3 Modelo combinado

Los administradores pueden configurar diferentes modelos para diferentes tareas:
- **Hallazgos**: Un modelo para generar hallazgos.
- **Conclusiones**: Otro modelo para conclusiones.
- **Corrección de dictado**: Modelo optimizado para transcripción.

---

## 13. Gestión de organización (hospitales)

### 13.1 Crear una organización

El jefe de servicio o administrador del hospital puede crear una organización:

1. Acceda a la sección **Organización**.
2. Pulse **"Crear organización"**.
3. Configure:
   - Nombre del hospital/centro.
   - Logo institucional.
   - Correo de facturación.
   - Número máximo de puestos (seats).

### 13.2 Estructura organizativa

```
Organización (Hospital)
├── Sección: Tórax
│   ├── Jefe de sección
│   ├── Radiólogos
│   └── Residentes
├── Sección: Abdomen
│   ├── Jefe de sección
│   └── Radiólogos
├── Sección: Neurología
│   └── ...
└── Sección: Musculoesquelético
    └── ...
```

### 13.3 Roles y permisos

| Rol | Permisos |
|-----|----------|
| **Jefe de organización** (org_chief) | Administración total: miembros, secciones, plantillas, métricas |
| **Jefe de sección** (section_chief) | Gestionar su sección: plantillas, frases, miembros |
| **Editor de sección** (section_editor) | Editar plantillas y frases de normalidad de su sección |
| **Radiólogo** (radiologist) | Uso estándar: generar informes, acceder a recursos compartidos |

### 13.4 Tipo de personal

- **Titular** (Attending) — Radiólogo adjunto.
- **Residente** (Resident) — En formación.

### 13.5 Invitar miembros

1. El jefe de organización accede a **Gestión de miembros**.
2. Genera un **enlace de invitación** con código único.
3. El invitado usa el enlace para registrarse y queda vinculado a la organización.
4. El jefe asigna sección y rol.

### 13.6 Recursos compartidos

Las organizaciones pueden compartir:
- **Plantillas** estandarizadas por sección.
- **Frases de normalidad** unificadas.
- **Recomendaciones** institucionales.

Los miembros pueden **importar** estos recursos a su perfil personal.

### 13.7 Desactivación y gestión

- Los miembros pueden ser **desactivados** sin eliminar su cuenta.
- Los miembros desactivados pierden acceso a los recursos de la organización.
- Se pueden reactivar en cualquier momento.

---

## 14. Métricas y productividad

### 14.1 Métricas individuales (visibles para el radiólogo)

Cada radiólogo puede ver en su panel:
- **Informes utilizados** este mes vs. límite del plan.
- **Minutos de dictado** utilizados vs. límite.
- **Plan actual** y fecha de renovación.

### 14.2 Métricas de la organización (visibles para el jefe de servicio)

El jefe de organización y los jefes de sección tienen acceso a:

- **Volumen de informes** por miembro del equipo.
- **Distribución por modalidad** (CT, MRI, ecografía, etc.).
- **Tendencias temporales** — Informes por día, semana, mes.
- **Uso de IA** — Tokens consumidos, patrones de generación.
- **Costes agregados** del servicio.
- **Registro de auditoría** — Historial completo de acciones.

Estas métricas permiten al jefe de servicio:
- Evaluar la adopción de la herramienta en el equipo.
- Identificar oportunidades de formación.
- Optimizar la distribución de carga de trabajo.
- Justificar la inversión tecnológica ante la dirección del hospital.

### 14.3 Métricas del programa piloto

Para hospitales en fase piloto, se registran métricas detalladas:
- **Distancia de edición**: Cuánto modifica el radiólogo el borrador de IA (calidad del primer borrador).
- **Completitud estructural**: Porcentaje de secciones de la plantilla rellenadas.
- **Duración de generación**: Tiempo de respuesta de la IA.
- **Estadísticas agregadas** por organización.

---

## 15. Planes y suscripciones

### 15.1 Planes disponibles

| Característica | Free | Residente | Starter | Professional |
|----------------|------|-----------|---------|-------------|
| **Precio** | $0/mes | $4.99/mes | $7.99/mes | $15.99/mes |
| **Informes/mes** | 30 | 150 | 150 | 400 |
| **Dictado** | 30 min | 120 min | 120 min | 300 min |
| **Documentos guía** | 2 | 5 | 5 | 15 |
| **Todas las modalidades** | Si | Si | Si | Si |
| **Aprendizaje de estilo** | Si | Si | Si | Si |
| **Plantillas personalizadas** | Si | Si | Si | Si |
| **Soporte prioritario** | No | No | Si | Si |
| **Acceso API** | No | No | No | Si |
| **Exportación masiva** | No | No | No | Si |

### 15.2 Período de prueba

Los nuevos usuarios aprobados reciben automáticamente un plan **Starter gratuito durante 30 días**. Al finalizar, pueden elegir un plan de pago o continuar con el plan Free.

### 15.3 Programa de referidos

- Al invitar a un colega con su código personal, ambos reciben 30 días de plan Starter gratuito.
- El bonus se aplica automáticamente al aprobar la cuenta del invitado.

### 15.4 Facturación

- Gestión de suscripción y pagos a través de **Stripe**.
- Acceso al portal de facturación para descargar facturas.
- Cancelación en cualquier momento sin penalización.

---

## 16. Idiomas soportados

### 16.1 Idioma de la interfaz

La plataforma está completamente traducida a:
- **Español** (es)
- **Inglés** (en)
- **Portugués** (pt)

Incluye: menús, botones, mensajes de error, páginas de error (404, errores generales), correos electrónicos (aprobación, lista de espera, fallos de pago, cambios de plan).

### 16.2 Idioma de los informes

Independiente del idioma de la interfaz. Puede usar la interfaz en español y generar informes en inglés, por ejemplo.

### 16.3 Idioma del dictado

Configurable independientemente. Puede dictar en inglés y generar el informe en español — la IA maneja la traducción internamente.

---

## 17. Seguridad y privacidad

### 17.1 Protección de datos

- **Cifrado en tránsito**: HTTPS/TLS para todas las comunicaciones.
- **Cifrado en reposo**: Claves API almacenadas con cifrado AES.
- **Cabeceras de seguridad**: X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Prevención de ataques**: Protección contra CSRF, XSS, inyección SQL, open redirect.

### 17.2 Detección de datos personales (PII)

Radiogen.AI incluye detección automática de datos personales en los textos:
- Nombres de pacientes.
- Números de historia clínica (MRN).
- Números de acceso.
- Identificadores DICOM (UIDs).
- DNI/NIE y otros documentos de identidad.

Los datos detectados se eliminan automáticamente antes de enviarse a los servidores de IA.

### 17.3 Claves temporales de transcripción

Para el servicio de dictado por voz, se utilizan claves de API temporales con una vida útil de 120 segundos, minimizando el riesgo de exposición.

### 17.4 Control de acceso

- Autenticación segura mediante Supabase Auth.
- Control de acceso basado en roles (RBAC).
- Rate limiting para prevenir abuso.
- Aprobación manual de nuevas cuentas.
- Verificación de correo electrónico.

### 17.5 Cumplimiento normativo

- Diseñado con principios de **GDPR** (Reglamento General de Protección de Datos).
- Residencia de datos en la UE (servidores Supabase en Europa).
- Registro de auditoría completo de todas las acciones.

---

## 18. Soporte técnico

### 18.1 Tipos de solicitud

Puede enviar tickets de soporte desde la plataforma:
- **Error técnico**: Reportar un fallo o bug.
- **Pregunta**: Consultas sobre funcionalidades.
- **Queja**: Disconformidad con el servicio.
- **General**: Cualquier otro tema.

### 18.2 Cómo enviar un ticket

1. Acceda a la sección de **Soporte** en el menú.
2. Seleccione el tipo de solicitud.
3. Describa el problema con el mayor detalle posible.
4. El equipo de soporte responderá a través de la plataforma.

### 18.3 Prioridad de soporte

- **Free**: Soporte estándar (respuesta en 48-72h).
- **Starter / Professional**: Soporte prioritario (respuesta en 24h).

---

## 19. Preguntas frecuentes

### General

**P: ¿Puedo usar Radiogen.AI para diagnóstico clínico?**
R: No. Radiogen.AI genera borradores que **deben ser revisados y validados** por un radiólogo cualificado antes de su uso clínico. Es una herramienta de asistencia a la redacción, no un sistema de diagnóstico.

**P: ¿Los datos de mis pacientes se envían a servidores externos?**
R: El sistema detecta y elimina automáticamente datos personales (nombres, MRN, UIDs) antes de enviar texto a los modelos de IA. Solo se envía el contenido médico anonimizado.

**P: ¿Puedo usar la plataforma sin conexión a internet?**
R: No. Radiogen.AI es una aplicación web que requiere conexión a internet para funcionar.

**P: ¿En qué idiomas puedo generar informes?**
R: Español, inglés y portugués (brasileño). El idioma del informe es independiente del idioma de la interfaz y del dictado.

### Dictado por voz

**P: ¿Qué tipo de micrófono necesito?**
R: Cualquier micrófono compatible con su navegador. Recomendamos un micrófono USB de escritorio para mejor calidad, aunque los micrófonos integrados de portátil/tablet funcionan correctamente.

**P: ¿Hay un límite de duración por grabación?**
R: Cada clip de audio tiene un máximo de 120 segundos. Puede hacer múltiples grabaciones que se concatenarán.

**P: ¿Qué pasa si agoto mis minutos de dictado?**
R: Puede continuar usando la plataforma escribiendo texto manualmente. Para más minutos de dictado, considere actualizar su plan.

### Plantillas y personalización

**P: ¿Puedo crear mis propias plantillas?**
R: Sí. Puede crear plantillas personalizadas con las secciones y campos que necesite. Las plantillas personalizadas son privadas para su cuenta.

**P: ¿Las plantillas se traducen al cambiar el idioma?**
R: Sí. Los nombres de las plantillas se traducen automáticamente entre español, inglés y portugués, incluyendo plantillas personalizadas con nombres médicos reconocidos.

### Organización y equipo

**P: ¿Cuántos miembros puede tener una organización?**
R: El número de puestos (seats) se configura al crear la organización y puede ampliarse contactando con soporte.

**P: ¿Los residentes pueden acceder a las plantillas del servicio?**
R: Sí, si están vinculados a la organización y su sección. Pueden importar las plantillas compartidas a su perfil.

**P: ¿El jefe de servicio puede ver los informes de los radiólogos?**
R: No. El jefe de servicio tiene acceso a métricas agregadas de productividad (volumen, tendencias, uso), pero **no** al contenido de los informes individuales.

### Facturación

**P: ¿Puedo cancelar mi suscripción en cualquier momento?**
R: Sí, sin penalización. Mantendrá acceso hasta el final del período facturado.

**P: ¿Hay descuento para hospitales con múltiples licencias?**
R: Contacte con nuestro equipo comercial para planes institucionales personalizados.

---

## Contacto

- **Soporte técnico**: A través del sistema de tickets integrado en la plataforma.
- **Correo electrónico**: soporte@radiogen.ai
- **Web**: https://radiogen.ai

---

*Radiogen.AI — Asistente de informes radiológicos con IA.*
*Los textos generados son borradores que deben ser validados antes de su uso clínico.*

---

**Documento confidencial** — Para uso exclusivo del personal del centro hospitalario.
