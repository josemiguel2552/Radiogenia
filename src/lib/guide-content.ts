// User guide content for /guide — every claim here is verified against the
// actual codebase (see the session's feature audit). Do NOT add features that
// don't exist, and do NOT name which AI/transcription providers are used
// anywhere in this content (security constraint — provider names must never
// appear in user-visible content).

export type GuideLang = "es" | "en" | "pt";

export interface GuideChapter {
  id: string;
  number: string;
  title: Record<GuideLang, string>;
  body: Record<GuideLang, string>; // markdown
}

export interface GuideSection {
  id: string;
  title: Record<GuideLang, string>;
  chapters: GuideChapter[];
}

export const GUIDE_META: Record<GuideLang, { title: string; subtitle: string; readTime: string; chapterCount: string; docLabel: string }> = {
  es: { title: "Guía del usuario.", subtitle: "Todo lo que necesitas saber para empezar a usar Radiogen.AI — desde tu primer informe hasta el dictado por voz, las plantillas y las herramientas clínicas.", readTime: "Lectura ≈ 12 min", chapterCount: "18 capítulos", docLabel: "Documentación" },
  en: { title: "User guide.", subtitle: "Everything you need to know to start using Radiogen.AI — from your first report to voice dictation, templates and clinical tools.", readTime: "Read time ≈ 12 min", chapterCount: "18 chapters", docLabel: "Documentation" },
  pt: { title: "Guia do usuário.", subtitle: "Tudo o que você precisa saber para começar a usar o Radiogen.AI — do seu primeiro laudo ao ditado por voz, modelos e ferramentas clínicas.", readTime: "Leitura ≈ 12 min", chapterCount: "18 capítulos", docLabel: "Documentação" },
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "start",
    title: { es: "Empezar", en: "Getting started", pt: "Começar" },
    chapters: [
      {
        id: "welcome",
        number: "01",
        title: { es: "Bienvenida", en: "Welcome", pt: "Bem-vindo" },
        body: {
          es: `Radiogen.AI convierte tu dictado clínico en un informe estructurado y listo para copiar. Dictas los hallazgos con tus propias palabras, la IA los organiza en tu plantilla, completa las secciones no mencionadas con normalidad radiológica y redacta la conclusión.

**Qué hace Radiogen.AI**

- **Dicta como prefieras.** Ordenado y siguiendo la plantilla, o de forma más libre — el sistema interpreta tus hallazgos y los distribuye en las secciones correctas.
- **Diseñado para no inventar.** El motor de generación tiene una regla explícita: no añade hallazgos patológicos que no hayas dictado. Las secciones no mencionadas se completan como normales, nunca como patológicas.
- **Funciona sin configurar.** Desde el primer día tienes plantillas por defecto para las modalidades más comunes. Puedes crear las tuyas cuando quieras.
- **Multi-idioma.** La interfaz y los informes funcionan en español, inglés y portugués.

> 💡 Esta guía asume que ya tienes una cuenta. Si aún no la tienes, regístrate gratis — no se pide tarjeta de crédito para el plan gratuito.`,
          en: `Radiogen.AI turns your clinical dictation into a structured, ready-to-copy report. You dictate findings in your own words, the AI organizes them into your template, fills unmentioned sections with radiological normality, and writes the conclusion.

**What Radiogen.AI does**

- **Dictate however you prefer.** Follow the template order, or speak more freely — the system interprets your findings and places them in the right sections.
- **Designed not to invent.** The generation engine has an explicit rule: it does not add pathological findings you didn't dictate. Unmentioned sections are filled as normal, never as pathological.
- **Works without setup.** From day one you have default templates for the most common modalities. Create your own whenever you want.
- **Multi-language.** The interface and reports work in Spanish, English and Portuguese.

> 💡 This guide assumes you already have an account. If you don't yet, sign up for free — no credit card required for the free plan.`,
          pt: `O Radiogen.AI transforma seu ditado clínico em um laudo estruturado e pronto para copiar. Você dita os achados com suas próprias palavras, a IA os organiza no seu modelo, completa as seções não mencionadas com normalidade radiológica e redige a conclusão.

**O que o Radiogen.AI faz**

- **Dite como preferir.** De forma ordenada seguindo o modelo, ou mais livremente — o sistema interpreta seus achados e os distribui nas seções corretas.
- **Projetado para não inventar.** O motor de geração tem uma regra explícita: não adiciona achados patológicos que você não ditou. As seções não mencionadas são preenchidas como normais, nunca como patológicas.
- **Funciona sem configurar.** Desde o primeiro dia você tem modelos padrão para as modalidades mais comuns. Crie os seus quando quiser.
- **Multi-idioma.** A interface e os laudos funcionam em espanhol, inglês e português.

> 💡 Este guia assume que você já tem uma conta. Se ainda não tem, cadastre-se gratuitamente — não é necessário cartão de crédito no plano gratuito.`,
        },
      },
      {
        id: "first-steps",
        number: "02",
        title: { es: "Primeros pasos", en: "First steps", pt: "Primeiros passos" },
        body: {
          es: `Tu primer informe toma menos de dos minutos. Estos son los pasos:

1. **Selecciona plantilla y modalidad.** En el panel lateral, elige la plantilla adecuada para tu estudio (ej. TC de tórax). La modalidad se selecciona automáticamente.
2. **Dicta o escribe los hallazgos.** Usa el botón de micrófono para dictar los hallazgos anormales relevantes, o escríbelos directamente. No hace falta describir lo normal — la IA lo completa.
3. **Genera el informe.** Pulsa «Generar» para que la IA distribuya tus hallazgos en las secciones de la plantilla, añada las descripciones de normalidad y redacte la conclusión.
4. **Revisa y corrige.** Edita libremente los hallazgos y la conclusión. Cada informe que guardas ayuda a que las próximas conclusiones se parezcan más a tu estilo (ver el capítulo *Cómo aprende de ti*).
5. **Copia o guarda.** Con la barra de acciones inferior copias hallazgos, hallazgos + conclusión, o el informe completo — listo para pegar en tu sistema.

> 💡 ¿No tienes un caso a mano para probar? En el panel de dictado, si nunca has generado un informe, verás un botón «Probar con un ejemplo» que carga un caso realista.`,
          en: `Your first report takes less than two minutes. Here are the steps:

1. **Select a template and modality.** In the sidebar, choose the right template for your study (e.g. Chest CT). The modality is selected automatically.
2. **Dictate or type the findings.** Use the microphone button to dictate the relevant abnormal findings, or type them directly. No need to describe what's normal — the AI fills that in.
3. **Generate the report.** Press "Generate" so the AI distributes your findings into the template's sections, adds normality descriptions, and writes the conclusion.
4. **Review and edit.** Freely edit the findings and conclusion. Every report you save helps future conclusions sound more like your own style (see *How it learns from you*).
5. **Copy or save.** The bottom action bar lets you copy findings, findings + conclusion, or the full report — ready to paste into your system.

> 💡 No case on hand to try? In the dictation panel, if you've never generated a report, you'll see a "Try an example" button that loads a realistic case.`,
          pt: `Seu primeiro laudo leva menos de dois minutos. Estes são os passos:

1. **Selecione o modelo e a modalidade.** Na barra lateral, escolha o modelo adequado para seu exame (ex.: TC de tórax). A modalidade é selecionada automaticamente.
2. **Dite ou digite os achados.** Use o botão de microfone para ditar os achados anormais relevantes, ou digite-os diretamente. Não é preciso descrever o que é normal — a IA completa isso.
3. **Gere o laudo.** Clique em «Gerar» para que a IA distribua seus achados nas seções do modelo, adicione as descrições de normalidade e redija a conclusão.
4. **Revise e corrija.** Edite livremente os achados e a conclusão. Cada laudo que você salva ajuda as próximas conclusões a se parecerem mais com seu estilo (veja o capítulo *Como ele aprende com você*).
5. **Copie ou salve.** A barra de ações inferior permite copiar achados, achados + conclusão, ou o laudo completo — pronto para colar no seu sistema.

> 💡 Não tem um caso em mãos para testar? No painel de ditado, se você nunca gerou um laudo, verá um botão «Testar com um exemplo» que carrega um caso realista.`,
        },
      },
      {
        id: "workspace",
        number: "03",
        title: { es: "Tu espacio de trabajo", en: "Your workspace", pt: "Seu espaço de trabalho" },
        body: {
          es: `El panel se organiza en dos zonas: el editor de informes en el centro, y un panel lateral con pestañas para el resto de herramientas.

**Editor de informes**
- **Contexto clínico** — un campo fino y siempre visible donde va el motivo del estudio y los antecedentes relevantes (no los hallazgos).
- **Dictado / hallazgos** — la caja principal donde dictas o escribes. Crece automáticamente según el texto.
- **Conclusión** — se genera junto con los hallazgos; puedes regenerarla en distintos estilos.
- **Barra de acciones** — copiar, guardar, reportar un error, y las herramientas de clasificación y chequeo clínico aparecen aquí una vez generado el informe.

**Panel lateral**
- **Informes** — el editor (vista por defecto).
- **Plantillas** — tu biblioteca de plantillas y las frases de normalidad.
- **Calculadoras** — estadiaje TNM, scores de clasificación (BI-RADS, TI-RADS…) y hojas de referencia rápida.
- **Recomendaciones** — guías de seguimiento por hallazgo, con extracción automática desde el texto de una guía clínica.
- **Cuenta** — tu plan, apariencia, firma e idioma.

El icono **🧠** flotante en varias secciones abre el Radiogen Bot, un asistente que responde dudas basándose en las guías cargadas en el sistema.`,
          en: `The dashboard has two zones: the report editor in the center, and a sidebar with tabs for the rest of the tools.

**Report editor**
- **Clinical context** — a thin, always-visible field for the reason for the study and relevant history (not findings).
- **Dictation / findings** — the main box where you dictate or type. It grows automatically with the text.
- **Conclusion** — generated together with the findings; you can regenerate it in different styles.
- **Action bar** — copy, save, report an error, and the classification/clinical-check tools appear here once a report is generated.

**Sidebar**
- **Reports** — the editor (default view).
- **Templates** — your template library and normality phrases.
- **Calculators** — TNM staging, classification scores (BI-RADS, TI-RADS…) and quick-reference sheets.
- **Recommendations** — follow-up guidelines per finding, with automatic extraction from pasted guideline text.
- **Account** — your plan, appearance, signature and language.

The floating **🧠** icon in several sections opens the Radiogen Bot, an assistant that answers questions based on the guidelines loaded into the system.`,
          pt: `O painel é organizado em duas zonas: o editor de laudos no centro, e uma barra lateral com abas para as demais ferramentas.

**Editor de laudos**
- **Contexto clínico** — um campo fino e sempre visível para o motivo do exame e antecedentes relevantes (não os achados).
- **Ditado / achados** — a caixa principal onde você dita ou digita. Cresce automaticamente conforme o texto.
- **Conclusão** — gerada junto com os achados; você pode regenerá-la em estilos diferentes.
- **Barra de ações** — copiar, salvar, reportar um erro, e as ferramentas de classificação e checagem clínica aparecem aqui depois que o laudo é gerado.

**Barra lateral**
- **Laudos** — o editor (visão padrão).
- **Modelos** — sua biblioteca de modelos e as frases de normalidade.
- **Calculadoras** — estadiamento TNM, scores de classificação (BI-RADS, TI-RADS…) e folhas de referência rápida.
- **Recomendações** — diretrizes de seguimento por achado, com extração automática a partir do texto de uma diretriz clínica.
- **Conta** — seu plano, aparência, assinatura e idioma.

O ícone flutuante **🧠** em várias seções abre o Radiogen Bot, um assistente que responde dúvidas com base nas diretrizes carregadas no sistema.`,
        },
      },
    ],
  },
  {
    id: "essentials",
    title: { es: "Lo esencial", en: "The essentials", pt: "O essencial" },
    chapters: [
      {
        id: "dictate",
        number: "04",
        title: { es: "Dictar un informe", en: "Dictating a report", pt: "Ditar um laudo" },
        body: {
          es: `Pulsa el botón de micrófono y dicta con naturalidad. Verás el texto aparecer mientras hablas, y el sistema aplica una corrección automática consciente de la modalidad: sabe que en una TC se habla de «densidad», en una RM de «señal» y en una ecografía de «ecogenicidad», y ajusta la transcripción según ese contexto.

**Qué dictar**
- Los hallazgos anormales y relevantes, en el orden que prefieras.
- Lateralidad, medidas, clasificaciones — todo lo que sea parte del hallazgo.

**Qué NO hace falta dictar**
- Encabezados de sección («hallazgos», «conclusión») — los provee la plantilla.
- Estructuras normales — se completan automáticamente.

**Tipos de informe**

Junto al botón de generar hay un selector con 4 formatos:

| Formato | Qué hace |
|---|---|
| Estructurado | Informe completo con todas las secciones de la plantilla; lo no mencionado se rellena con normalidad. |
| Solo hallazgos | Solo las secciones con hallazgos + un párrafo final resumiendo que el resto es normal. |
| Solo dictado | Solo lo que has dictado, sin normalidad ni campos no mencionados. |
| No estructurado | Texto narrativo ordenado por importancia clínica, sin encabezados de sección. |

> 💡 Puedes pausar y reanudar el dictado las veces que quieras. El micrófono también acepta texto escrito a la vez — puedes combinar ambos.`,
          en: `Press the microphone button and dictate naturally. You'll see the text appear as you speak, and the system applies automatic correction that's aware of the modality: it knows a CT talks about "density," an MRI about "signal," and an ultrasound about "echogenicity," and adjusts the transcription accordingly.

**What to dictate**
- The relevant abnormal findings, in whatever order you prefer.
- Laterality, measurements, classifications — anything that's part of the finding.

**What you don't need to dictate**
- Section headings ("findings," "conclusion") — the template provides those.
- Normal structures — filled in automatically.

**Report types**

Next to the generate button there's a selector with 4 formats:

| Format | What it does |
|---|---|
| Structured | Full report with every template section; unmentioned ones filled with normality. |
| Findings only | Only sections with findings + a final paragraph summarizing that the rest is normal. |
| Dictation only | Only what you dictated, no normality or unmentioned fields added. |
| Unstructured | Narrative text ordered by clinical importance, without section headings. |

> 💡 You can pause and resume dictation as many times as you like. The microphone also accepts typed text at the same time — you can mix both.`,
          pt: `Clique no botão de microfone e dite com naturalidade. Você verá o texto aparecer enquanto fala, e o sistema aplica uma correção automática ciente da modalidade: sabe que numa TC se fala em «densidade», numa RM em «sinal» e numa ecografia em «ecogenicidade», e ajusta a transcrição de acordo com esse contexto.

**O que ditar**
- Os achados anormais e relevantes, na ordem que preferir.
- Lateralidade, medidas, classificações — tudo o que fizer parte do achado.

**O que NÃO é preciso ditar**
- Cabeçalhos de seção («achados», «conclusão») — o modelo já os fornece.
- Estruturas normais — são preenchidas automaticamente.

**Tipos de laudo**

Ao lado do botão de gerar há um seletor com 4 formatos:

| Formato | O que faz |
|---|---|
| Estruturado | Laudo completo com todas as seções do modelo; o não mencionado é preenchido com normalidade. |
| Apenas achados | Apenas as seções com achados + um parágrafo final resumindo que o restante é normal. |
| Apenas ditado | Apenas o que você ditou, sem normalidade nem campos não mencionados. |
| Não estruturado | Texto narrativo ordenado por importância clínica, sem cabeçalhos de seção. |

> 💡 Você pode pausar e retomar o ditado quantas vezes quiser. O microfone também aceita texto digitado ao mesmo tempo — você pode combinar os dois.`,
        },
      },
      {
        id: "templates",
        number: "05",
        title: { es: "Plantillas", en: "Templates", pt: "Modelos" },
        body: {
          es: `Una plantilla define la estructura de tu informe: secciones, encabezados y técnica. Radiogen.AI trae plantillas por defecto para las modalidades más comunes, y puedes crear las tuyas de dos formas.

**Asistente de plantillas**
En la pestaña Plantillas, pulsa «Asistente de plantillas» y describe lo que necesitas (ej. «RM de rodilla con secciones de meniscos y ligamentos»). El asistente genera la estructura y puedes guardarla con un clic.

**Extraer de un documento**
Sube un informe tuyo en Word (.doc/.docx) o PDF y el sistema extrae automáticamente la estructura para convertirla en plantilla. Disponible para cualquier usuario individual desde la pestaña Plantillas.

**Plantillas institucionales**
Si perteneces a un hospital o grupo con cuenta institucional, los jefes de sección pueden subir varias plantillas a la vez para estandarizarlas entre todo el equipo.

> 💡 Puedes tener varias plantillas para el mismo tipo de estudio (por ejemplo, dos protocolos distintos de RM de rodilla) y elegir la que corresponda en cada informe.`,
          en: `A template defines your report's structure: sections, headings and technique. Radiogen.AI ships with default templates for the most common modalities, and you can create your own in two ways.

**Template assistant**
In the Templates tab, click "Template assistant" and describe what you need (e.g. "Knee MRI with meniscus and ligament sections"). The assistant generates the structure and you can save it with one click.

**Extract from a document**
Upload one of your own reports in Word (.doc/.docx) or PDF and the system automatically extracts the structure into a template. Available to any individual user from the Templates tab.

**Institutional templates**
If you belong to a hospital or group account, section chiefs can bulk-upload several templates at once to standardize them across the whole team.

> 💡 You can have several templates for the same study type (e.g. two different knee-MRI protocols) and pick the right one for each report.`,
          pt: `Um modelo define a estrutura do seu laudo: seções, cabeçalhos e técnica. O Radiogen.AI já vem com modelos padrão para as modalidades mais comuns, e você pode criar os seus de duas formas.

**Assistente de modelos**
Na aba Modelos, clique em «Assistente de modelos» e descreva o que precisa (ex.: «RM de joelho com seções de meniscos e ligamentos»). O assistente gera a estrutura e você pode salvá-la com um clique.

**Extrair de um documento**
Envie um dos seus laudos em Word (.doc/.docx) ou PDF e o sistema extrai automaticamente a estrutura para transformá-la em modelo. Disponível para qualquer usuário individual na aba Modelos.

**Modelos institucionais**
Se você pertence a um hospital ou grupo com conta institucional, os chefes de seção podem enviar vários modelos de uma vez para padronizá-los em toda a equipe.

> 💡 Você pode ter vários modelos para o mesmo tipo de exame (por exemplo, dois protocolos diferentes de RM de joelho) e escolher o correto em cada laudo.`,
        },
      },
      {
        id: "normality",
        number: "06",
        title: { es: "Frases de normalidad", en: "Normality phrases", pt: "Frases de normalidade" },
        body: {
          es: `Las secciones que no mencionas al dictar se completan con una frase de normalidad estándar. Puedes personalizar esa frase para cada combinación de modalidad y sección desde la pestaña Plantillas → Frases de normalidad.

Por ejemplo, para «Pleura y diafragma» en TC de tórax, puedes definir tu propia frase preferida en lugar de la genérica del sistema. Una vez guardada, se usará siempre que esa sección no se mencione en el dictado.

> ⚠️ Esto es una personalización manual — tú decides el texto de cada frase. El sistema no la genera automáticamente a partir de tus informes anteriores.`,
          en: `Sections you don't mention while dictating are filled with a standard normality phrase. You can customize that phrase for each modality + section combination from the Templates tab → Normality phrases.

For example, for "Pleura and diaphragm" on a chest CT, you can define your own preferred wording instead of the system's generic one. Once saved, it's used whenever that section isn't mentioned in the dictation.

> ⚠️ This is a manual customization — you decide the text of each phrase. The system does not generate it automatically from your past reports.`,
          pt: `As seções que você não menciona ao ditar são preenchidas com uma frase de normalidade padrão. Você pode personalizar essa frase para cada combinação de modalidade e seção na aba Modelos → Frases de normalidade.

Por exemplo, para «Pleura e diafragma» em TC de tórax, você pode definir sua própria frase preferida em vez da genérica do sistema. Uma vez salva, ela será usada sempre que essa seção não for mencionada no ditado.

> ⚠️ Isso é uma personalização manual — você decide o texto de cada frase. O sistema não a gera automaticamente a partir dos seus laudos anteriores.`,
        },
      },
      {
        id: "clinical-context",
        number: "07",
        title: { es: "Contexto clínico", en: "Clinical context", pt: "Contexto clínico" },
        body: {
          es: `El campo de contexto clínico está siempre visible, encima del dictado, para que el motivo del estudio y los antecedentes no terminen mezclados con los hallazgos. Empieza fino (una línea) y crece automáticamente si escribes más.

Este campo se usa como contexto para la generación, no aparece como una sección más del informe.`,
          en: `The clinical-context field is always visible, above the dictation box, so the reason for the study and relevant history don't end up mixed in with the findings. It starts thin (one line) and grows automatically as you type more.

This field is used as context for generation — it does not appear as another section of the report.`,
          pt: `O campo de contexto clínico está sempre visível, acima do ditado, para que o motivo do exame e os antecedentes não acabem misturados com os achados. Ele começa fino (uma linha) e cresce automaticamente conforme você digita mais.

Esse campo é usado como contexto para a geração — não aparece como mais uma seção do laudo.`,
        },
      },
      {
        id: "recommendations",
        number: "08",
        title: { es: "Recomendaciones", en: "Recommendations", pt: "Recomendações" },
        body: {
          es: `La pestaña Recomendaciones reúne sugerencias de seguimiento por hallazgo (Fleischner, TI-RADS, Bosniak, ACR…), organizadas por sección anatómica y guía. Al generar un informe, el sistema sugiere las recomendaciones relevantes según los hallazgos.

**Añadir recomendaciones propias**
- **A mano** — con «Añadir nueva» escribes el título y el texto de la recomendación.
- **Extraer de una guía** — pega el texto de una guía clínica y la IA extrae las recomendaciones concretas para que las revises y las añadas a tu biblioteca con un clic. Ideal para guías que aún no están en el sistema.

Las recomendaciones que añades quedan disponibles para insertarlas en cualquier informe futuro.`,
          en: `The Recommendations tab brings together follow-up suggestions per finding (Fleischner, TI-RADS, Bosniak, ACR…), organized by anatomical section and guideline. When you generate a report, the system suggests the relevant recommendations based on the findings.

**Adding your own recommendations**
- **Manually** — use "Add new" to type the title and text of the recommendation.
- **Extract from a guideline** — paste a clinical guideline's text and the AI extracts the concrete recommendations for you to review and add to your library with one click. Great for guidelines not yet in the system.

Recommendations you add become available to insert into any future report.`,
          pt: `A aba Recomendações reúne sugestões de seguimento por achado (Fleischner, TI-RADS, Bosniak, ACR…), organizadas por seção anatômica e diretriz. Ao gerar um laudo, o sistema sugere as recomendações relevantes de acordo com os achados.

**Adicionar suas próprias recomendações**
- **Manualmente** — use «Adicionar nova» para digitar o título e o texto da recomendação.
- **Extrair de uma diretriz** — cole o texto de uma diretriz clínica e a IA extrai as recomendações concretas para você revisar e adicionar à sua biblioteca com um clique. Ideal para diretrizes que ainda não estão no sistema.

As recomendações que você adiciona ficam disponíveis para inserir em qualquer laudo futuro.`,
        },
      },
      {
        id: "classification",
        number: "09",
        title: { es: "Clasificación automática", en: "Automatic classification", pt: "Classificação automática" },
        body: {
          es: `Tras generar la conclusión, pulsa «Clasificar hallazgos» en la barra de acciones. El sistema detecta qué sistemas de clasificación aplican a tu caso (TNM, BI-RADS, TI-RADS, LI-RADS, Bosniak, PI-RADS…), te deja elegir cuáles usar, y añade la clasificación directamente a la conclusión.

Solo se muestran los sistemas para los que el informe tiene los datos necesarios — por ejemplo, TI-RADS solo aparece si hay hallazgos ecográficos de tiroides descritos.`,
          en: `After generating the conclusion, press "Classify findings" in the action bar. The system detects which classification systems apply to your case (TNM, BI-RADS, TI-RADS, LI-RADS, Bosniak, PI-RADS…), lets you choose which to use, and adds the classification directly to the conclusion.

Only systems your report has the required data for are shown — for example, TI-RADS only appears if thyroid ultrasound findings are described.`,
          pt: `Depois de gerar a conclusão, clique em «Classificar achados» na barra de ações. O sistema detecta quais sistemas de classificação se aplicam ao seu caso (TNM, BI-RADS, TI-RADS, LI-RADS, Bosniak, PI-RADS…), permite escolher quais usar, e adiciona a classificação diretamente na conclusão.

Só são exibidos os sistemas para os quais o laudo tem os dados necessários — por exemplo, TI-RADS só aparece se houver achados ecográficos de tireoide descritos.`,
        },
      },
      {
        id: "calculators",
        number: "10",
        title: { es: "Calculadoras", en: "Calculators", pt: "Calculadoras" },
        body: {
          es: `La pestaña Calculadoras reúne estadiaje TNM (pulmón, mama, colorrectal, próstata, cérvix, endometrio y más), scores de clasificación (BI-RADS, TI-RADS, PI-RADS, LI-RADS, Bosniak, O-RADS, CAD-RADS, Lung-RADS…), y hojas de referencia rápida para decisiones clínicas frecuentes (Wells, Alvarado, criterios de Fleischner…).

Cada calculadora te guía con opciones a elegir — sin necesidad de recordar tablas ni fórmulas — y el resultado se puede copiar directamente al informe.`,
          en: `The Calculators tab brings together TNM staging (lung, breast, colorectal, prostate, cervix, endometrium and more), classification scores (BI-RADS, TI-RADS, PI-RADS, LI-RADS, Bosniak, O-RADS, CAD-RADS, Lung-RADS…), and quick-reference sheets for frequent clinical decisions (Wells, Alvarado, Fleischner criteria…).

Each calculator guides you with options to pick — no need to memorize tables or formulas — and the result can be copied directly into the report.`,
          pt: `A aba Calculadoras reúne estadiamento TNM (pulmão, mama, colorretal, próstata, colo do útero, endométrio e mais), scores de classificação (BI-RADS, TI-RADS, PI-RADS, LI-RADS, Bosniak, O-RADS, CAD-RADS, Lung-RADS…), e folhas de referência rápida para decisões clínicas frequentes (Wells, Alvarado, critérios de Fleischner…).

Cada calculadora guia você com opções para escolher — sem precisar memorizar tabelas ou fórmulas — e o resultado pode ser copiado diretamente para o laudo.`,
        },
      },
      {
        id: "bot",
        number: "11",
        title: { es: "Radiogen Bot", en: "Radiogen Bot", pt: "Radiogen Bot" },
        body: {
          es: `El Radiogen Bot es un asistente de consulta rápida, disponible desde varias secciones. Responde únicamente con información basada en las guías clínicas cargadas en el sistema — si no tiene la información, te lo dice en vez de inventar una respuesta.

Si preguntas por una guía que el sistema no conoce todavía, el bot te indica que puedes pegarla en la sección de Recomendaciones para extraerla (ver capítulo *Recomendaciones*).`,
          en: `The Radiogen Bot is a quick-lookup assistant, available from several sections. It answers only with information grounded in the clinical guidelines loaded into the system — if it doesn't have the information, it tells you instead of making up an answer.

If you ask about a guideline the system doesn't know yet, the bot points you to the Recommendations section, where you can paste it to extract it (see the *Recommendations* chapter).`,
          pt: `O Radiogen Bot é um assistente de consulta rápida, disponível em várias seções. Ele responde apenas com informações baseadas nas diretrizes clínicas carregadas no sistema — se não tiver a informação, avisa em vez de inventar uma resposta.

Se você perguntar sobre uma diretriz que o sistema ainda não conhece, o bot indica que você pode colá-la na seção de Recomendações para extraí-la (veja o capítulo *Recomendações*).`,
        },
      },
    ],
  },
  {
    id: "advanced",
    title: { es: "Avanzado", en: "Advanced", pt: "Avançado" },
    chapters: [
      {
        id: "learning",
        number: "12",
        title: { es: "Cómo aprende de ti", en: "How it learns from you", pt: "Como ele aprende com você" },
        body: {
          es: `Radiogen.AI se adapta a tu estilo de dos formas distintas — vale la pena entender cada una:

**Conclusiones — automático.** Cada vez que guardas un informe, la conclusión final se guarda como ejemplo. Cuando generas una nueva conclusión para el mismo tipo de estudio, el sistema muestra a la IA tus 2-3 conclusiones más recientes de ese mismo estudio (o modalidad) como referencia de estilo, para que la estructura y el tono se parezcan a los tuyos. No hace falta configurar nada — ocurre solo con el uso.

**Frases de normalidad — manual.** A diferencia de las conclusiones, la redacción de las secciones normales no se aprende automáticamente de tus correcciones. Si quieres una frase concreta para una sección, la defines tú en Plantillas → Frases de normalidad (ver capítulo *Frases de normalidad*).

> 💡 Cuantos más informes guardes de un mismo tipo de estudio, más se ajustará el estilo de las conclusiones a tu forma habitual de redactar.`,
          en: `Radiogen.AI adapts to your style in two distinct ways — worth understanding each:

**Conclusions — automatic.** Every time you save a report, the final conclusion is stored as an example. When you generate a new conclusion for the same study type, the system shows the AI your 2-3 most recent conclusions for that same study (or modality) as a style reference, so structure and tone resemble your own. Nothing to configure — it happens just from use.

**Normality phrases — manual.** Unlike conclusions, the wording of normal sections is not automatically learned from your corrections. If you want a specific phrase for a section, you define it yourself in Templates → Normality phrases (see the *Normality phrases* chapter).

> 💡 The more reports you save for the same study type, the more the conclusion style will match your usual way of writing.`,
          pt: `O Radiogen.AI se adapta ao seu estilo de duas formas distintas — vale a pena entender cada uma:

**Conclusões — automático.** Toda vez que você salva um laudo, a conclusão final é armazenada como exemplo. Quando você gera uma nova conclusão para o mesmo tipo de exame, o sistema mostra à IA suas 2-3 conclusões mais recentes desse mesmo exame (ou modalidade) como referência de estilo, para que a estrutura e o tom se pareçam com os seus. Não é preciso configurar nada — acontece só de usar.

**Frases de normalidade — manual.** Diferente das conclusões, a redação das seções normais não é aprendida automaticamente a partir das suas correções. Se você quiser uma frase específica para uma seção, defina-a você mesmo em Modelos → Frases de normalidade (veja o capítulo *Frases de normalidade*).

> 💡 Quanto mais laudos você salvar de um mesmo tipo de exame, mais o estilo das conclusões vai se ajustar à sua forma habitual de redigir.`,
        },
      },
      {
        id: "edit-export",
        number: "13",
        title: { es: "Editar y copiar", en: "Edit and copy", pt: "Editar e copiar" },
        body: {
          es: `Edita el informe generado como cualquier campo de texto — haz clic y escribe. Cuando termines, la barra de acciones inferior te permite:

- **Copiar hallazgos** — solo la sección de hallazgos.
- **Copiar hallazgos + conclusión** — con atajo de teclado ⇧ + Espacio.
- **Copiar informe completo** — incluye recomendaciones seleccionadas y tu firma, si tienes una configurada.

> ⚠️ El copiado es siempre en **texto plano** (sin negritas ni formato enriquecido), pensado para pegar directamente en tu RIS/HIS o procesador de texto sin arrastrar formato no deseado.

**Firma**
En Cuenta → Firma puedes definir un bloque de texto (por ejemplo tu nombre y colegiado) que se añade automáticamente al final del informe al copiarlo, excepto cuando copias solo hallazgos.`,
          en: `Edit the generated report like any text field — click and type. When you're done, the bottom action bar lets you:

- **Copy findings** — findings section only.
- **Copy findings + conclusion** — keyboard shortcut ⇧ + Space.
- **Copy full report** — includes selected recommendations and your signature, if you have one set up.

> ⚠️ Copying is always **plain text** (no bold or rich formatting), designed to paste directly into your RIS/HIS or word processor without dragging along unwanted formatting.

**Signature**
In Account → Signature you can define a text block (e.g. your name and license number) that's automatically appended to the report when copied, except when copying findings only.`,
          pt: `Edite o laudo gerado como qualquer campo de texto — clique e digite. Quando terminar, a barra de ações inferior permite:

- **Copiar achados** — apenas a seção de achados.
- **Copiar achados + conclusão** — atalho de teclado ⇧ + Espaço.
- **Copiar laudo completo** — inclui recomendações selecionadas e sua assinatura, se você tiver uma configurada.

> ⚠️ A cópia é sempre em **texto simples** (sem negrito ou formatação rica), pensada para colar diretamente no seu RIS/HIS ou processador de texto sem arrastar formatação indesejada.

**Assinatura**
Em Conta → Assinatura você pode definir um bloco de texto (por exemplo, seu nome e número de registro) que é adicionado automaticamente ao final do laudo ao copiá-lo, exceto ao copiar apenas os achados.`,
        },
      },
      {
        id: "appearance",
        number: "14",
        title: { es: "Apariencia e idioma", en: "Appearance and language", pt: "Aparência e idioma" },
        body: {
          es: `Desde Cuenta → Apariencia puedes personalizar tu espacio:

- **9 temas** de color (claros y oscuros), cada uno con su propia paleta — no hay un interruptor claro/oscuro independiente, el tema ya incluye eso.
- **10 tipografías** para el editor.
- **Diseño** — clásico, en paralelo o compacto — y en qué lado va el panel lateral.
- **Idioma** — español, inglés o portugués. Este mismo idioma es también el idioma en el que la IA redacta tus informes.

> ⚠️ Estas preferencias se guardan en este dispositivo/navegador. Si entras desde otro ordenador o navegador, tendrás que configurarlas de nuevo.`,
          en: `From Account → Appearance you can personalize your workspace:

- **9 color themes** (light and dark), each with its own palette — there's no separate light/dark switch; the theme already includes that.
- **10 fonts** for the editor.
- **Layout** — classic, side-by-side or compact — and which side the sidebar sits on.
- **Language** — Spanish, English or Portuguese. This same language is also the language the AI writes your reports in.

> ⚠️ These preferences are saved on this device/browser. If you sign in from a different computer or browser, you'll need to set them again.`,
          pt: `Em Conta → Aparência você pode personalizar seu espaço:

- **9 temas** de cor (claros e escuros), cada um com sua própria paleta — não há um interruptor claro/escuro separado; o tema já inclui isso.
- **10 tipografias** para o editor.
- **Layout** — clássico, lado a lado ou compacto — e em que lado fica a barra lateral.
- **Idioma** — espanhol, inglês ou português. Esse mesmo idioma é também o idioma em que a IA redige seus laudos.

> ⚠️ Essas preferências são salvas neste dispositivo/navegador. Se você entrar de outro computador ou navegador, precisará configurá-las novamente.`,
        },
      },
    ],
  },
  {
    id: "reference",
    title: { es: "Referencia", en: "Reference", pt: "Referência" },
    chapters: [
      {
        id: "shortcuts",
        number: "15",
        title: { es: "Atajos de teclado", en: "Keyboard shortcuts", pt: "Atalhos de teclado" },
        body: {
          es: `| Atajo | Acción |
|---|---|
| ⌘/Ctrl + A | Iniciar / detener dictado |
| ⇧ + Espacio | Copiar hallazgos + conclusión |
| ⌘/Ctrl + Enter | Generar informe |
| ⌘/Ctrl + N | Nuevo informe |
| ⌘/Ctrl + / | Abrir ayuda |
| ? | Ver atajos de teclado (cuando no estás escribiendo en un campo) |

En macOS se usa ⌘; en Windows/Linux, Ctrl.`,
          en: `| Shortcut | Action |
|---|---|
| ⌘/Ctrl + A | Start / stop dictation |
| ⇧ + Space | Copy findings + conclusion |
| ⌘/Ctrl + Enter | Generate report |
| ⌘/Ctrl + N | New report |
| ⌘/Ctrl + / | Open help |
| ? | Show keyboard shortcuts (when not typing in a field) |

On macOS it's ⌘; on Windows/Linux, Ctrl.`,
          pt: `| Atalho | Ação |
|---|---|
| ⌘/Ctrl + A | Iniciar / parar ditado |
| ⇧ + Espaço | Copiar achados + conclusão |
| ⌘/Ctrl + Enter | Gerar laudo |
| ⌘/Ctrl + N | Novo laudo |
| ⌘/Ctrl + / | Abrir ajuda |
| ? | Ver atalhos de teclado (quando não está digitando em um campo) |

No macOS é ⌘; no Windows/Linux, Ctrl.`,
        },
      },
      {
        id: "privacy",
        number: "16",
        title: { es: "Privacidad y datos", en: "Privacy and data", pt: "Privacidade e dados" },
        body: {
          es: `**Detección automática de datos identificativos.** Antes de que tu dictado se envíe a generar el informe, el sistema detecta y enmascara automáticamente datos identificativos que puedan haberse colado en el texto: documentos de identidad, números de historia clínica, teléfonos, emails y nombres de pacientes, entre otros. Está pensado como una capa extra de seguridad, no como sustituto de una buena práctica de dictado sin datos del paciente.

**El audio no se almacena.** El audio de tu dictado se usa únicamente para transcribirlo y se descarta inmediatamente después — no se guarda en los servidores de Radiogen.AI ni queda asociado a tu cuenta.

**Transporte cifrado.** Todos los datos viajan cifrados.

Para más detalle, consulta el aviso legal y la política de privacidad completa en la sección Legal del sitio.`,
          en: `**Automatic identifying-data detection.** Before your dictation is sent for report generation, the system automatically detects and masks identifying data that may have slipped into the text: ID numbers, medical record numbers, phone numbers, emails and patient names, among others. It's designed as an extra safety layer, not a substitute for good practice when dictating without patient data.

**Audio is not stored.** Your dictation's audio is used only to transcribe it and is discarded immediately after — it is never saved on Radiogen.AI's servers or linked to your account.

**Encrypted in transit.** All data travels encrypted.

For more detail, see the full legal notice and privacy policy in the site's Legal section.`,
          pt: `**Detecção automática de dados identificáveis.** Antes que seu ditado seja enviado para gerar o laudo, o sistema detecta e mascara automaticamente dados identificáveis que possam ter passado para o texto: documentos de identidade, números de prontuário, telefones, e-mails e nomes de pacientes, entre outros. É pensado como uma camada extra de segurança, não como substituto de uma boa prática de ditar sem dados do paciente.

**O áudio não é armazenado.** O áudio do seu ditado é usado apenas para transcrevê-lo e é descartado imediatamente depois — nunca é salvo nos servidores do Radiogen.AI nem fica associado à sua conta.

**Transporte criptografado.** Todos os dados trafegam criptografados.

Para mais detalhes, consulte o aviso legal e a política de privacidade completa na seção Legal do site.`,
        },
      },
      {
        id: "troubleshooting",
        number: "17",
        title: { es: "Solución de problemas", en: "Troubleshooting", pt: "Solução de problemas" },
        body: {
          es: `**El micrófono no se activa**
- Revisa que el navegador tenga permiso de micrófono (icono de candado en la barra de direcciones).
- Asegúrate de que ninguna otra pestaña o app esté usando el micrófono.
- En macOS: Ajustes → Privacidad → Micrófono, y autoriza tu navegador.

**La generación tarda más de lo normal**
- Comprueba tu conexión a internet.
- Los dictados muy largos tardan proporcionalmente más.
- Si persiste, escríbenos a soporte@radiogen.ai.

**El correo de verificación no llega**
- Revisa la carpeta de spam/correo no deseado.
- Desde el panel verás un aviso con un botón para reenviarlo mientras no verifiques tu cuenta.

**Alcancé el límite de informes de mi plan**
- Puedes subir de plan en cualquier momento desde Cuenta — el cambio es inmediato.`,
          en: `**The microphone doesn't activate**
- Check that the browser has microphone permission (padlock icon in the address bar).
- Make sure no other tab or app is using the microphone.
- On macOS: Settings → Privacy → Microphone, and allow your browser.

**Generation takes longer than usual**
- Check your internet connection.
- Very long dictations take proportionally longer.
- If it persists, email us at soporte@radiogen.ai.

**The verification email isn't arriving**
- Check your spam folder.
- The dashboard shows a banner with a resend button while your account is unverified.

**I hit my plan's report limit**
- You can upgrade your plan any time from Account — the change is immediate.`,
          pt: `**O microfone não ativa**
- Verifique se o navegador tem permissão de microfone (ícone de cadeado na barra de endereço).
- Certifique-se de que nenhuma outra aba ou app esteja usando o microfone.
- No macOS: Ajustes → Privacidade → Microfone, e autorize seu navegador.

**A geração demora mais que o normal**
- Verifique sua conexão à internet.
- Ditados muito longos demoram proporcionalmente mais.
- Se persistir, escreva para soporte@radiogen.ai.

**O e-mail de verificação não chega**
- Verifique a pasta de spam.
- O painel mostra um aviso com um botão para reenviar enquanto sua conta não for verificada.

**Atingi o limite de laudos do meu plano**
- Você pode fazer upgrade do plano a qualquer momento em Conta — a mudança é imediata.`,
        },
      },
      {
        id: "faq",
        number: "18",
        title: { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" },
        body: {
          es: `**¿Necesito instalar algo?**
No. Radiogen.AI es web — funciona en los navegadores modernos habituales.

**¿Funciona sin internet?**
No. La generación se hace en la nube; se necesita conexión activa.

**¿En qué idiomas funciona?**
Español, inglés y portugués — tanto la interfaz como los informes generados.

**¿Puede la IA inventar hallazgos?**
El motor de generación está diseñado explícitamente para no añadir hallazgos patológicos que no hayas dictado. Aun así, como con cualquier informe, revisar antes de firmar es tu responsabilidad.

**¿Cómo me cobran?**
Cargo mensual recurrente. Puedes cambiar o cancelar tu plan cuando quieras desde tu cuenta.

**¿Hay planes para hospitales o grupos?**
Sí — el plan Enterprise ofrece licencias de equipo, plantillas institucionales y onboarding dedicado. Solicita una cotización desde la sección de precios.`,
          en: `**Do I need to install anything?**
No. Radiogen.AI is web-based — it works in current mainstream browsers.

**Does it work offline?**
No. Generation happens in the cloud; an active connection is required.

**What languages does it work in?**
Spanish, English and Portuguese — both the interface and generated reports.

**Can the AI invent findings?**
The generation engine is explicitly designed not to add pathological findings you didn't dictate. Still, as with any report, reviewing before signing is your responsibility.

**How am I billed?**
A recurring monthly charge. You can change or cancel your plan any time from your account.

**Are there plans for hospitals or groups?**
Yes — the Enterprise plan offers team licenses, institutional templates and dedicated onboarding. Request a quote from the pricing section.`,
          pt: `**Preciso instalar algo?**
Não. O Radiogen.AI é web — funciona nos navegadores modernos habituais.

**Funciona sem internet?**
Não. A geração acontece na nuvem; é necessária conexão ativa.

**Em quais idiomas funciona?**
Espanhol, inglês e português — tanto a interface quanto os laudos gerados.

**A IA pode inventar achados?**
O motor de geração é projetado explicitamente para não adicionar achados patológicos que você não ditou. Ainda assim, como em qualquer laudo, revisar antes de assinar é sua responsabilidade.

**Como sou cobrado?**
Cobrança mensal recorrente. Você pode mudar ou cancelar seu plano a qualquer momento pela sua conta.

**Há planos para hospitais ou grupos?**
Sim — o plano Enterprise oferece licenças de equipe, modelos institucionais e onboarding dedicado. Solicite uma cotação na seção de preços.`,
        },
      },
    ],
  },
];

export const GUIDE_CONTACT: Record<GuideLang, { title: string; intro: string; support: string; general: string; site: string }> = {
  es: { title: "Contacto", intro: "Estamos para ayudarte.", support: "Soporte técnico", general: "Consultas generales", site: "Sitio web" },
  en: { title: "Contact", intro: "We're here to help.", support: "Technical support", general: "General inquiries", site: "Website" },
  pt: { title: "Contato", intro: "Estamos aqui para ajudar.", support: "Suporte técnico", general: "Consultas gerais", site: "Site" },
};
