import { describe, it, expect } from "vitest";
import { parseTemplateSections, serializeTemplateSections, nextFieldId } from "@/components/shared/template-section-editor";

describe("nextFieldId", () => {
  it("returns unique IDs", () => {
    const a = nextFieldId();
    const b = nextFieldId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^f_\d+_\d+$/);
  });
});

describe("parseTemplateSections", () => {
  it("parses top-level fields", () => {
    const raw = "****FINDINGS****\n**Liver**: {liver}\n**Kidneys**: {kidneys}\n\n****CONCLUSION****\n{conclusion}";
    const fields = parseTemplateSections(raw);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe("Liver");
    expect(fields[0].indent).toBe(0);
    expect(fields[1].label).toBe("Kidneys");
  });

  it("parses indented child fields", () => {
    const raw = "****FINDINGS****\n**Brain**:\n   **Gray matter**: {gray matter}\n   **White matter**: {white matter}\n\n****CONCLUSION****\n{conclusion}";
    const fields = parseTemplateSections(raw);
    expect(fields).toHaveLength(3);
    expect(fields[0].label).toBe("Brain");
    expect(fields[0].indent).toBe(0);
    expect(fields[1].label).toBe("Gray matter");
    expect(fields[1].indent).toBe(1);
    expect(fields[2].label).toBe("White matter");
    expect(fields[2].indent).toBe(1);
  });

  it("parses triple-star groups", () => {
    const raw = "****FINDINGS****\n***Thorax***\n**Lung**: {lung}\n\n****CONCLUSION****\n{conclusion}";
    const fields = parseTemplateSections(raw);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe("Thorax");
    expect(fields[0].indent).toBe(0);
  });

  it("returns empty for empty input", () => {
    expect(parseTemplateSections("")).toHaveLength(0);
  });

  it("strips FINDINGS/CONCLUSION markers", () => {
    const raw = "****FINDINGS****\n**Field**: {field}\n\n****CONCLUSION****\n{conclusion}";
    const fields = parseTemplateSections(raw);
    expect(fields.every((f) => !f.label.includes("FINDINGS"))).toBe(true);
    expect(fields.every((f) => !f.label.includes("CONCLUSION"))).toBe(true);
  });
});

describe("serializeTemplateSections", () => {
  it("serializes top-level fields with placeholders", () => {
    const fields = [
      { id: "1", label: "Liver", indent: 0 },
      { id: "2", label: "Kidneys", indent: 0 },
    ];
    const result = serializeTemplateSections(fields);
    expect(result).toContain("****FINDINGS****");
    expect(result).toContain("**Liver**: {liver}");
    expect(result).toContain("**Kidneys**: {kidneys}");
    expect(result).toContain("****CONCLUSION****\n{conclusion}");
  });

  it("serializes parent-child groups", () => {
    const fields = [
      { id: "1", label: "Brain", indent: 0 },
      { id: "2", label: "Gray matter", indent: 1 },
      { id: "3", label: "White matter", indent: 1 },
    ];
    const result = serializeTemplateSections(fields);
    expect(result).toContain("**Brain**:");
    expect(result).toContain("   **Gray matter**: {gray matter}");
    expect(result).toContain("   **White matter**: {white matter}");
  });

  it("skips empty labels", () => {
    const fields = [
      { id: "1", label: "Liver", indent: 0 },
      { id: "2", label: "  ", indent: 0 },
      { id: "3", label: "Kidneys", indent: 0 },
    ];
    const result = serializeTemplateSections(fields);
    expect(result).toContain("**Liver**");
    expect(result).toContain("**Kidneys**");
    expect(result).not.toContain("**  **");
  });

  it("roundtrips correctly", () => {
    const original = [
      { id: "1", label: "Heart", indent: 0 },
      { id: "2", label: "Chambers", indent: 1 },
      { id: "3", label: "Valves", indent: 1 },
      { id: "4", label: "Lungs", indent: 0 },
    ];
    const serialized = serializeTemplateSections(original);
    const parsed = parseTemplateSections(serialized);
    expect(parsed).toHaveLength(4);
    expect(parsed[0].label).toBe("Heart");
    expect(parsed[0].indent).toBe(0);
    expect(parsed[1].label).toBe("Chambers");
    expect(parsed[1].indent).toBe(1);
    expect(parsed[2].label).toBe("Valves");
    expect(parsed[2].indent).toBe(1);
    expect(parsed[3].label).toBe("Lungs");
    expect(parsed[3].indent).toBe(0);
  });
});
