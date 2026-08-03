/* Institutional terms accepted by a hospital when it orders seats through
   the onboarding link. Kept versioned: the accepted version is stored with
   the order so we can prove what was signed and when. */

export const HOSPITAL_TERMS_VERSION = "1.0";

export type HospitalTermsLang = "es" | "en" | "pt";

interface TermsDoc {
  title: string;
  intro: string;
  clauses: { title: string; body: string }[];
  acceptLabel: string;
}

export const HOSPITAL_TERMS: Record<HospitalTermsLang, TermsDoc> = {
  es: {
    title: "Condiciones de contratación institucional",
    intro:
      "Estas condiciones regulan la contratación de licencias de Radiogen.AI por parte de una institución sanitaria para su uso por profesionales de la radiología.",
    clauses: [
      {
        title: "1. Objeto y naturaleza del servicio",
        body: "Radiogen.AI es una herramienta de estructuración y redacción de informes radiológicos. NO es un producto sanitario ni un dispositivo médico: no analiza ni interpreta imágenes, no emite diagnósticos autónomos y no formula recomendaciones terapéuticas. Organiza únicamente la información que el radiólogo dicta o escribe.",
      },
      {
        title: "2. Responsabilidad profesional",
        body: "La institución garantiza que las licencias serán utilizadas exclusivamente por profesionales médicos cualificados. Cada radiólogo es responsable de revisar, validar y firmar el informe final. La responsabilidad clínica del informe recae íntegramente en el profesional que lo suscribe.",
      },
      {
        title: "3. Protección de datos",
        body: "La institución se compromete a no introducir datos identificativos de pacientes en la plataforma. Radiogen.AI aplica filtrado automático de datos personales y no conserva las grabaciones de voz. El tratamiento de datos se rige por la Política de Privacidad y el Acuerdo de Tratamiento de Datos publicados en la plataforma.",
      },
      {
        title: "4. Licencias y precio",
        body: "El precio es de 19,90 € por licencia y mes, con un mínimo de 2 licencias. Cada licencia da acceso a un profesional identificado, con informes y dictado por voz ilimitados. Las licencias son nominales y no pueden compartirse entre varios profesionales.",
      },
      {
        title: "5. Facturación y renovación",
        body: "La suscripción se renueva automáticamente cada mes por el número de licencias contratadas. En el pago con tarjeta, el cargo es inmediato y recurrente. En el pago por transferencia, el acceso se habilita una vez recibido el importe. Los pagos no son reembolsables.",
      },
      {
        title: "6. Altas, bajas y cancelación",
        body: "La institución puede solicitar la modificación del número de licencias o la cancelación del servicio escribiendo a info@radiogen.ai. La cancelación surte efecto al final del periodo facturado, conservando el acceso hasta esa fecha. Los datos de las cuentas se conservan 90 días tras la baja para permitir su reactivación, y se eliminan definitivamente transcurrido ese plazo.",
      },
      {
        title: "7. Plantillas institucionales",
        body: "La institución puede crear y personalizar sus propias plantillas de informe, o solicitar su carga a Radiogen.AI enviándolas a info@radiogen.ai. Las plantillas institucionales quedan disponibles para todos los profesionales de la institución.",
      },
    ],
    acceptLabel:
      "Declaro estar autorizado/a para contratar en nombre de la institución y acepto las condiciones de contratación institucional, los Términos de Uso y la Política de Privacidad de Radiogen.AI.",
  },
  en: {
    title: "Institutional subscription terms",
    intro:
      "These terms govern the purchase of Radiogen.AI licences by a healthcare institution for use by radiology professionals.",
    clauses: [
      {
        title: "1. Purpose and nature of the service",
        body: "Radiogen.AI is a radiology report structuring and drafting tool. It is NOT a medical device: it does not analyse or interpret images, does not produce autonomous diagnoses and does not issue therapeutic recommendations. It only organises the information the radiologist dictates or types.",
      },
      {
        title: "2. Professional responsibility",
        body: "The institution warrants that licences will be used exclusively by qualified medical professionals. Each radiologist is responsible for reviewing, validating and signing the final report. Clinical responsibility rests entirely with the signing professional.",
      },
      {
        title: "3. Data protection",
        body: "The institution undertakes not to enter patient-identifying data into the platform. Radiogen.AI applies automatic personal-data filtering and does not retain voice recordings. Data processing is governed by the Privacy Policy and Data Processing Agreement published on the platform.",
      },
      {
        title: "4. Licences and price",
        body: "The price is €19.90 per licence per month, with a minimum of 2 licences. Each licence grants access to one identified professional, with unlimited reports and voice dictation. Licences are personal and may not be shared.",
      },
      {
        title: "5. Billing and renewal",
        body: "The subscription renews automatically each month for the contracted number of licences. With card payment the charge is immediate and recurring. With bank transfer, access is enabled once the amount is received. Payments are non-refundable.",
      },
      {
        title: "6. Changes and cancellation",
        body: "The institution may request a change in the number of licences or cancellation by writing to info@radiogen.ai. Cancellation takes effect at the end of the billed period, retaining access until then. Account data is kept for 90 days after termination to allow reactivation, and permanently deleted thereafter.",
      },
      {
        title: "7. Institutional templates",
        body: "The institution may create and customise its own report templates, or ask Radiogen.AI to load them by sending them to info@radiogen.ai. Institutional templates become available to all professionals of the institution.",
      },
    ],
    acceptLabel:
      "I declare that I am authorised to contract on behalf of the institution and I accept the institutional subscription terms, the Terms of Use and the Privacy Policy of Radiogen.AI.",
  },
  pt: {
    title: "Condições de contratação institucional",
    intro:
      "Estas condições regulam a contratação de licenças do Radiogen.AI por uma instituição de saúde para uso por profissionais de radiologia.",
    clauses: [
      {
        title: "1. Objeto e natureza do serviço",
        body: "O Radiogen.AI é uma ferramenta de estruturação e redação de laudos radiológicos. NÃO é um dispositivo médico: não analisa nem interpreta imagens, não emite diagnósticos autônomos e não formula recomendações terapêuticas. Apenas organiza a informação que o radiologista dita ou escreve.",
      },
      {
        title: "2. Responsabilidade profissional",
        body: "A instituição garante que as licenças serão utilizadas exclusivamente por profissionais médicos qualificados. Cada radiologista é responsável por revisar, validar e assinar o laudo final. A responsabilidade clínica recai integralmente sobre o profissional que o assina.",
      },
      {
        title: "3. Proteção de dados",
        body: "A instituição compromete-se a não inserir dados identificáveis de pacientes na plataforma. O Radiogen.AI aplica filtragem automática de dados pessoais e não conserva as gravações de voz. O tratamento de dados rege-se pela Política de Privacidade e pelo Acordo de Tratamento de Dados publicados na plataforma.",
      },
      {
        title: "4. Licenças e preço",
        body: "O preço é de 19,90 € por licença e mês, com um mínimo de 2 licenças. Cada licença dá acesso a um profissional identificado, com laudos e ditado por voz ilimitados. As licenças são nominais e não podem ser compartilhadas.",
      },
      {
        title: "5. Faturamento e renovação",
        body: "A assinatura renova-se automaticamente a cada mês pelo número de licenças contratadas. No pagamento com cartão, a cobrança é imediata e recorrente. No pagamento por transferência, o acesso é habilitado após o recebimento do valor. Os pagamentos não são reembolsáveis.",
      },
      {
        title: "6. Alterações e cancelamento",
        body: "A instituição pode solicitar a alteração do número de licenças ou o cancelamento escrevendo para info@radiogen.ai. O cancelamento tem efeito no fim do período faturado, mantendo o acesso até essa data. Os dados das contas são conservados por 90 dias após a baixa para permitir a reativação, sendo eliminados definitivamente depois desse prazo.",
      },
      {
        title: "7. Modelos institucionais",
        body: "A instituição pode criar e personalizar os seus próprios modelos de laudo, ou solicitar o carregamento ao Radiogen.AI enviando-os para info@radiogen.ai. Os modelos institucionais ficam disponíveis para todos os profissionais da instituição.",
      },
    ],
    acceptLabel:
      "Declaro estar autorizado/a a contratar em nome da instituição e aceito as condições de contratação institucional, os Termos de Uso e a Política de Privacidade do Radiogen.AI.",
  },
};

/** Price per seat per month, and the minimum institutional order. */
export const SEAT_PRICE_EUR = 19.90;
export const MIN_SEATS = 2;
