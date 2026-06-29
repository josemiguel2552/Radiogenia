import { describe, it, expect } from "vitest";
import { detectDiagnoses, hasDiagnosticLanguage, summarizeDiagnoses } from "../diagnosis-detect";

describe("detectDiagnoses", () => {
  describe("interpretation phrases", () => {
    it("flags 'compatible con'", () => {
      const m = detectDiagnoses("Consolidación basal derecha, compatible con neumonía.");
      expect(m.some((x) => x.type === "interpretation")).toBe(true);
    });

    it("flags 'sugestivo de'", () => {
      const m = detectDiagnoses("Lesión hepática sugestiva de hemangioma.");
      expect(m.some((x) => x.type === "interpretation")).toBe(true);
    });

    it("flags 'suggestive of' (English)", () => {
      const m = detectDiagnoses("Right lower lobe consolidation suggestive of pneumonia.");
      expect(m.some((x) => x.type === "interpretation")).toBe(true);
    });

    it("flags 'secundario a' / 'secondary to'", () => {
      expect(hasDiagnosticLanguage("Atelectasia secundaria a derrame.")).toBe(true);
      expect(hasDiagnosticLanguage("Atelectasis secondary to effusion.")).toBe(true);
    });

    it("does NOT flag the non-specific hedge 'de aspecto inespecífico'", () => {
      const m = detectDiagnoses("Nódulo tiroideo de aspecto inespecífico.");
      expect(m).toHaveLength(0);
    });
  });

  describe("recommendation phrases", () => {
    it("flags 'se recomienda'", () => {
      const m = detectDiagnoses("Nódulo pulmonar de 8 mm. Se recomienda control en 3 meses.");
      expect(m.some((x) => x.type === "recommendation")).toBe(true);
    });

    it("flags 'clinical correlation'", () => {
      const m = detectDiagnoses("Indeterminate lesion. Clinical correlation recommended.");
      expect(m.some((x) => x.type === "recommendation")).toBe(true);
    });
  });

  describe("scale classifications", () => {
    it("flags BI-RADS", () => {
      const m = detectDiagnoses("Nódulo espiculado, BI-RADS 4.");
      expect(m.some((x) => x.type === "scale")).toBe(true);
    });

    it("flags TNM and Bosniak", () => {
      expect(hasDiagnosticLanguage("Estadio TNM: T2N0M0.")).toBe(true);
      expect(hasDiagnosticLanguage("Quiste renal Bosniak II.")).toBe(true);
    });
  });

  describe("disease names with findings allowlist", () => {
    it("flags a disease name NOT present in the dictated findings", () => {
      const m = detectDiagnoses("Neumonía basal derecha.", "Consolidación en lóbulo inferior derecho con broncograma aéreo.");
      expect(m.some((x) => x.type === "diagnosis")).toBe(true);
    });

    it("does NOT flag a disease name the radiologist actually dictated", () => {
      const m = detectDiagnoses("Neumonía basal derecha.", "Neumonía del lóbulo inferior derecho.");
      expect(m.filter((x) => x.type === "diagnosis")).toHaveLength(0);
    });

    it("allows inflected forms when the stem was dictated (metástasis → metastásico)", () => {
      const m = detectDiagnoses("Aspecto metastásico de la lesión.", "Lesiones compatibles con metástasis hepáticas.");
      expect(m.filter((x) => x.type === "diagnosis")).toHaveLength(0);
    });

    it("flags 'malignidad' when not dictated", () => {
      const m = detectDiagnoses("Hallazgos sospechosos de malignidad.", "Masa de 4 cm en LSD.");
      expect(m.length).toBeGreaterThan(0);
    });
  });

  describe("no false positives on clean descriptive conclusions", () => {
    it("clean Spanish conclusion produces no flags", () => {
      const text = [
        "1. Aumento de tamaño de la lesión hepática del segmento VII (de 2 a 3.5 cm respecto al previo).",
        "2. Nuevo nódulo suprarrenal izquierdo de 18 mm con densidad de 20 UH.",
        "3. Pequeño derrame pleural derecho.",
      ].join("\n");
      expect(detectDiagnoses(text, "")).toHaveLength(0);
    });

    it("clean English conclusion produces no flags", () => {
      const text = [
        "1. Interval increase of the segment VII hepatic lesion (from 2 to 3.5 cm).",
        "2. New 25 mm hypodense focal hepatic lesion in segment VI.",
        "3. Right lower lobe consolidation with air bronchograms.",
      ].join("\n");
      expect(detectDiagnoses(text, "")).toHaveLength(0);
    });
  });

  describe("summarizeDiagnoses", () => {
    it("returns unique flagged terms", () => {
      const terms = summarizeDiagnoses("Compatible con neumonía. Se recomienda control en 3 meses. BI-RADS 4.");
      expect(terms.length).toBeGreaterThanOrEqual(3);
    });
  });
});
