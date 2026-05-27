import { describe, it, expect } from "vitest";
import { splitSections, extractConclusionStyle } from "@/lib/style-learning";

describe("splitSections", () => {
  it("parses label:body sections", () => {
    const text = "Liver: Normal size and echogenicity\nKidneys: Normal bilateral";
    const sections = splitSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].label).toBe("Liver");
    expect(sections[0].body).toBe("Normal size and echogenicity");
    expect(sections[1].label).toBe("Kidneys");
  });

  it("handles multiline body text", () => {
    const text = "Liver: Normal size.\nNo focal lesions identified.\n\nKidneys: Normal";
    const sections = splitSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].body).toContain("No focal lesions");
  });

  it("returns empty for empty input", () => {
    expect(splitSections("")).toEqual([]);
    expect(splitSections(null as unknown as string)).toEqual([]);
  });

  it("ignores lines with periods in label (not a section header)", () => {
    const text = "Liver: Normal\nThis is a sentence. Not a label: test";
    const sections = splitSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Liver");
  });

  it("limits label to 6 words", () => {
    const text = "This is a very long label that exceeds: value\nLiver: Normal";
    const sections = splitSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Liver");
  });
});

describe("extractConclusionStyle", () => {
  it("returns conclusion text for valid input", () => {
    const result = extractConclusionStyle("Normal study. No acute abnormalities.");
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Normal study");
  });

  it("returns empty for short text", () => {
    expect(extractConclusionStyle("Normal")).toEqual([]);
    expect(extractConclusionStyle("")).toEqual([]);
  });

  it("truncates to 800 chars", () => {
    const longText = "A".repeat(1000);
    const result = extractConclusionStyle(longText);
    expect(result[0].length).toBe(800);
  });
});
