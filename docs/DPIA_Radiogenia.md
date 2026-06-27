# Evaluacion de Impacto en Proteccion de Datos / Relatorio de Impacto (EIPD / RIPD / DPIA)

**Radiogen.AI (Radiogenia)**
**Version del documento:** 2.0 (adaptada a Latinoamerica)
**Fecha:** 27 de junio de 2026
**Responsable del tratamiento (Controlador):** Radiogenia
**Encargado de Proteccion de Datos (DPO):** [Pendiente de designacion]
**Marco normativo:** Brasil — Lei 13.709/2018 (LGPD); Mexico — LFPDPPP; Colombia — Ley 1581/2012; Argentina — Ley 25.326; Chile — Ley 21.719; y demas normativas nacionales de proteccion de datos de America Latina. Metodologia de analisis de riesgos compatible con las guias de la ANPD (Brasil) y autoridades equivalentes.
**Ambito territorial:** America Latina (LATAM). El servicio NO se comercializa ni se ofrece en la Union Europea / EEE.

---

## Indice

1. [Contexto y necesidad de la EIPD](#1-contexto-y-necesidad-de-la-eipd)
2. [Descripcion del tratamiento](#2-descripcion-del-tratamiento)
3. [Necesidad y proporcionalidad](#3-necesidad-y-proporcionalidad)
4. [Evaluacion de riesgos](#4-evaluacion-de-riesgos)
5. [Medidas de mitigacion](#5-medidas-de-mitigacion)
6. [Conclusion y plan de accion](#6-conclusion-y-plan-de-accion)
7. [Anexos](#7-anexos)

---

## 1. Contexto y necesidad de la EIPD

### 1.1 Descripcion del producto

Radiogen.AI es una plataforma SaaS (Software como Servicio) disenada para que radiologos dicten informes radiologicos mediante voz. El sistema utiliza inteligencia artificial para:

- **Transcripcion en tiempo real** del dictado de voz del radiologo (Deepgram).
- **Refinamiento de la transcripcion** mediante OpenAI Whisper y correccion automatica con modelos de lenguaje (GPT-4o-mini).
- **Estructuracion del informe** distribuyendo los hallazgos dictados en las secciones anatomicas de una plantilla clinica mediante LLMs (GPT-4o, GPT-4o-mini, Claude Sonnet/Haiku, DeepSeek, Gemini).
- **Generacion de conclusiones** sintetizando los hallazgos en puntos clinicamente jerarquizados.
- **Aprendizaje de estilo** adaptando las salidas al estilo de redaccion individual de cada radiologo.

### 1.2 Justificacion de la EIPD

La realizacion de este Relatorio/Evaluacion de Impacto es una buena practica exigida por el Art. 38 de la LGPD (y recomendada por las autoridades equivalentes de la region) cuando el tratamiento puede generar riesgos a las libertades civiles y a los derechos fundamentales, por concurrir los siguientes criterios:

- **Uso de nuevas tecnologias:** Inteligencia artificial generativa aplicada al ambito sanitario.
- **Datos relativos a la salud:** El texto de los dictados contiene terminologia clinica radiologica que, si bien se refiere a hallazgos anonimizados, podria contextualmente constituir dato sensible de salud.
- **Tratamiento a gran escala:** Despliegue hospitalario en centros de America Latina con potencial de escalar a multiples centros en la region.
- **Uso de perfilado:** Aprendizaje de estilo del radiologo basado en el analisis sistematico de sus informes previos.
- **Transferencias internacionales:** Los proveedores de IA (OpenAI, Anthropic, Google) procesan datos fuera del pais de origen del responsable, lo que activa las garantias de transferencia internacional de la LGPD (Arts. 33-36) y normativas equivalentes.

### 1.3 Despliegue hospitalario

Radiogen.AI se despliega en centros hospitalarios de **America Latina** (mercados prioritarios: Brasil, Mexico, Colombia, Argentina y Chile). Cada despliegue implica la integracion del servicio en el flujo de trabajo de multiples secciones de radiologia, con roles jerarquicos (jefe de organizacion, jefe de seccion, editor de seccion, radiologo adjunto y residente). El servicio no se ofrece en la Union Europea / EEE.

---

## 2. Descripcion del tratamiento

### 2.1 Finalidad del tratamiento

| Finalidad | Base legal (Art. 7 LGPD y equivalentes) | Base para datos sensibles de salud (Art. 11 LGPD y equivalentes) |
|---|---|---|
| Prestacion del servicio de dictado y estructuracion de informes radiologicos | Art. 7, V) Ejecucion de contrato (Condiciones de Uso aceptadas por el usuario) | Art. 11, II, f) Tutela de la salud, en procedimiento realizado por profesionales de salud o servicios sanitarios |
| Aprendizaje de estilo del radiologo | Art. 7, V) Ejecucion de contrato | No aplica (datos de estilo linguistico, no datos de salud) |
| Gestion de cuentas de usuario y organizaciones hospitalarias | Art. 7, V) Ejecucion de contrato | No aplica |
| Facturacion y gestion de suscripciones | Art. 7, V) Ejecucion de contrato | No aplica |
| Mejora del servicio y soporte tecnico | Art. 7, IX) Legitimo interes | No aplica |
| Registro de uso y auditoria | Art. 7, II) Cumplimiento de obligacion legal/regulatoria; Art. 7, IX) Legitimo interes | Art. 11, II, f) cuando aplique |

### 2.2 Categorias de interesados

| Categoria | Descripcion |
|---|---|
| **Radiologos usuarios** | Profesionales medicos que utilizan la plataforma para dictar y estructurar informes. Sus datos personales incluyen: nombre, email, rol profesional, institucion, datos de cuenta. |
| **Residentes** | Medicos en formacion que utilizan la plataforma bajo supervision. Datos adicionales: verificacion de residencia (documento acreditativo, fecha de inicio/fin, institucion). |
| **Pacientes (indirectamente)** | El texto dictado contiene hallazgos clinicos radiologicos. El sistema esta disenado para que NO se incluyan datos identificativos de pacientes (nombre, DNI, numero de historia clinica). |

### 2.3 Categorias de datos tratados

#### 2.3.1 Datos de los usuarios (radiologos)

| Dato | Categoria del dato | Retencion |
|---|---|---|
| Nombre y apellidos | Dato identificativo | Vigencia de la cuenta + periodo legal |
| Direccion de correo electronico | Dato identificativo | Vigencia de la cuenta + periodo legal |
| Rol en la organizacion (jefe, adjunto, residente) | Dato profesional | Vigencia de la cuenta |
| Institucion / hospital | Dato profesional | Vigencia de la cuenta |
| Plan de suscripcion y datos de facturacion | Dato economico | Obligacion fiscal (5 anos) |
| Datos de autenticacion (hash de contrasena, sesiones) | Dato de seguridad | Vigencia de la cuenta |
| Documentos de verificacion de residencia | Dato identificativo / profesional | Hasta resolucion de la verificacion |

#### 2.3.2 Datos contenidos en los dictados

| Dato | Categoria del dato | Retencion |
|---|---|---|
| Texto del dictado (hallazgos radiologicos anonimizados) | Potencialmente dato sensible de salud (Art. 11 LGPD) | Vigencia de la cuenta del usuario |
| Audio del dictado | Dato de salud (contenido clinico) | Efimero: se procesa y se descarta. No se almacena en servidores de Radiogenia. |
| Informe estructurado generado | Potencialmente dato de salud | Vigencia de la cuenta del usuario |
| Conclusiones generadas | Potencialmente dato de salud | Vigencia de la cuenta del usuario |
| Muestras de estilo (few-shot learning) | Dato profesional / potencialmente dato de salud | Vigencia de la cuenta del usuario |
| Frases de normalidad aprendidas | Dato profesional | Vigencia de la cuenta del usuario |

#### 2.3.3 Datos que NO deben estar presentes en los dictados

El sistema esta disenado bajo el principio de **anonimizacion en origen**: los radiologos NO deben incluir datos identificativos de pacientes en sus dictados. El sistema incorpora un filtro de deteccion de PII (`pii-detect.ts`) que identifica y bloquea automaticamente:

- DNI espanol (con validacion algoritmica de la letra de control)
- NIE (Numero de Identidad de Extranjero, con validacion algoritmica)
- Numeros de telefono espanoles e internacionales
- Direcciones de correo electronico
- Numero de afiliacion a la Seguridad Social (con validacion de provincia)
- Nombres propios de persona (base de datos de nombres espanoles comunes)

El filtro es **conservador** e incluye salvaguardas para evitar falsos positivos:
- Exclusion de numeros seguidos de unidades medicas (mm, cm, kg, ml, UH, mGy, etc.)
- Exclusion de fechas y horas
- Validacion algoritmica de DNI/NIE (modulo 23)
- Validacion de prefijo de provincia para NSS

### 2.4 Flujo de datos

```
FASE 1: DICTADO POR VOZ
========================
Radiologo (navegador web)
    |
    | Audio en tiempo real (WebSocket, cifrado TLS)
    v
Deepgram API (transcripcion en tiempo real)
    |
    | Texto transcrito (efimero)
    v
Navegador del usuario (visualizacion en tiempo real)


FASE 2: REFINAMIENTO DEL AUDIO
===============================
Navegador (graba audio WebM/OGG)
    |
    | Audio completo (HTTPS/TLS)
    v
Servidor Radiogenia (Next.js API route)
    |
    | Audio (HTTPS/TLS)
    v
OpenAI Whisper API (transcripcion refinada)
    |
    | Texto transcrito
    v
Servidor Radiogenia
    |
    | [FILTRO PII: deteccion y bloqueo de datos identificativos]
    |
    | Texto limpio (HTTPS/TLS)
    v
GPT-4o-mini (correccion ortografica/terminologica)
    |
    | Texto corregido
    v
Navegador del usuario


FASE 3: ESTRUCTURACION DEL INFORME
====================================
Navegador del usuario
    |
    | Texto dictado + plantilla (HTTPS/TLS)
    v
Servidor Radiogenia
    |
    | [FILTRO PII: segunda verificacion]
    |
    | Texto anonimizado + prompt de sistema (HTTPS/TLS)
    v
Proveedor de IA seleccionado:
  - OpenAI (GPT-4o / GPT-4o-mini)
  - Anthropic (Claude Sonnet / Haiku)
  - DeepSeek (DeepSeek-v4)
  - Google (Gemini 1.5 Pro / 2.0 Flash)
  - Endpoint personalizado (custom)
    |
    | Informe estructurado
    v
Servidor Radiogenia
    |
    v
Navegador del usuario + Almacenamiento en Supabase


FASE 4: ALMACENAMIENTO
========================
Supabase (PostgreSQL)
  - Informes del usuario (cifrado en reposo)
  - Muestras de estilo
  - Frases de normalidad aprendidas
  - Perfil de usuario
  - Configuracion de la organizacion
```

### 2.5 Encargados del tratamiento y subencargados

| Encargado | Funcion | Ubicacion | Garantias de transferencia |
|---|---|---|---|
| **Supabase Inc.** | Alojamiento de base de datos, autenticacion, almacenamiento | EE.UU. (AWS) / region disponible | Data Processing Agreement (DPA); clausulas contractuales de transferencia internacional (Art. 33 LGPD); cifrado en reposo y en transito |
| **Deepgram Inc.** | Transcripcion de voz en tiempo real | EE.UU. | DPA; clausulas contractuales de transferencia internacional |
| **OpenAI LLC** | Transcripcion Whisper, correccion de dictado, estructuracion de informes (GPT-4o/mini) | EE.UU. | DPA; Zero Data Retention (ZDR) policy para API; clausulas contractuales de transferencia internacional |
| **Anthropic PBC** | Estructuracion de informes (Claude) | EE.UU. | DPA; no entrenamiento con datos de API; clausulas contractuales de transferencia internacional |
| **DeepSeek** | Estructuracion de informes (DeepSeek) | China | DPA; clausulas contractuales de transferencia internacional; evaluacion de adecuacion por pais |
| **Google LLC** | Estructuracion de informes (Gemini) | EE.UU./UE | DPA; clausulas contractuales de transferencia internacional (Art. 33 LGPD); no entrenamiento con datos de API |
| **Stripe Inc.** | Procesamiento de pagos | EE.UU./UE | DPA; clausulas contractuales de transferencia internacional (Art. 33 LGPD); PCI DSS Level 1 |
| **Vercel Inc.** | Hosting de la aplicacion web (Next.js) | EE.UU./UE | DPA; cifrado en transito |

### 2.6 Transferencias internacionales de datos

Las transferencias internacionales de datos (texto clinico anonimizado) se realizan a los siguientes paises, conforme a las garantias de los Arts. 33-36 de la LGPD y normativas equivalentes:

| Destino | Datos transferidos | Mecanismo de proteccion |
|---|---|---|
| EE.UU. | Texto anonimizado de dictados (a OpenAI, Anthropic, Deepgram, Google) | Clausulas contractuales y Acuerdos de Tratamiento de Datos (DPA) con cada proveedor; politica de no entrenamiento y retencion cero; cifrado en transito. Al tratarse de datos anonimizados (Art. 12 LGPD) el riesgo de transferencia es reducido. |
| China | Texto anonimizado de dictados (a DeepSeek, solo si el administrador selecciona este proveedor) | Clausulas contractuales + Evaluacion de Impacto de Transferencia (TIA). Desactivado por defecto; no recomendado para datos de salud. |

**Nota importante sobre DeepSeek:** El uso de DeepSeek como proveedor de IA es **configurable por el administrador** y no esta activado por defecto. Dada la situacion normativa de China respecto a la proteccion de datos, se recomienda a las organizaciones hospitalarias una evaluacion especifica antes de activar este proveedor. El sistema permite utilizar exclusivamente proveedores con sede en EE.UU. o con infraestructura en la UE.

### 2.7 Modelo de organizacion hospitalaria

En el modo hospitalario, la plataforma implementa una estructura jerarquica de roles:

| Rol | Permisos | Descripcion |
|---|---|---|
| `org_chief` (Jefe de organizacion) | Gestion completa de la organizacion, secciones, miembros, plantillas, frases de normalidad | Jefe del servicio de radiologia o responsable designado |
| `section_chief` (Jefe de seccion) | Gestion de miembros y configuracion de su seccion | Jefe de seccion (abdomen, torax, neuro, etc.) |
| `section_editor` (Editor de seccion) | Edicion de plantillas y frases de normalidad de la seccion | Radiologo senior designado |
| `radiologist` (Radiologo adjunto) | Uso de la plataforma: dictado, generacion de informes, configuracion personal | Radiologo facultativo |
| `resident` (Residente) | Uso limitado de la plataforma; requiere verificacion de residencia | Medico interno residente (MIR) |

La relacion entre la organizacion hospitalaria y Radiogenia se rige por:
- **Contrato de prestacion de servicios** con el hospital.
- **Acuerdo de tratamiento de datos** (Arts. 37-39 LGPD y equivalentes) firmado entre el hospital (controlador) y Radiogenia (operador).
- **Politica de uso aceptable** para los usuarios individuales.

---

## 3. Necesidad y proporcionalidad

### 3.1 Principio de necesidad / minimizacion de datos (Art. 6, III LGPD y equivalentes)

| Principio | Implementacion en Radiogen.AI |
|---|---|
| **Minimizacion en la recogida** | El sistema esta disenado para procesar texto clinico anonimizado. No se solicitan ni almacenan datos identificativos de pacientes. El filtro PII actua como barrera tecnica adicional. |
| **Minimizacion en el procesamiento** | El audio del dictado es efimero: se transmite, se transcribe y se descarta. No se almacena en servidores de Radiogenia ni en los proveedores de IA (politica ZDR de OpenAI). |
| **Minimizacion en el almacenamiento** | Solo se almacena el texto del dictado, el informe estructurado y las muestras de estilo. No se almacena audio, ni datos biometricos de voz, ni datos identificativos de pacientes. |
| **Minimizacion en las transferencias** | A los proveedores de IA solo se envia el texto clinico anonimizado necesario para la tarea especifica (estructuracion o correccion). No se envian datos del usuario ni metadatos del paciente. |

### 3.2 Principio de finalidad (Art. 6, I LGPD y equivalentes)

Los datos se tratan exclusivamente para las finalidades descritas en la seccion 2.1. En particular:

- **No se utilizan los datos de dictados para entrenar modelos de IA.** Las APIs de OpenAI, Anthropic y Google tienen politicas explicitas de no entrenamiento con datos recibidos a traves de su API.
- **No se comparten datos entre usuarios** de diferentes cuentas u organizaciones.
- **No se realizan perfilados comerciales** ni se ceden datos a terceros con fines de marketing.

### 3.3 Principio de calidad / exactitud de los datos (Art. 6, V LGPD y equivalentes)

- El radiologo tiene control total sobre el informe generado: puede editar, corregir o reescribir cualquier seccion antes de utilizarlo.
- El sistema no emite diagnosticos: describe hallazgos radiologicos segun el dictado del profesional.
- Se incluyen advertencias explicitas de que la IA es una herramienta de asistencia y que el radiologo es el responsable final del informe.

### 3.4 Principio de limitacion del plazo de conservacion (Art. 6, III y Arts. 15-16 LGPD y equivalentes)

| Tipo de dato | Periodo de conservacion | Justificacion |
|---|---|---|
| Informes y dictados | Vigencia de la cuenta + 30 dias tras baja | Necesario para el servicio y el aprendizaje de estilo |
| Muestras de estilo | Vigencia de la cuenta | Necesario para la funcionalidad de aprendizaje |
| Datos de cuenta (email, nombre) | Vigencia de la cuenta + periodo legal | Obligaciones contractuales y legales |
| Datos de facturacion | 5 anos desde la ultima factura | Obligacion fiscal (Ley General Tributaria) |
| Audio de dictados | Efimero (segundos) | Se procesa y se descarta inmediatamente |
| Documentos de verificacion de residencia | Hasta resolucion de la solicitud | Finalidad cumplida |
| Logs de auditoria | 2 anos | Interes legitimo y obligacion legal |

### 3.5 Derechos de los titulares (Art. 18 LGPD y equivalentes)

| Derecho | Mecanismo |
|---|---|
| **Acceso** (art. 15) | El usuario puede consultar todos sus informes, configuracion y datos de perfil a traves de la interfaz. Solicitudes formales atendidas en 30 dias. |
| **Rectificacion** (art. 16) | El usuario puede editar su perfil y todos sus informes directamente en la plataforma. |
| **Supresion** (art. 17) | Eliminacion de cuenta disponible. Los datos se eliminan de Supabase y se solicita eliminacion a los subencargados conforme a sus DPA. |
| **Portabilidad** (art. 20) | Exportacion masiva de informes en formato estructurado (funcion de exportacion disponible en el plan Professional). |
| **Oposicion** (art. 21) | El usuario puede desactivar el aprendizaje de estilo. Puede solicitar la no utilizacion de proveedores de IA especificos. |
| **Limitacion** (art. 18) | Mecanismo disponible a traves del canal de soporte. |

### 3.6 Evaluacion de necesidad

**Pregunta:** Es necesario tratar estos datos con IA para lograr la finalidad?

**Respuesta:** Si. La finalidad del servicio es asistir al radiologo en la redaccion de informes estructurados a partir de dictados de voz. Esta tarea requiere:

1. **Reconocimiento de voz** (Deepgram/Whisper): imprescindible para convertir el dictado oral en texto.
2. **Procesamiento de lenguaje natural** (LLMs): necesario para distribuir los hallazgos en secciones anatomicas, generar frases de normalidad y sintetizar conclusiones. Esta tarea no es automatizable con reglas deterministas debido a la variabilidad del lenguaje medico.
3. **Aprendizaje de estilo**: proporcional al objetivo de que la herramienta se adapte al radiologo, reduciendo las correcciones manuales con el tiempo.

**Alternativas evaluadas y descartadas:**

| Alternativa | Razon de descarte |
|---|---|
| Procesamiento enteramente local (sin cloud) | Inviable tecnicamente: los modelos de reconocimiento de voz y lenguaje natural de calidad medica requieren infraestructura GPU que no es viable on-premise para un SaaS. |
| Procesamiento sin IA (solo transcripcion) | No logra la finalidad: el valor diferencial es la estructuracion automatica del informe. |
| Solicitar datos anonimizados al hospital antes del dictado | Desproporcionado: el flujo de trabajo del radiologo ya es anonimizado en la practica clinica habitual. Anadir un paso de anonimizacion previo al uso de la herramienta seria inviable operativamente. |

---

## 4. Evaluacion de riesgos

### 4.1 Metodologia

Se utiliza una metodologia de analisis de riesgos compatible con buenas practicas internacionales (ISO/IEC 29134) y con las orientaciones de la ANPD y autoridades equivalentes de la region, que evalua cada riesgo en funcion de:

- **Probabilidad:** Muy baja (1), Baja (2), Media (3), Alta (4), Muy alta (5)
- **Impacto:** Muy bajo (1), Bajo (2), Medio (3), Alto (4), Muy alto (5)
- **Nivel de riesgo:** Probabilidad x Impacto

| Nivel de riesgo | Rango | Tratamiento |
|---|---|---|
| Bajo | 1-4 | Aceptable |
| Medio | 5-9 | Requiere medidas de mitigacion |
| Alto | 10-16 | Requiere medidas prioritarias |
| Muy alto | 17-25 | Inaceptable sin mitigacion inmediata |

### 4.2 Matriz de riesgos

#### R01 - Inclusion accidental de datos identificativos de pacientes en el dictado

| Parametro | Valor |
|---|---|
| **Descripcion** | Un radiologo incluye involuntariamente en su dictado datos como el nombre del paciente, DNI, numero de telefono o numero de historia clinica. Estos datos serian procesados por los proveedores de IA externos. |
| **Categoria de datos afectados** | Datos identificativos + datos de salud = datos especialmente sensibles |
| **Probabilidad** | 3 (Media) - Los radiologos estan habituados a dictar informes sin datos de pacientes, pero errores humanos son posibles, especialmente bajo presion asistencial. |
| **Impacto** | 4 (Alto) - Constituiria una transferencia no autorizada de datos de salud identificables a terceros paises. |
| **Riesgo inherente** | **12 (Alto)** |
| **Medidas de mitigacion aplicadas** | Filtro PII automatico (`pii-detect.ts`) con deteccion de DNI, NIE, telefonos, emails, NSS y nombres propios; validacion algoritmica para minimizar falsos positivos; aviso al usuario cuando se detecta PII; politica de uso que prohibe incluir datos de pacientes; formacion a usuarios hospitalarios. |
| **Riesgo residual** | **6 (Medio)** - El filtro reduce significativamente la probabilidad (de 3 a 2), pero no puede garantizar deteccion del 100% de todos los patrones posibles (ej: numeros de historia clinica con formatos hospitalarios especificos). |

#### R02 - Acceso no autorizado a la base de datos de informes

| Parametro | Valor |
|---|---|
| **Descripcion** | Un atacante accede a la base de datos Supabase y obtiene los informes radiologicos almacenados. |
| **Categoria de datos afectados** | Datos de salud (anonimizados), datos de cuenta |
| **Probabilidad** | 2 (Baja) - Supabase implementa cifrado en reposo, Row Level Security (RLS), autenticacion multifactor disponible. |
| **Impacto** | 4 (Alto) - Exposicion masiva de informes radiologicos. Aunque anonimizados, el volumen y el contexto podrian permitir reidentificacion en combinacion con otras fuentes. |
| **Riesgo inherente** | **8 (Medio)** |
| **Medidas de mitigacion aplicadas** | Cifrado en reposo (AES-256) en Supabase; Row Level Security (cada usuario solo accede a sus propios datos); sesiones con caducidad de 6 horas; claves API cifradas con AES-256-GCM; HTTPS obligatorio. |
| **Riesgo residual** | **4 (Bajo)** |

#### R03 - Interceptacion de datos en transito hacia proveedores de IA

| Parametro | Valor |
|---|---|
| **Descripcion** | Un atacante intercepta la comunicacion entre el servidor de Radiogenia y los proveedores de IA (OpenAI, Anthropic, etc.) |
| **Categoria de datos afectados** | Texto del dictado (potencialmente datos de salud anonimizados) |
| **Probabilidad** | 1 (Muy baja) - Todas las comunicaciones utilizan HTTPS/TLS 1.2+. |
| **Impacto** | 3 (Medio) - El texto interceptado seria anonimizado y sin contexto de paciente. |
| **Riesgo inherente** | **3 (Bajo)** |
| **Medidas de mitigacion aplicadas** | TLS 1.2+ obligatorio en todas las conexiones; certificados verificados; sin datos identificativos en el payload. |
| **Riesgo residual** | **2 (Bajo)** |

#### R04 - Uso indebido de los datos por los proveedores de IA

| Parametro | Valor |
|---|---|
| **Descripcion** | Un proveedor de IA utiliza los datos de los dictados para entrenar sus modelos o para otros fines no autorizados. |
| **Categoria de datos afectados** | Texto del dictado (potencialmente datos de salud anonimizados) |
| **Probabilidad** | 2 (Baja) - OpenAI, Anthropic y Google tienen politicas explicitas de Zero Data Retention (ZDR) / no entrenamiento para datos de API empresarial. DeepSeek: riesgo mayor por jurisdiccion china. |
| **Impacto** | 4 (Alto) - Podria suponer una perdida de control sobre datos de salud e incumplimiento del principio de limitacion de la finalidad. |
| **Riesgo inherente** | **8 (Medio)** |
| **Medidas de mitigacion aplicadas** | DPAs firmados con cada proveedor; seleccion de planes API con ZDR/no-training; filtro PII previo al envio; DeepSeek desactivado por defecto y sujeto a evaluacion especifica; monitorizacion de cambios en las politicas de privacidad de los proveedores. |
| **Riesgo residual** | **4 (Bajo)** para proveedores EE.UU.; **8 (Medio)** para DeepSeek |

#### R05 - Suplantacion de identidad o acceso no autorizado a cuentas de usuario

| Parametro | Valor |
|---|---|
| **Descripcion** | Un atacante obtiene acceso a la cuenta de un radiologo y accede a sus informes, los modifica o los exfiltra. |
| **Categoria de datos afectados** | Datos de cuenta, informes radiologicos, configuracion del servicio |
| **Probabilidad** | 2 (Baja) - Autenticacion gestionada por Supabase Auth con sesiones de duracion limitada (6 horas). |
| **Impacto** | 3 (Medio) - Acceso a informes anonimizados de un unico usuario. En modo hospitalario, un jefe de organizacion comprometido podria tener mayor impacto. |
| **Riesgo inherente** | **6 (Medio)** |
| **Medidas de mitigacion aplicadas** | Sesiones de 6 horas maximo; middleware de autenticacion en cada peticion; Row Level Security en base de datos; sistema de roles jerarquicos con principio de minimo privilegio; logs de auditoria. |
| **Riesgo residual** | **4 (Bajo)** |

#### R06 - Filtracion de claves API de los proveedores de IA

| Parametro | Valor |
|---|---|
| **Descripcion** | Las claves API de los proveedores de IA (almacenadas en la base de datos) son comprometidas, permitiendo el uso no autorizado de los servicios o el acceso al historial de peticiones. |
| **Categoria de datos afectados** | Claves de acceso a servicios de terceros |
| **Probabilidad** | 2 (Baja) - Las claves se almacenan cifradas con AES-256-GCM con IV aleatorio y etiqueta de autenticacion. |
| **Impacto** | 3 (Medio) - Un atacante podria usar las claves para realizar peticiones a los proveedores de IA, pero no accederia directamente a datos de pacientes almacenados. |
| **Riesgo inherente** | **6 (Medio)** |
| **Medidas de mitigacion aplicadas** | Cifrado AES-256-GCM con IV aleatorio de 16 bytes y authentication tag; clave de cifrado almacenada en variable de entorno (no en codigo fuente ni en base de datos); descifrado solo en el servidor, nunca en el cliente. |
| **Riesgo residual** | **3 (Bajo)** |

#### R07 - Generacion de contenido clinico erroneo por la IA (alucinaciones)

| Parametro | Valor |
|---|---|
| **Descripcion** | El modelo de IA genera hallazgos patologicos no dictados, omite hallazgos dictados, o cambia datos criticos (medidas, lateralidad) en el informe estructurado. |
| **Categoria de datos afectados** | Integridad del informe radiologico |
| **Probabilidad** | 3 (Media) - Los LLMs actuales pueden producir alucinaciones. El sistema incluye multiples instrucciones de mitigacion en los prompts. |
| **Impacto** | 5 (Muy alto) - Un informe con hallazgos erroneos puede conducir a decisiones clinicas incorrectas con dano potencial al paciente. |
| **Riesgo inherente** | **15 (Alto)** |
| **Medidas de mitigacion aplicadas** | Instrucciones exhaustivas anti-alucinacion y anti-omision en los prompts del sistema; verificacion obligatoria en 4 pasos integrada en el prompt; uso de temperatura 0 en todas las llamadas a IA; el radiologo revisa y edita el informe antes de su uso clinico; disclaimer de exencion de responsabilidad aceptado por cada usuario; el sistema no emite diagnosticos, solo describe hallazgos. |
| **Riesgo residual** | **6 (Medio)** - La revision humana obligatoria del radiologo es la barrera principal. |

#### R08 - Transferencia internacional a China (DeepSeek)

| Parametro | Valor |
|---|---|
| **Descripcion** | Cuando se selecciona DeepSeek como proveedor, los datos del dictado se transfieren a servidores en China, pais sin decision de adecuacion de la Comision Europea. |
| **Categoria de datos afectados** | Texto del dictado (potencialmente datos de salud anonimizados) |
| **Probabilidad** | 2 (Baja) - DeepSeek esta desactivado por defecto; requiere activacion explicita por el administrador. |
| **Impacto** | 5 (Muy alto) - Riesgo regulatorio significativo: posible acceso gubernamental bajo la Ley de Inteligencia Nacional de China; posible incumplimiento de las reglas de transferencia internacional de la LGPD (Arts. 33-36) y equivalentes. |
| **Riesgo inherente** | **10 (Alto)** |
| **Medidas de mitigacion aplicadas** | DeepSeek desactivado por defecto; requiere activacion explicita; aviso al administrador sobre las implicaciones; datos siempre filtrados por PII antes del envio; recomendacion activa de no usar DeepSeek para datos de salud. |
| **Riesgo residual** | **6 (Medio)** - Se recomienda no activar DeepSeek en despliegues hospitalarios espanoles. |

#### R09 - Perdida de disponibilidad del servicio

| Parametro | Valor |
|---|---|
| **Descripcion** | El servicio queda inaccesible por caida de Supabase, Vercel, o de los proveedores de IA, impidiendo a los radiologos dictar y estructurar informes. |
| **Categoria de datos afectados** | Disponibilidad del servicio |
| **Probabilidad** | 2 (Baja) - Dependencia de multiples proveedores cloud con SLAs de alta disponibilidad. |
| **Impacto** | 3 (Medio) - Los radiologos pueden continuar dictando informes de forma tradicional. Radiogen.AI es una herramienta de asistencia, no un sistema critico del que dependa la atencion sanitaria. |
| **Riesgo inherente** | **6 (Medio)** |
| **Medidas de mitigacion aplicadas** | Multiples proveedores de IA configurables (fallback); arquitectura serverless con escalado automatico; SLAs de Supabase y Vercel; el servicio no sustituye al sistema de dictado/informacion radiologica (RIS) del hospital. |
| **Riesgo residual** | **4 (Bajo)** |

#### R10 - Reidentificacion de pacientes a partir de informes anonimizados

| Parametro | Valor |
|---|---|
| **Descripcion** | Aunque los informes no contienen datos identificativos, la combinacion de hallazgos clinicos muy especificos (patologias raras, combinaciones unicas de hallazgos) con otros datos disponibles podria permitir la reidentificacion de un paciente. |
| **Categoria de datos afectados** | Datos de salud pseudoanonimizados |
| **Probabilidad** | 1 (Muy baja) - Requeriria acceso a la base de datos de Radiogenia Y a los registros hospitalarios, y ademas un caso clinicamente unico. |
| **Impacto** | 4 (Alto) - Violacion del derecho a la intimidad del paciente; posible sancion regulatoria. |
| **Riesgo inherente** | **4 (Bajo)** |
| **Medidas de mitigacion aplicadas** | Filtro PII; ausencia de metadatos de pacientes en el sistema; los informes no incluyen fecha de estudio, numero de acceso ni referencia al paciente; Row Level Security limita el acceso a los informes propios del radiologo. |
| **Riesgo residual** | **2 (Bajo)** |

### 4.3 Resumen de la matriz de riesgos

| ID | Riesgo | Riesgo inherente | Riesgo residual | Estado |
|---|---|---|---|---|
| R01 | Inclusion accidental de PII en dictados | 12 (Alto) | 6 (Medio) | Mitigado - Monitorizar |
| R02 | Acceso no autorizado a BBDD | 8 (Medio) | 4 (Bajo) | Mitigado - Aceptable |
| R03 | Interceptacion en transito | 3 (Bajo) | 2 (Bajo) | Aceptable |
| R04 | Uso indebido por proveedores IA | 8 (Medio) | 4-8 (Bajo-Medio) | Mitigado - Monitorizar (DeepSeek) |
| R05 | Suplantacion de identidad | 6 (Medio) | 4 (Bajo) | Mitigado - Aceptable |
| R06 | Filtracion de claves API | 6 (Medio) | 3 (Bajo) | Mitigado - Aceptable |
| R07 | Alucinaciones de la IA | 15 (Alto) | 6 (Medio) | Mitigado - Monitorizar |
| R08 | Transferencia a China (DeepSeek) | 10 (Alto) | 6 (Medio) | Desactivado por defecto |
| R09 | Perdida de disponibilidad | 6 (Medio) | 4 (Bajo) | Mitigado - Aceptable |
| R10 | Reidentificacion de pacientes | 4 (Bajo) | 2 (Bajo) | Aceptable |

---

## 5. Medidas de mitigacion

### 5.1 Medidas tecnicas

#### 5.1.1 Filtro de deteccion de datos personales (PII)

**Archivo:** `src/lib/pii-detect.ts`

El sistema incorpora un modulo de deteccion de datos de identificacion personal disenado especificamente para el contexto radiologico espanol. El filtro se ejecuta **antes de enviar cualquier texto a proveedores de IA** externos e incluye:

| Tipo de PII | Metodo de deteccion | Salvaguardas contra falsos positivos |
|---|---|---|
| DNI espanol | Regex + validacion de letra de control (algoritmo modulo 23) | Exclusion de numeros seguidos de unidades medicas; exclusion de fechas/horas |
| NIE | Regex + validacion de letra de control (X/Y/Z + modulo 23) | Mismas salvaguardas que DNI |
| Telefonos espanoles | Regex para formatos con/sin prefijo +34, 9 digitos empezando por 6/7/8/9 | Exclusion de unidades medicas y fechas; control de superposicion entre patrones |
| Telefonos internacionales | Regex para formato +XX(X) XXX XXX XXX | Validacion de longitud (10-15 digitos) |
| Emails | Regex estandar con fronteras de palabra | N/A |
| NSS (Seguridad Social) | Regex para 12 digitos (formateado y sin formato) + validacion de provincia (01-52) | Exclusion de unidades medicas y fechas; evitacion de solapamiento |
| Nombres propios | Base de datos de 300+ nombres espanoles comunes + deteccion de patron "Nombre + Apellido" (capitalizacion) | Normalizacion Unicode; exclusion de conectores (de, del, la) |

#### 5.1.2 Cifrado

| Elemento | Algoritmo | Detalle |
|---|---|---|
| Claves API almacenadas | AES-256-GCM | IV aleatorio de 16 bytes; authentication tag; clave maestra en variable de entorno |
| Base de datos (reposo) | AES-256 (Supabase/AWS) | Cifrado transparente gestionado por la infraestructura |
| Comunicaciones (transito) | TLS 1.2+ | HTTPS obligatorio en todas las conexiones (cliente-servidor, servidor-proveedores IA) |

#### 5.1.3 Control de acceso

| Mecanismo | Implementacion |
|---|---|
| Autenticacion | Supabase Auth con sesiones JWT de duracion maxima de 6 horas |
| Autorizacion por fila (RLS) | Row Level Security en PostgreSQL: cada usuario solo puede acceder a sus propios datos |
| Roles organizacionales | Sistema jerarquico de roles (`org_chief` > `section_chief` > `section_editor` > `radiologist` > `resident`) con principio de minimo privilegio |
| Middleware de autenticacion | Verificacion de sesion en cada peticion HTTP mediante middleware de Next.js |
| Verificacion de residentes | Proceso de verificacion documental para usuarios con plan de residente |
| Administracion | Lista de emails de administradores configurada por variable de entorno |

#### 5.1.4 Seguridad de la aplicacion

| Medida | Detalle |
|---|---|
| Validacion de entrada | Validacion de todos los parametros de entrada en los API routes |
| Limitacion de tasas | Limites de informes y minutos de dictado por plan de suscripcion |
| Procesamiento server-side | Todo el procesamiento de IA ocurre en el servidor; las claves API nunca se exponen al cliente (excepto Deepgram temporalmente para WebSocket) |
| Logs de auditoria | Registro de acciones administrativas y de uso |
| Dependencias | Gestion de dependencias con actualizaciones periodicas |

### 5.2 Medidas organizativas

#### 5.2.1 Politicas y documentacion legal

| Documento | Contenido | Momento de aceptacion |
|---|---|---|
| **Condiciones de Uso** | Descripcion del servicio, limitaciones, responsabilidades | Registro del usuario |
| **Politica de Privacidad** | Tratamiento de datos conforme a la LGPD y normativas LATAM, derechos de los titulares, transferencias internacionales | Registro del usuario |
| **Disclaimer de Responsabilidad** | Exencion de responsabilidad clinica: el radiologo es el unico responsable del contenido final del informe; la IA es una herramienta de asistencia | Registro del usuario |
| **Acuerdo de Tratamiento de Datos** (Arts. 37-39 LGPD y equivalentes) | Obligaciones del operador, suboperadores, medidas de seguridad, notificacion de incidentes | Firma con cada organizacion hospitalaria |

#### 5.2.2 Formacion y concienciacion

Para el despliegue hospitalario se establece:

- **Sesion de formacion inicial** para todos los radiologos usuarios, que incluye:
  - Instruccion explicita de NO incluir datos de pacientes en los dictados.
  - Demostracion del filtro PII y sus limitaciones.
  - Explicacion del flujo de datos y los proveedores involucrados.
  - Instruccion sobre la revision obligatoria del informe generado antes de su uso clinico.
- **Material de referencia rapida** disponible en la plataforma.
- **Recordatorios periodicos** sobre buenas practicas de proteccion de datos.

#### 5.2.3 Gestion de incidentes y brechas de seguridad

| Fase | Accion | Plazo |
|---|---|---|
| Deteccion | Monitorizacion de logs, alertas de proveedores, reporte por usuarios | Continuo |
| Evaluacion | Determinacion del alcance, datos afectados y riesgo para los interesados | 24 horas |
| Notificacion a la autoridad de proteccion de datos (ANPD u homologa) | Si el incidente puede generar riesgo o dano relevante a los titulares | En plazo razonable desde la deteccion (Art. 48 LGPD y equivalentes) |
| Notificacion a los titulares | Si existe riesgo o dano relevante para los titulares | Sin dilacion indebida (Art. 48 LGPD) |
| Notificacion al hospital (controlador) | Siempre, en despliegues hospitalarios | Inmediata tras la deteccion |
| Registro | Documentacion del incidente, medidas adoptadas y resultados | 30 dias |

#### 5.2.4 Evaluacion continua

| Actividad | Frecuencia |
|---|---|
| Revision de la EIPD | Anual o ante cambios significativos en el tratamiento |
| Revision de las politicas de privacidad de los proveedores de IA | Semestral |
| Auditoria tecnica de seguridad | Anual |
| Revision del filtro PII (eficacia, falsos positivos/negativos) | Trimestral |
| Test de penetracion | Anual |
| Revision de DPAs con encargados del tratamiento | Anual |

### 5.3 Medidas especificas para el despliegue hospitalario

| Medida | Detalle |
|---|---|
| **Acuerdo de tratamiento de datos (Arts. 37-39 LGPD)** | Acuerdo controlador-operador firmado entre el hospital y Radiogenia, que detalla instrucciones de tratamiento, medidas de seguridad, gestion de suboperadores y procedimiento de notificacion de incidentes. |
| **Restriccion de proveedores de IA** | El hospital puede restringir los proveedores de IA permitidos (ej: solo OpenAI y Anthropic, excluyendo DeepSeek). |
| **Segregacion de datos** | Los datos de cada organizacion estan completamente segregados mediante RLS y el identificador de organizacion. |
| **Roles y permisos** | El jefe de organizacion controla los accesos: puede desactivar miembros, asignar roles y gestionar secciones. |
| **Plantillas y frases corporativas** | El hospital puede definir plantillas y frases de normalidad estandar para toda la organizacion, asegurando consistencia. |

---

## 6. Conclusion y plan de accion

### 6.1 Conclusion general

La evaluacion de impacto identifica que el tratamiento de datos realizado por Radiogen.AI presenta un **nivel de riesgo residual global MEDIO**, gestionable mediante las medidas tecnicas y organizativas implementadas y planificadas.

**Aspectos positivos destacados:**

1. **Diseno de anonimizacion en origen:** El sistema esta concebido para que los datos de pacientes nunca entren en la plataforma. El filtro PII proporciona una barrera tecnica adicional.
2. **Efimeridad del audio:** El audio de los dictados no se almacena, minimizando la superficie de exposicion.
3. **Cifrado robusto:** AES-256-GCM para claves API, cifrado en reposo y en transito.
4. **Control granular de acceso:** Row Level Security, roles jerarquicos, sesiones de duracion limitada.
5. **Revision humana obligatoria:** El radiologo siempre revisa y edita el informe antes de su uso clinico.
6. **Transparencia:** El usuario acepta tres documentos legales y conoce los proveedores involucrados.

**Riesgos que requieren atencion continuada:**

1. **R01 (Inclusion accidental de PII):** Riesgo residual medio. El filtro PII es una mitigacion efectiva pero no infalible. Requiere monitorizacion y mejora continua.
2. **R07 (Alucinaciones de la IA):** Riesgo residual medio. La barrera principal es la revision humana del radiologo. Es fundamental que los usuarios comprendan que la IA es una herramienta de asistencia y que deben verificar cada informe.
3. **R08 (Transferencias a China/DeepSeek):** Riesgo residual medio cuando esta activado. Se recomienda firmemente no activar DeepSeek en despliegues hospitalarios sujetos a la LGPD y normativas LATAM.

### 6.2 Plan de accion

| # | Accion | Prioridad | Responsable | Plazo | Estado |
|---|---|---|---|---|---|
| 1 | Designar formalmente un Encargado de Proteccion de Datos (DPO) | Alta | Direccion | T3 2026 | Pendiente |
| 2 | Formalizar los DPAs con todos los proveedores de IA (OpenAI, Anthropic, Google, Deepgram) | Alta | DPO / Legal | T3 2026 | En curso |
| 3 | Firmar el acuerdo de tratamiento de datos (Arts. 37-39 LGPD y equivalentes) con cada hospital cliente | Alta | DPO / Legal | Previo al despliegue | En curso |
| 4 | Implementar autenticacion multifactor (MFA) para cuentas hospitalarias | Alta | Ingenieria | T3 2026 | Pendiente |
| 5 | Desactivar DeepSeek por defecto en todos los despliegues hospitalarios espanoles y anadir aviso regulatorio | Alta | Ingenieria | T3 2026 | Implementado (desactivado por defecto) |
| 6 | Ampliar el filtro PII para detectar numeros de historia clinica (formatos hospitalarios comunes) | Media | Ingenieria | T4 2026 | Pendiente |
| 7 | Implementar mecanismo de exportacion/portabilidad de datos para todos los planes | Media | Ingenieria | T4 2026 | Parcialmente implementado |
| 8 | Realizar test de penetracion externo | Media | Seguridad / DPO | T3 2026 | Pendiente |
| 9 | Establecer procedimiento formal de gestion de incidentes con plantillas de notificacion a la ANPD y autoridades equivalentes | Media | DPO / Legal | T3 2026 | Pendiente |
| 10 | Crear programa de formacion en proteccion de datos para usuarios hospitalarios | Media | DPO / Producto | Previo al despliegue | En desarrollo |
| 11 | Implementar registro de operaciones de tratamiento (Art. 37 LGPD y equivalentes) formal | Media | DPO | T3 2026 | Pendiente |
| 12 | Evaluar proveedores de IA con infraestructura regional/local (p. ej., en Brasil) para minimizar transferencias internacionales | Media | Ingenieria / DPO | T4 2026 | Pendiente |
| 13 | Realizar Evaluacion de Impacto de Transferencia (TIA) especifica para DeepSeek | Baja (si no se activa) | DPO / Legal | Antes de activacion | Pendiente |
| 14 | Implementar mecanismo de consentimiento granular para la seleccion de proveedor de IA en modo hospitalario | Baja | Ingenieria | T1 2027 | Pendiente |
| 15 | Revisar y actualizar este RIPD | Media | DPO | Mayo 2027 | Programado |

### 6.3 Dictamen

Considerando el analisis realizado, las medidas de mitigacion implementadas y el plan de accion definido, se concluye que:

1. El tratamiento de datos realizado por Radiogen.AI **es conforme con los principios de la LGPD y las normativas de proteccion de datos de Latinoamerica**, siempre que se ejecuten las acciones del plan de accion con los plazos establecidos.
2. Los riesgos residuales identificados son **gestionables**. La ANPD (Art. 38 LGPD) y autoridades equivalentes pueden solicitar este RIPD; el documento se mantiene disponible y actualizado a tal efecto.
3. La **revision humana obligatoria** por parte del radiologo constituye la medida de mitigacion mas efectiva tanto para riesgos de proteccion de datos como para riesgos de seguridad del paciente.
4. Se recomienda **no activar DeepSeek** en despliegues hospitalarios sujetos a la LGPD y normativas LATAM hasta que existan garantias de transferencia internacional verificables.
5. La EIPD debera **revisarse anualmente** o ante cualquier cambio significativo en el tratamiento (nuevo proveedor de IA, nuevo tipo de dato, nueva funcionalidad, expansion a nuevos mercados).

---

## 7. Anexos

### Anexo A - Registro de actividades de tratamiento (resumen)

| Campo | Valor |
|---|---|
| **Responsable del tratamiento (Controlador)** | Radiogenia |
| **Contacto del responsable** | [Direccion de contacto] |
| **DPO (Encargado de Proteccion de Datos)** | [Pendiente de designacion] |
| **Finalidades** | Prestacion de servicio de dictado radiologico asistido por IA; gestion de cuentas; facturacion; mejora del servicio |
| **Categorias de interesados** | Radiologos, residentes, pacientes (indirectamente) |
| **Categorias de datos** | Datos identificativos (usuarios), datos de salud (anonimizados, en dictados), datos economicos (facturacion) |
| **Destinatarios** | Proveedores de IA (OpenAI, Anthropic, Deepgram, Google, DeepSeek); Supabase; Stripe; Vercel |
| **Transferencias internacionales** | EE.UU. (DPA + clausulas contractuales, datos anonimizados), China (clausulas contractuales + TIA - solo si DeepSeek activado) |
| **Plazos de supresion** | Vigencia de la cuenta + 30 dias (informes); 5 anos (facturacion); efimero (audio) |
| **Medidas de seguridad** | Cifrado AES-256 (reposo y claves), TLS 1.2+ (transito), RLS, filtro PII, roles jerarquicos, sesiones de 6h |

### Anexo B - Flujo detallado del filtro PII

```
Texto del dictado
      |
      v
detectPii(text)
      |
      +---> detectDni(text)       --> Validacion regex + letra modulo 23
      +---> detectNie(text)       --> Validacion regex + letra modulo 23
      +---> detectPhone(text)     --> 3 patrones: +34, sin prefijo, internacional
      +---> detectEmail(text)     --> Regex estandar
      +---> detectSsn(text)       --> 3 patrones: formateado, agrupado, plano + validacion provincia
      +---> detectNames(text)     --> Base de 300+ nombres + deteccion Nombre+Apellido
      |
      v
  Salvaguardas transversales:
      - followedByMedicalUnit()   --> mmHg, mg, mm, ml, cm, kg, Hz, HU, Gy, mGy, mSv, cc, dB, bpm
      - insideDateOrTime()        --> dd/mm/yyyy, HH:MM, HH:MM:SS
      |
      v
  Si hasPii(text) == true:
      --> Bloquear envio a proveedor de IA
      --> Notificar al usuario
      --> Solicitar correccion del texto
```

### Anexo C - Proveedores de IA y sus politicas de datos

| Proveedor | API utilizada | Politica de retencion | Entrenamiento con datos | DPA disponible | Jurisdiccion |
|---|---|---|---|---|---|
| OpenAI | GPT-4o, GPT-4o-mini, Whisper | Zero Data Retention (API) | No (API empresarial) | Si | EE.UU. |
| Anthropic | Claude Sonnet, Haiku | No retencion (API) | No (API) | Si | EE.UU. |
| Google | Gemini 1.5 Pro, 2.0 Flash | No retencion (API) | No (API de pago) | Si | EE.UU. |
| Deepgram | Speech-to-Text | No retencion | No | Si | EE.UU. |
| DeepSeek | DeepSeek-v4 | Segun terminos | Politica no transparente | Limitado | China |

### Anexo D - Glosario

| Termino | Definicion |
|---|---|
| **ANPD** | Autoridade Nacional de Protecao de Dados (Brasil) |
| **AAIP** | Agencia de Acceso a la Informacion Publica (Argentina) |
| **Controlador** | Quien toma las decisiones sobre el tratamiento (equivale a "responsable del tratamiento") |
| **DPA** | Data Processing Agreement / Acuerdo de Tratamiento de Datos |
| **DPO** | Data Protection Officer / Encargado de Proteccion de Datos |
| **INAI** | Instituto Nacional de Transparencia y Proteccion de Datos (Mexico) |
| **LFPDPPP** | Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares (Mexico) |
| **LGPD** | Lei Geral de Protecao de Dados Pessoais (Brasil, Lei 13.709/2018) |
| **LLM** | Large Language Model / Modelo de Lenguaje de Gran Tamano |
| **Operador** | Quien trata los datos por cuenta del controlador (equivale a "encargado del tratamiento") |
| **PII** | Personally Identifiable Information / Informacion de Identificacion Personal |
| **RIPD/DPIA** | Relatorio de Impacto a la Proteccion de Datos / Data Protection Impact Assessment |
| **RLS** | Row Level Security / Seguridad a nivel de fila |
| **SIC** | Superintendencia de Industria y Comercio (Colombia) |
| **SaaS** | Software as a Service / Software como Servicio |
| **TIA** | Transfer Impact Assessment / Evaluacion de Impacto de Transferencia |
| **TLS** | Transport Layer Security |
| **ZDR** | Zero Data Retention / Retencion Cero de Datos |

---

**Aprobado por:**

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Responsable del tratamiento | _________________________ | _________________________ | ____/____/________ |
| Encargado de Proteccion de Datos (DPO) | _________________________ | _________________________ | ____/____/________ |
| Director tecnico (CTO) | _________________________ | _________________________ | ____/____/________ |

---

*Este documento ha sido elaborado conforme a la Lei 13.709/2018 (LGPD) de Brasil y demas normativas de proteccion de datos de America Latina (Mexico LFPDPPP, Colombia Ley 1581/2012, Argentina Ley 25.326, Chile Ley 21.719), siguiendo buenas practicas internacionales de evaluacion de impacto (ISO/IEC 29134). El servicio no se ofrece en la Union Europea / EEE. Debe revisarse anualmente o ante cambios significativos en el tratamiento.*
