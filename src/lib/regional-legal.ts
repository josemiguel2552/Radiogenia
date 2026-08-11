/* Region-specific legal annex.
 *
 * The same product is offered with two feature sets (see src/lib/region.ts),
 * so the legal documents must say so explicitly. In the EU/EEA/UK and the US
 * the interpretive features are withheld and the service is offered strictly
 * as documentation software; elsewhere the full feature set applies, with the
 * clinical responsibility that entails.
 *
 * This annex is appended to the Terms of Use and shown as its own notice, so
 * a user always sees the terms that actually govern their account.
 */

import type { Region } from "@/lib/region";

export const REGIONAL_ANNEX_VERSION = "1.0";

type Lang = "es" | "en" | "pt";

interface Annex {
  title: string;
  intro: string;
  clauses: { title: string; body: string }[];
}

const RESTRICTED: Record<Lang, Annex> = {
  es: {
    title: "Anexo regional — Unión Europea, EEE, Reino Unido y Estados Unidos",
    intro:
      "Este anexo forma parte de los Términos de Uso y prevalece sobre ellos para los usuarios cuya cuenta se sitúa en la Unión Europea, el Espacio Económico Europeo, Suiza, el Reino Unido o los Estados Unidos.",
    clauses: [
      {
        title: "1. Naturaleza del servicio en esta región",
        body: "En esta región, Radiogen.AI se ofrece exclusivamente como herramienta de documentación y redacción de informes radiológicos. Su función se limita a transcribir el dictado del radiólogo, organizarlo en las secciones de la plantilla elegida y facilitar su edición y exportación. NO es un producto sanitario ni un dispositivo médico conforme al Reglamento (UE) 2017/745 (MDR) ni a la normativa aplicable en los Estados Unidos, y no dispone ni requiere marcado CE ni autorización de la FDA.",
      },
      {
        title: "2. Funciones no disponibles",
        body: "Para preservar dicha naturaleza, en esta región NO se ofrecen las siguientes funciones: clasificación o estadificación automática (incluidos TNM, BI-RADS y TI-RADS), recomendaciones de seguimiento derivadas de guías clínicas, verificación clínica de posibles hallazgos omitidos y asistentes conversacionales sobre el caso. Estas funciones se encuentran desactivadas técnicamente y su acceso está bloqueado en el servidor.",
      },
      {
        title: "3. Ausencia de finalidad médica",
        body: "Radiogen.AI no analiza ni interpreta imágenes médicas, no emite diagnósticos, no realiza pronósticos, no estadifica enfermedades y no formula recomendaciones diagnósticas ni terapéuticas. No añade información clínica que el radiólogo no haya dictado o escrito. El contenido clínico del informe procede íntegramente del profesional.",
      },
      {
        title: "4. Responsabilidad del profesional",
        body: "El radiólogo es el único responsable del contenido, la revisión, la validación y la firma del informe final. El uso de la herramienta no sustituye ni condiciona el juicio clínico profesional en ningún grado.",
      },
      {
        title: "5. Uso conforme",
        body: "El usuario se compromete a utilizar Radiogen.AI únicamente como herramienta de documentación y a no emplearla como apoyo a la decisión diagnóstica. Queda prohibido introducir datos identificativos de pacientes. El incumplimiento de estas condiciones faculta a Radiogen.AI para suspender el acceso.",
      },
      {
        title: "6. Transparencia sobre inteligencia artificial",
        body: "Radiogen.AI utiliza sistemas de inteligencia artificial para la transcripción de voz y la estructuración del texto dictado. El usuario es informado de ello conforme al Reglamento (UE) 2024/1689 sobre inteligencia artificial. Al no constituir producto sanitario ni figurar entre los usos de alto riesgo de dicho Reglamento, el servicio se somete a las obligaciones de transparencia aplicables.",
      },
    ],
  },
  en: {
    title: "Regional annex — European Union, EEA, United Kingdom and United States",
    intro:
      "This annex forms part of the Terms of Use and prevails over them for users whose account is located in the European Union, the European Economic Area, Switzerland, the United Kingdom or the United States.",
    clauses: [
      {
        title: "1. Nature of the service in this region",
        body: "In this region, Radiogen.AI is offered exclusively as a documentation and report-drafting tool for radiology. Its function is limited to transcribing the radiologist's dictation, organising it into the sections of the chosen template, and enabling its editing and export. It is NOT a medical device under Regulation (EU) 2017/745 (MDR) or applicable United States law, and it neither holds nor requires CE marking or FDA clearance.",
      },
      {
        title: "2. Features not available",
        body: "To preserve that nature, the following features are NOT offered in this region: automatic classification or staging (including TNM, BI-RADS and TI-RADS), follow-up recommendations derived from clinical guidelines, clinical checks for possibly omitted findings, and conversational assistants about the case. These features are technically disabled and access to them is blocked server-side.",
      },
      {
        title: "3. Absence of medical purpose",
        body: "Radiogen.AI does not analyse or interpret medical images, does not produce diagnoses, does not make prognoses, does not stage disease, and does not issue diagnostic or therapeutic recommendations. It adds no clinical information that the radiologist has not dictated or typed. The clinical content of the report comes entirely from the professional.",
      },
      {
        title: "4. Professional responsibility",
        body: "The radiologist is solely responsible for the content, review, validation and signature of the final report. Use of the tool neither replaces nor constrains professional clinical judgement in any degree.",
      },
      {
        title: "5. Compliant use",
        body: "The user undertakes to use Radiogen.AI solely as a documentation tool and not as diagnostic decision support. Entering patient-identifying data is prohibited. Breach of these conditions entitles Radiogen.AI to suspend access.",
      },
      {
        title: "6. Artificial intelligence transparency",
        body: "Radiogen.AI uses artificial intelligence systems for voice transcription and for structuring dictated text. Users are informed of this in accordance with Regulation (EU) 2024/1689 on artificial intelligence. As the service is neither a medical device nor among that Regulation's high-risk uses, it is subject to the applicable transparency obligations.",
      },
    ],
  },
  pt: {
    title: "Anexo regional — União Europeia, EEE, Reino Unido e Estados Unidos",
    intro:
      "Este anexo faz parte dos Termos de Uso e prevalece sobre eles para os utilizadores cuja conta se situa na União Europeia, no Espaço Económico Europeu, na Suíça, no Reino Unido ou nos Estados Unidos.",
    clauses: [
      {
        title: "1. Natureza do serviço nesta região",
        body: "Nesta região, o Radiogen.AI é oferecido exclusivamente como ferramenta de documentação e redação de laudos radiológicos. A sua função limita-se a transcrever o ditado do radiologista, organizá-lo nas secções do modelo escolhido e permitir a sua edição e exportação. NÃO é um dispositivo médico nos termos do Regulamento (UE) 2017/745 (MDR) nem da legislação aplicável nos Estados Unidos, e não possui nem requer marcação CE ou autorização da FDA.",
      },
      {
        title: "2. Funcionalidades não disponíveis",
        body: "Para preservar essa natureza, NÃO são oferecidas nesta região as seguintes funcionalidades: classificação ou estadiamento automático (incluindo TNM, BI-RADS e TI-RADS), recomendações de seguimento derivadas de diretrizes clínicas, verificação clínica de possíveis achados omitidos e assistentes conversacionais sobre o caso. Estas funcionalidades estão tecnicamente desativadas e o seu acesso é bloqueado no servidor.",
      },
      {
        title: "3. Ausência de finalidade médica",
        body: "O Radiogen.AI não analisa nem interpreta imagens médicas, não emite diagnósticos, não realiza prognósticos, não estadia doenças e não formula recomendações diagnósticas ou terapêuticas. Não acrescenta informação clínica que o radiologista não tenha ditado ou escrito. O conteúdo clínico do laudo provém integralmente do profissional.",
      },
      {
        title: "4. Responsabilidade do profissional",
        body: "O radiologista é o único responsável pelo conteúdo, revisão, validação e assinatura do laudo final. O uso da ferramenta não substitui nem condiciona o juízo clínico profissional em qualquer grau.",
      },
      {
        title: "5. Uso conforme",
        body: "O utilizador compromete-se a usar o Radiogen.AI apenas como ferramenta de documentação e não como apoio à decisão diagnóstica. É proibido introduzir dados identificáveis de pacientes. O incumprimento destas condições permite ao Radiogen.AI suspender o acesso.",
      },
      {
        title: "6. Transparência sobre inteligência artificial",
        body: "O Radiogen.AI utiliza sistemas de inteligência artificial para a transcrição de voz e a estruturação do texto ditado. O utilizador é informado disso nos termos do Regulamento (UE) 2024/1689 sobre inteligência artificial. Não constituindo dispositivo médico nem figurando entre os usos de alto risco desse Regulamento, o serviço está sujeito às obrigações de transparência aplicáveis.",
      },
    ],
  },
};

const OPEN: Record<Lang, Annex> = {
  es: {
    title: "Anexo regional — América Latina y resto de mercados",
    intro:
      "Este anexo forma parte de los Términos de Uso y se aplica a los usuarios cuya cuenta no se sitúa en la Unión Europea, el Espacio Económico Europeo, Suiza, el Reino Unido ni los Estados Unidos.",
    clauses: [
      {
        title: "1. Funciones disponibles",
        body: "Además de la documentación y redacción de informes, en esta región Radiogen.AI ofrece funciones de apoyo: clasificación y estadificación asistida (TNM, BI-RADS, TI-RADS y otros sistemas), recomendaciones de seguimiento a partir de guías clínicas, verificación de posibles hallazgos omitidos y asistentes de consulta. Todas ellas operan sobre la información que el propio radiólogo ha dictado o escrito.",
      },
      {
        title: "2. Carácter orientativo y no vinculante",
        body: "Los resultados de estas funciones son orientativos y en ningún caso constituyen un diagnóstico, un pronóstico ni una indicación terapéutica. Las clasificaciones propuestas y las recomendaciones de seguimiento deben ser verificadas por el radiólogo frente a las fuentes originales y a los protocolos vigentes en su institución antes de incorporarlas al informe.",
      },
      {
        title: "3. Responsabilidad del profesional",
        body: "El radiólogo es el único responsable del contenido, la revisión, la validación y la firma del informe final, incluidas las clasificaciones y recomendaciones que decida incorporar. El uso de estas funciones no sustituye el juicio clínico profesional ni traslada responsabilidad alguna a Radiogen.AI.",
      },
      {
        title: "4. Limitaciones de la inteligencia artificial",
        body: "Las funciones de apoyo se basan en modelos de inteligencia artificial que pueden producir resultados incompletos o incorrectos. El usuario reconoce esta limitación y se compromete a revisar críticamente toda salida antes de utilizarla. Queda prohibido introducir datos identificativos de pacientes.",
      },
      {
        title: "5. Naturaleza del producto",
        body: "Radiogen.AI no analiza ni interpreta imágenes médicas y no emite diagnósticos de forma autónoma. Corresponde al usuario y a su institución verificar el cumplimiento de la normativa sanitaria aplicable en su país antes de incorporar la herramienta a su flujo de trabajo asistencial.",
      },
    ],
  },
  en: {
    title: "Regional annex — Latin America and other markets",
    intro:
      "This annex forms part of the Terms of Use and applies to users whose account is not located in the European Union, the European Economic Area, Switzerland, the United Kingdom or the United States.",
    clauses: [
      {
        title: "1. Available features",
        body: "In addition to documentation and report drafting, in this region Radiogen.AI offers support features: assisted classification and staging (TNM, BI-RADS, TI-RADS and other systems), follow-up recommendations based on clinical guidelines, checks for possibly omitted findings, and reference assistants. All of them operate on information the radiologist has dictated or typed.",
      },
      {
        title: "2. Indicative and non-binding nature",
        body: "The output of these features is indicative and in no case constitutes a diagnosis, prognosis or therapeutic indication. Proposed classifications and follow-up recommendations must be verified by the radiologist against the original sources and the protocols in force at their institution before being incorporated into the report.",
      },
      {
        title: "3. Professional responsibility",
        body: "The radiologist is solely responsible for the content, review, validation and signature of the final report, including any classification or recommendation they choose to incorporate. Use of these features neither replaces professional clinical judgement nor transfers any responsibility to Radiogen.AI.",
      },
      {
        title: "4. Limitations of artificial intelligence",
        body: "The support features rely on artificial intelligence models that may produce incomplete or incorrect results. The user acknowledges this limitation and undertakes to critically review every output before use. Entering patient-identifying data is prohibited.",
      },
      {
        title: "5. Nature of the product",
        body: "Radiogen.AI does not analyse or interpret medical images and does not produce diagnoses autonomously. It is for the user and their institution to verify compliance with the health regulations applicable in their country before incorporating the tool into their clinical workflow.",
      },
    ],
  },
  pt: {
    title: "Anexo regional — América Latina e outros mercados",
    intro:
      "Este anexo faz parte dos Termos de Uso e aplica-se aos utilizadores cuja conta não se situa na União Europeia, no Espaço Económico Europeu, na Suíça, no Reino Unido ou nos Estados Unidos.",
    clauses: [
      {
        title: "1. Funcionalidades disponíveis",
        body: "Além da documentação e redação de laudos, nesta região o Radiogen.AI oferece funcionalidades de apoio: classificação e estadiamento assistidos (TNM, BI-RADS, TI-RADS e outros sistemas), recomendações de seguimento a partir de diretrizes clínicas, verificação de possíveis achados omitidos e assistentes de consulta. Todas operam sobre a informação que o próprio radiologista ditou ou escreveu.",
      },
      {
        title: "2. Caráter orientativo e não vinculativo",
        body: "Os resultados destas funcionalidades são orientativos e em caso algum constituem diagnóstico, prognóstico ou indicação terapêutica. As classificações propostas e as recomendações de seguimento devem ser verificadas pelo radiologista face às fontes originais e aos protocolos vigentes na sua instituição antes de serem incorporadas no laudo.",
      },
      {
        title: "3. Responsabilidade do profissional",
        body: "O radiologista é o único responsável pelo conteúdo, revisão, validação e assinatura do laudo final, incluindo as classificações e recomendações que decida incorporar. O uso destas funcionalidades não substitui o juízo clínico profissional nem transfere qualquer responsabilidade para o Radiogen.AI.",
      },
      {
        title: "4. Limitações da inteligência artificial",
        body: "As funcionalidades de apoio baseiam-se em modelos de inteligência artificial que podem produzir resultados incompletos ou incorretos. O utilizador reconhece esta limitação e compromete-se a rever criticamente todas as saídas antes de as utilizar. É proibido introduzir dados identificáveis de pacientes.",
      },
      {
        title: "5. Natureza do produto",
        body: "O Radiogen.AI não analisa nem interpreta imagens médicas e não emite diagnósticos de forma autónoma. Cabe ao utilizador e à sua instituição verificar o cumprimento da regulamentação sanitária aplicável no seu país antes de incorporar a ferramenta no seu fluxo de trabalho assistencial.",
      },
    ],
  },
};

export function regionalAnnex(region: Region, lang: string): Annex {
  const l: Lang = lang === "en" ? "en" : lang === "pt" ? "pt" : "es";
  return region === "open" ? OPEN[l] : RESTRICTED[l];
}
