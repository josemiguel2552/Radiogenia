import { describe, it, expect } from "vitest";
import { detectPii, hasPii, stripPii } from "../pii-detect";

describe("detectPii", () => {
  describe("DNI detection", () => {
    it("detects valid Spanish DNI", () => {
      const matches = detectPii("Paciente con DNI 12345678Z presenta dolor.");
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe("dni");
      expect(matches[0].value).toBe("12345678Z");
    });

    it("detects DNI with dots", () => {
      const matches = detectPii("DNI 12.345.678Z adjunto.");
      expect(matches.some((m) => m.type === "dni")).toBe(true);
    });

    it("ignores measurements that look like DNI", () => {
      const matches = detectPii("Nódulo de 12345678mm en lóbulo hepático.");
      const dniMatches = matches.filter((m) => m.type === "dni");
      expect(dniMatches).toHaveLength(0);
    });

    it("ignores invalid check letter", () => {
      const matches = detectPii("Código 12345678A no válido.");
      const dniMatches = matches.filter((m) => m.type === "dni");
      expect(dniMatches).toHaveLength(0);
    });
  });

  describe("NIE detection", () => {
    it("detects valid NIE", () => {
      const matches = detectPii("NIE X0000000T del paciente.");
      expect(matches.some((m) => m.type === "nie")).toBe(true);
    });
  });

  describe("CURP detection (Mexico)", () => {
    it("detects valid CURP", () => {
      const matches = detectPii("CURP del paciente: GARC850101HDFRRL09");
      expect(matches.some((m) => m.type === "curp")).toBe(true);
      expect(matches.find((m) => m.type === "curp")!.value).toBe("GARC850101HDFRRL09");
    });

    it("ignores invalid CURP (bad month)", () => {
      const matches = detectPii("Código GARC851301HDFRRL09 no válido.");
      expect(matches.filter((m) => m.type === "curp")).toHaveLength(0);
    });
  });

  describe("CPF detection (Brazil)", () => {
    it("detects formatted CPF", () => {
      // Valid CPF: 529.982.247-25
      const matches = detectPii("CPF do paciente: 529.982.247-25");
      expect(matches.some((m) => m.type === "cpf")).toBe(true);
    });

    it("rejects all-same-digit CPF", () => {
      const matches = detectPii("Número 111.111.111-11 inválido.");
      expect(matches.filter((m) => m.type === "cpf")).toHaveLength(0);
    });
  });

  describe("RUT detection (Chile)", () => {
    it("detects formatted RUT", () => {
      // 12.345.678-5 — validate: sum = 8*2+7*3+6*4+5*5+4*6+3*7+2*2+1*3 = 16+21+24+25+24+21+4+3 = 138; 138%11=6; 11-6=5 → check=5
      const matches = detectPii("RUT del paciente: 12.345.678-5");
      expect(matches.some((m) => m.type === "rut")).toBe(true);
    });

    it("detects RUT without dots", () => {
      const matches = detectPii("RUT: 12345678-5 adjunto.");
      expect(matches.some((m) => m.type === "rut")).toBe(true);
    });
  });

  describe("Cédula detection (Colombia)", () => {
    it("detects cédula with CC prefix", () => {
      const matches = detectPii("C.C. 1234567890 del paciente.");
      expect(matches.some((m) => m.type === "cedula")).toBe(true);
    });

    it("detects cédula with keyword", () => {
      const matches = detectPii("Cédula: 80123456 registrada.");
      expect(matches.some((m) => m.type === "cedula")).toBe(true);
    });
  });

  describe("email detection", () => {
    it("detects email addresses", () => {
      const matches = detectPii("Contactar a doctor@hospital.com para seguimiento.");
      expect(matches.some((m) => m.type === "email")).toBe(true);
    });
  });

  describe("phone detection", () => {
    it("detects Spanish phone with prefix", () => {
      const matches = detectPii("Llamar al +34 612 345 678 para cita.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects 9-digit Spanish mobile", () => {
      const matches = detectPii("Teléfono: 612 345 678.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects Mexican phone", () => {
      const matches = detectPii("Tel: +52 55 1234 5678 del paciente.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects Colombian phone", () => {
      const matches = detectPii("Contacto: +57 310 123 4567.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects Brazilian phone", () => {
      const matches = detectPii("Fone: +55 11 98765 4321.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });
  });

  describe("NHC / medical record detection", () => {
    it("detects NHC prefix", () => {
      const matches = detectPii("NHC: 123456789 del paciente.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("detects Historia Clínica", () => {
      const matches = detectPii("Historia Clínica: 987654321.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("detects HC abbreviation", () => {
      const matches = detectPii("HC: 12345/2024 adjunto.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });
  });

  describe("name detection", () => {
    it("detects full name with known first name", () => {
      const matches = detectPii("Se presenta María García López para estudio.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects name with patient prefix", () => {
      const matches = detectPii("Paciente Carlos Rodríguez acude a consulta.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("ignores anatomy terms", () => {
      const matches = detectPii("Arteria Hepática con flujo normal.");
      expect(matches.filter((m) => m.type === "name")).toHaveLength(0);
    });
  });

  describe("false positive avoidance", () => {
    it("ignores dates", () => {
      const matches = detectPii("Estudio realizado el 15/03/2024.");
      expect(matches).toHaveLength(0);
    });

    it("ignores medical measurements", () => {
      const text = "Nódulo de 15 mm en segmento IV. Densidad 45 HU.";
      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });

    it("ignores accession numbers", () => {
      const text = "Estudio: 123456789012 realizado hoy.";
      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });

    it("ignores typical radiology dictation", () => {
      const text = "Hígado de ecoestructura homogénea, tamaño normal de 15 cm. Vía biliar no dilatada. Vesícula biliar de paredes finas sin litiasis. Bazo homogéneo de 11 cm. Riñones de tamaño y morfología normal, con buena diferenciación córtico-medular. No se observa líquido libre intraperitoneal.";
      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });
  });

  describe("RFC detection (Mexico)", () => {
    it("detects personal RFC (13 chars)", () => {
      const matches = detectPii("RFC del paciente: GARC850101AB1");
      expect(matches.some((m) => m.type === "rfc")).toBe(true);
    });

    it("detects company RFC (12 chars)", () => {
      const matches = detectPii("RFC: GAR850101AB1 del hospital.");
      expect(matches.some((m) => m.type === "rfc")).toBe(true);
    });

    it("detects RFC with Ñ", () => {
      const matches = detectPii("RFC: ÑUÑE900215HG3 registrado.");
      expect(matches.some((m) => m.type === "rfc")).toBe(true);
    });

    it("ignores invalid RFC (bad month)", () => {
      const matches = detectPii("Código GARC851501AB1 no válido.");
      expect(matches.filter((m) => m.type === "rfc")).toHaveLength(0);
    });

    it("ignores short codes that aren't RFC", () => {
      const matches = detectPii("Protocolo ABC123 del estudio.");
      expect(matches.filter((m) => m.type === "rfc")).toHaveLength(0);
    });
  });

  // ── Mexico-specific integration tests ──
  describe("Mexico PII leak rate", () => {
    it("detects CURP embedded in clinical text", () => {
      const text = "Paciente masculino de 38 años, CURP GARC850101HDFRRL09, acude por dolor abdominal.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "curp")).toBe(true);
    });

    it("detects CURP without label", () => {
      const text = "Datos: LOPM920315MDFRZR07, femenino, 31 años.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "curp")).toBe(true);
    });

    it("detects RFC embedded in clinical text", () => {
      const text = "Facturar a RFC GARC850101AB1, paciente Juan García.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "rfc")).toBe(true);
    });

    it("detects Mexican phone numbers (+52)", () => {
      const text = "Contacto del paciente: +52 55 1234 5678.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects Mexican 10-digit phone without country code", () => {
      const text = "Tel: +52 33 9876 5432 para resultados.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects common Mexican names", () => {
      const text = "Se presenta Guadalupe Hernández Martínez para TC de abdomen.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects names with 'de' connector common in Mexico", () => {
      const text = "Paciente María de los Ángeles Rodríguez acude a estudio.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects NHC/expediente in Mexican hospital context", () => {
      const text = "NHC: 12345678 del Hospital General.";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("detects email in referral notes", () => {
      const text = "Enviar resultados a dr.garcia@hospital.com.mx";
      const matches = detectPii(text);
      expect(matches.some((m) => m.type === "email")).toBe(true);
    });

    it("strips all PII from a realistic Mexican radiology dictation", () => {
      const text = [
        "Paciente Guadalupe Hernández Martínez, CURP HERG900215MDFRRL05,",
        "RFC HERG900215AB1, NHC: 45678901.",
        "Tel: +52 55 4321 8765, email: guadalupe.hdz@gmail.com.",
        "TC de abdomen simple y contrastada.",
        "Hígado de tamaño normal, sin lesiones focales.",
        "Bazo homogéneo de 10 cm. Riñones normales.",
        "No se observa líquido libre.",
      ].join(" ");

      const result = stripPii(text);
      expect(result.strippedCount).toBeGreaterThanOrEqual(5);
      expect(result.cleaned).not.toContain("Guadalupe");
      expect(result.cleaned).not.toContain("HERG900215");
      expect(result.cleaned).not.toContain("45678901");
      expect(result.cleaned).not.toContain("guadalupe.hdz");
      // Medical content should be preserved
      expect(result.cleaned).toContain("Hígado de tamaño normal");
      expect(result.cleaned).toContain("Bazo homogéneo");
      expect(result.cleaned).toContain("Riñones normales");
    });

    it("does not false-positive on Mexican radiology report without PII", () => {
      const text = [
        "TC de tórax simple.",
        "Campos pulmonares sin evidencia de consolidación ni derrame.",
        "Mediastino sin adenopatías de tamaño significativo.",
        "Silueta cardíaca de tamaño normal. Índice cardiotorácico 0.45.",
        "Estructuras óseas sin lesiones líticas ni blásticas.",
        "Conclusión: Estudio sin hallazgos patológicos significativos.",
      ].join(" ");

      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });
  });

  // ── Reinforced names / surnames (Spanish + English) ──
  describe("English and Spanish names & surnames", () => {
    it("detects English full name (known first name + surname)", () => {
      const matches = detectPii("Patient John Smith referred for chest CT.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects English female full name", () => {
      const matches = detectPii("Report for Mary Johnson, abdominal ultrasound.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects a sequence of two known surnames (uncommon first name)", () => {
      const matches = detectPii("Se presenta Yaiza García Betancor para resonancia.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects 'Apellido, Nombre' list format (Spanish)", () => {
      const matches = detectPii("García, Juan — TC de tórax.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects 'Surname, Firstname' list format (English)", () => {
      const matches = detectPii("Smith, John — MRI brain.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("does NOT flag medical eponyms as names", () => {
      const text = [
        "Down syndrome features noted.",
        "Findings consistent with a Smith fracture.",
        "Positive Murphy sign on examination.",
        "Baker cyst in the popliteal fossa.",
      ].join(" ");
      const matches = detectPii(text);
      expect(matches.filter((m) => m.type === "name")).toHaveLength(0);
    });

    it("does not false-positive on an English radiology report", () => {
      const text = [
        "CT chest without contrast.",
        "Lungs are clear without consolidation or effusion.",
        "No mediastinal lymphadenopathy.",
        "Normal cardiac silhouette.",
        "Impression: No acute findings.",
      ].join(" ");
      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });
  });

  // ── US Social Security Number ──
  describe("US SSN detection", () => {
    it("detects a valid US SSN", () => {
      const matches = detectPii("Patient SSN 123-45-6789 on file.");
      expect(matches.some((m) => m.type === "us_ssn")).toBe(true);
    });

    it("ignores invalid SSN area numbers (000 / 666 / 9xx)", () => {
      const matches = detectPii("Codes 000-45-6789, 666-12-3456 and 900-11-2222.");
      expect(matches.filter((m) => m.type === "us_ssn")).toHaveLength(0);
    });

    it("does not treat a date as an SSN", () => {
      const matches = detectPii("Study performed on 12-05-2024.");
      expect(matches.filter((m) => m.type === "us_ssn")).toHaveLength(0);
    });
  });

  // ── English medical record identifiers ──
  describe("English medical record numbers", () => {
    it("detects MRN", () => {
      const matches = detectPii("MRN: 12345678, prior comparison available.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("detects 'Patient ID'", () => {
      const matches = detectPii("Patient ID 9876543 — follow-up CT.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("strips English PII from a realistic dictation", () => {
      const text = [
        "Patient John Smith, MRN: 45678901, SSN 123-45-6789.",
        "CT abdomen and pelvis with contrast.",
        "Liver is normal in size without focal lesions.",
        "Spleen homogeneous. Kidneys unremarkable.",
      ].join(" ");
      const result = stripPii(text);
      expect(result.cleaned).not.toContain("John Smith");
      expect(result.cleaned).not.toContain("45678901");
      expect(result.cleaned).not.toContain("123-45-6789");
      expect(result.cleaned).toContain("Liver is normal in size");
      expect(result.cleaned).toContain("Kidneys unremarkable");
    });
  });

  // ── Context-anchored detection (names of any origin, ALL-CAPS, lowercase) ──
  describe("context-anchored name detection", () => {
    it("detects non-Western name after 'se presenta'", () => {
      const matches = detectPii("Se presenta Ahmed Hassan para TC de tórax.");
      expect(matches.some((m) => m.type === "name" && m.value.includes("Ahmed Hassan"))).toBe(true);
    });

    it("detects non-Western name after 'acude'", () => {
      const matches = detectPii("Acude Chidi Okafor para radiografía de tórax.");
      expect(matches.some((m) => m.type === "name" && m.value.includes("Chidi Okafor"))).toBe(true);
    });

    it("detects ALL-CAPS name after 'PACIENTE:' label", () => {
      const result = stripPii("PACIENTE: GARCIA LOPEZ, MARIA. Estudio de TC abdomen.");
      expect(result.cleaned).not.toContain("GARCIA");
      expect(result.cleaned).not.toContain("MARIA");
      expect(result.cleaned).toContain("Estudio de TC abdomen");
    });

    it("detects ALL-CAPS name without colon, stopping at clinical words", () => {
      const result = stripPii("PACIENTE MARIA GARCIA LOPEZ ACUDE A CONSULTA.");
      expect(result.cleaned).not.toContain("MARIA GARCIA LOPEZ");
      expect(result.cleaned).toContain("ACUDE A CONSULTA");
    });

    it("detects single first name after 'Paciente'", () => {
      const matches = detectPii("Paciente Fernando acude a consulta hoy.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects hyphenated name", () => {
      const matches = detectPii("Paciente Jean-Pierre Dubois acude a consulta.");
      expect(matches.some((m) => m.type === "name" && m.value.includes("Jean-Pierre"))).toBe(true);
    });

    it("detects apostrophe surname after 'Patient'", () => {
      const matches = detectPii("Patient O'Brien referred for chest CT.");
      expect(matches.some((m) => m.type === "name" && m.value.includes("O'Brien"))).toBe(true);
    });

    it("detects lowercase dictation transcript names (dictionary-known)", () => {
      const result = stripPii("paciente juan garcía acude a consulta.");
      expect(result.cleaned).not.toContain("juan garcía");
      expect(result.cleaned).toContain("acude a consulta");
    });

    it("detects name after honorific Sr.", () => {
      const matches = detectPii("Sr. Ahmed Hassan, control de nódulo pulmonar.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects name after Dña.", () => {
      const matches = detectPii("Dña. Wei Zhang, ecografía abdominal.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("stops before identifier labels", () => {
      const result = stripPii("Paciente Guadalupe Hernández, CURP HERG900215MDFRRL05.");
      expect(result.cleaned).not.toContain("Guadalupe");
      expect(result.cleaned).not.toContain("HERG900215");
      expect(result.cleaned).toContain("[CURP]");
    });

    it("does NOT flag clinical adjectives after 'paciente'", () => {
      const texts = [
        "Paciente estable, sin cambios significativos.",
        "La paciente refiere dolor abdominal.",
        "Paciente con antecedentes de EPOC.",
        "Paciente EPOC reagudizado.",
        "PACIENTE ACUDE A CONSULTA SIN HALLAZGOS.",
        "Paciente Femenina de 45 años.",
        "Patient with known COPD, stable.",
      ];
      for (const text of texts) {
        const matches = detectPii(text);
        expect(matches.filter((m) => m.type === "name"), text).toHaveLength(0);
      }
    });

    it("does NOT flag anatomy after presentation verbs", () => {
      const matches = detectPii("Se presenta derrame pleural bilateral. Acude a Urgencias.");
      expect(matches.filter((m) => m.type === "name")).toHaveLength(0);
    });

    it("still ignores medical eponyms", () => {
      const matches = detectPii("Paciente con signo de Murphy positivo. Fractura de Smith derecha.");
      expect(matches.filter((m) => m.type === "name")).toHaveLength(0);
    });
  });

  // ── Accent-insensitive dictionary lookups ──
  describe("accent-insensitive matching", () => {
    it("detects accented name written without accents", () => {
      const matches = detectPii("Se presenta Adrian Gonzalez para estudio.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("does not flag unaccented anatomy as name", () => {
      const matches = detectPii("Torax y abdomen sin alteraciones. Higado normal.");
      expect(matches.filter((m) => m.type === "name")).toHaveLength(0);
    });
  });

  describe("hasPii", () => {
    it("returns true when PII exists", () => {
      expect(hasPii("Email: test@example.com")).toBe(true);
    });

    it("returns false for clean radiology text", () => {
      expect(hasPii("Hígado de ecoestructura homogénea, tamaño normal.")).toBe(false);
    });
  });
});
