import { describe, it, expect } from "vitest";
import { tokenize, splitSentences, reconcileFindings } from "../training-preprocess";

describe("tokenize", () => {
  it("lowercases and removes punctuation", () => {
    const result = tokenize("Hígado de tamaño normal, sin lesiones focales.");
    expect(result).toContain("hígado");
    expect(result).toContain("tamaño");
    expect(result).toContain("normal");
    expect(result).toContain("lesiones");
    expect(result).toContain("focales");
  });

  it("removes stop words", () => {
    const result = tokenize("El hígado es de tamaño normal y no presenta lesiones");
    expect(result).not.toContain("el");
    expect(result).not.toContain("de");
    expect(result).not.toContain("es");
    expect(result).not.toContain("no");
  });

  it("removes short words (<=2 chars)", () => {
    const result = tokenize("TC de abdomen con IV");
    expect(result).not.toContain("tc");
    expect(result).not.toContain("iv");
  });
});

describe("splitSentences", () => {
  it("splits on period followed by space", () => {
    const result = splitSentences("Hígado normal. Bazo normal. Riñones sin alteraciones.");
    expect(result).toHaveLength(3);
  });

  it("splits on newlines", () => {
    const result = splitSentences("Hígado normal\nBazo aumentado de tamaño");
    expect(result).toHaveLength(2);
  });

  it("filters very short fragments", () => {
    const result = splitSentences("OK. Hígado normal. No.");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Hígado normal.");
  });
});

describe("reconcileFindings", () => {
  it("returns findings unchanged when conclusion content is all in findings", () => {
    const findings = "Hígado de tamaño normal sin lesiones focales. Vía biliar no dilatada. Bazo homogéneo.";
    const conclusion = "Hígado normal sin lesiones. Bazo homogéneo.";
    const result = reconcileFindings(findings, conclusion);
    expect(result).toBe(findings);
  });

  it("appends missing content from conclusion to findings", () => {
    const findings = "Hígado de tamaño normal sin lesiones focales.";
    const conclusion = "Hígado normal. Adenopatías retroperitoneales múltiples sospechosas de malignidad.";
    const result = reconcileFindings(findings, conclusion);
    expect(result).toContain("Hígado de tamaño normal sin lesiones focales.");
    expect(result).toContain("Adenopatías retroperitoneales múltiples sospechosas de malignidad.");
  });

  it("does not duplicate content that already has high overlap", () => {
    const findings = "Lesión hipodensa de 3cm en segmento VI hepático. Bazo normal.";
    const conclusion = "Lesión hipodensa hepática en segmento VI de 3cm.";
    const result = reconcileFindings(findings, conclusion);
    expect(result).toBe(findings);
  });

  it("handles empty conclusion gracefully", () => {
    const findings = "Hígado normal.";
    const result = reconcileFindings(findings, "");
    expect(result).toBe(findings);
  });

  it("handles English text", () => {
    const findings = "Liver is normal in size and echogenicity.";
    const conclusion = "Normal liver. Incidental left renal cyst measuring 2cm.";
    const result = reconcileFindings(findings, conclusion);
    expect(result).toContain("renal cyst");
  });
});
