import { describe, it, expect } from "vitest";
import {
  enforcePeriodSeparation,
  enforceOutputLanguage,
  translateSectionLabel,
  translateTemplate,
  translateLabelInLine,
} from "../section-translate";

describe("enforcePeriodSeparation", () => {
  it("converts semicolons to periods in section descriptions", () => {
    const input = "Hígado: Lesión hipodensa en segmento VI; quiste en segmento III.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe("Hígado: Lesión hipodensa en segmento VI. quiste en segmento III.");
  });

  it("converts commas before uppercase letters to periods", () => {
    const input = "Hígado: Lesión hipodensa de 15 mm en segmento VI, Quiste simple de 8 mm en segmento III.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe("Hígado: Lesión hipodensa de 15 mm en segmento VI. Quiste simple de 8 mm en segmento III.");
  });

  it("preserves commas before lowercase (normal enumeration)", () => {
    const input = "Riñones: De tamaño, morfología y densidad normales.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe("Riñones: De tamaño, morfología y densidad normales.");
  });

  it("handles accented uppercase letters after comma", () => {
    const input = "Tórax: Derrame pleural bilateral, Ángulos costofrénicos obliterados.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe("Tórax: Derrame pleural bilateral. Ángulos costofrénicos obliterados.");
  });

  it("cleans up double periods", () => {
    const input = "Hígado: Normal.; Bazo normal.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe("Hígado: Normal. Bazo normal.");
  });

  it("ignores lines without colon prefix", () => {
    const input = "This is a plain line with no section label.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe(input);
  });

  it("handles empty input", () => {
    expect(enforcePeriodSeparation("")).toBe("");
  });

  it("handles multiline input", () => {
    const input = "Hígado: Normal; sin lesiones.\nBazo: Homogéneo; tamaño normal.";
    const result = enforcePeriodSeparation(input);
    expect(result).toBe("Hígado: Normal. sin lesiones.\nBazo: Homogéneo. tamaño normal.");
  });
});

describe("translateSectionLabel", () => {
  it("translates known labels to Spanish", () => {
    expect(translateSectionLabel("Liver", "es")).toBe("Hígado");
    expect(translateSectionLabel("Kidneys", "es")).toBe("Riñones");
    expect(translateSectionLabel("Brain parenchyma", "es")).toBe("Parénquima cerebral");
  });

  it("translates known labels to Portuguese", () => {
    expect(translateSectionLabel("Liver", "pt")).toBe("Fígado");
    expect(translateSectionLabel("Kidneys", "pt")).toBe("Rins");
  });

  it("returns original for English", () => {
    expect(translateSectionLabel("Liver", "en")).toBe("Liver");
  });

  it("returns original for unknown labels", () => {
    expect(translateSectionLabel("Unknown Label XYZ", "es")).toBe("Unknown Label XYZ");
    expect(translateSectionLabel("Unknown Label XYZ", "pt")).toBe("Unknown Label XYZ");
  });
});

describe("translateTemplate", () => {
  it("translates section labels wrapped in stars", () => {
    const template = "***Liver***\n{Liver}\n***Kidneys***\n{Kidneys}";
    const result = translateTemplate(template, "es");
    expect(result).toContain("***Hígado***");
    expect(result).toContain("***Riñones***");
  });

  it("handles double-star labels", () => {
    const template = "**Liver**\n{Liver}";
    const result = translateTemplate(template, "es");
    expect(result).toContain("**Hígado**");
  });

  it("returns original for English", () => {
    const template = "***Liver***\n{Liver}";
    expect(translateTemplate(template, "en")).toBe(template);
  });

  it("leaves unknown labels unchanged", () => {
    const template = "***Custom Section***\n{Custom Section}";
    const result = translateTemplate(template, "es");
    expect(result).toContain("***Custom Section***");
  });

  it("handles empty template", () => {
    expect(translateTemplate("", "es")).toBe("");
  });
});

describe("translateLabelInLine", () => {
  it("translates section label at start of line", () => {
    const line = "Liver: Normal in size and morphology.";
    const result = translateLabelInLine(line, "es");
    expect(result).toBe("Hígado: Normal in size and morphology.");
  });

  it("returns original for English", () => {
    const line = "Liver: Normal.";
    expect(translateLabelInLine(line, "en")).toBe(line);
  });

  it("returns original if no colon prefix", () => {
    const line = "No colon here";
    expect(translateLabelInLine(line, "es")).toBe(line);
  });

  it("leaves unknown labels unchanged", () => {
    const line = "Unknown Section: Some text.";
    expect(translateLabelInLine(line, "es")).toBe(line);
  });
});

describe("enforceOutputLanguage", () => {
  it("translates section labels and normality phrases for Spanish", () => {
    const text = "Liver: Normal in size and morphology.";
    const result = enforceOutputLanguage(text, "es");
    expect(result).toContain("Hígado:");
    expect(result).toContain("De tamaño y morfología normales");
  });

  it("translates section labels for Portuguese", () => {
    const text = "Liver: Normal in size and morphology.";
    const result = enforceOutputLanguage(text, "pt");
    expect(result).toContain("Fígado:");
    expect(result).toContain("De tamanho e morfologia normais");
  });

  it("returns original for English", () => {
    const text = "Liver: Normal in size and morphology.";
    expect(enforceOutputLanguage(text, "en")).toBe(text);
  });

  it("handles empty input", () => {
    expect(enforceOutputLanguage("", "es")).toBe("");
  });

  it("applies period separation for non-English", () => {
    const text = "Hígado: Lesión de 10 mm; quiste de 5 mm.";
    const result = enforceOutputLanguage(text, "es");
    expect(result).not.toContain(";");
    expect(result).toContain(". ");
  });

  it("translates multiple normality phrases", () => {
    const text = "Kidneys: Normal in size and morphology bilaterally.\nBladder: Normal distension and wall thickness.";
    const result = enforceOutputLanguage(text, "es");
    expect(result).toContain("Riñones:");
    expect(result).toContain("bilateralmente");
    expect(result).toContain("Vejiga:");
    expect(result).toContain("Distensión y grosor parietal normales");
  });
});
