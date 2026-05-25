import { describe, it, expect } from "vitest";
import { getDefaultPhrase, getDefaultsForModality, getAllDefaults } from "../normality-defaults";

describe("getDefaultPhrase", () => {
  it("returns English defaults by default", () => {
    const phrase = getDefaultPhrase("CT", "Liver");
    expect(phrase).toContain("Normal in size");
  });

  it("returns Spanish defaults when lang is es", () => {
    const phrase = getDefaultPhrase("CT", "Liver", "es");
    expect(phrase.toLowerCase()).toContain("tamaño");
  });

  it("returns modality generic for unknown sections in English", () => {
    const phrase = getDefaultPhrase("CT", "Unknown Section XYZ");
    expect(phrase).toBe("No significant abnormalities.");
  });

  it("returns modality generic for unknown sections in Spanish", () => {
    const phrase = getDefaultPhrase("CT", "Unknown Section XYZ", "es");
    expect(phrase).toBe("Sin alteraciones significativas.");
  });

  it("returns fallback for unknown modality", () => {
    const phrase = getDefaultPhrase("UnknownModality", "Liver");
    expect(phrase).toBe("No significant abnormalities.");
  });

  it("has specific phrases for major CT sections", () => {
    const liver = getDefaultPhrase("CT", "Liver");
    const spleen = getDefaultPhrase("CT", "Spleen");
    const kidneys = getDefaultPhrase("CT", "Kidneys");
    expect(liver).not.toBe(spleen);
    expect(liver).not.toBe(kidneys);
  });

  it("has specific phrases for MRI sections", () => {
    const brain = getDefaultPhrase("MRI", "Brain parenchyma");
    expect(brain).toBeTruthy();
    expect(brain.length).toBeGreaterThan(10);
  });
});

describe("getDefaultsForModality", () => {
  it("returns defaults for CT", () => {
    const defaults = getDefaultsForModality("CT");
    expect(defaults.length).toBeGreaterThan(5);
    expect(defaults.every((d) => d.modality === "CT")).toBe(true);
  });

  it("returns defaults for MRI", () => {
    const defaults = getDefaultsForModality("MRI");
    expect(defaults.length).toBeGreaterThan(5);
    expect(defaults.every((d) => d.modality === "MRI")).toBe(true);
  });

  it("returns Spanish defaults when lang is es", () => {
    const defaults = getDefaultsForModality("CT", "es");
    expect(defaults.length).toBeGreaterThan(5);
    const liver = defaults.find((d) => d.section_label === "Liver");
    if (liver) {
      expect(liver.phrase.toLowerCase()).toContain("tamaño");
    }
  });

  it("returns empty array for unknown modality", () => {
    const defaults = getDefaultsForModality("UnknownModality");
    expect(defaults).toEqual([]);
  });
});

describe("getAllDefaults", () => {
  it("returns defaults for all modalities", () => {
    const all = getAllDefaults();
    expect(all.length).toBeGreaterThan(20);
    const modalities = new Set(all.map((d) => d.modality));
    expect(modalities.has("CT")).toBe(true);
    expect(modalities.has("MRI")).toBe(true);
  });

  it("each default has required fields", () => {
    const all = getAllDefaults();
    for (const d of all) {
      expect(d.modality).toBeTruthy();
      expect(d.section_label).toBeTruthy();
      expect(d.phrase).toBeTruthy();
    }
  });
});
