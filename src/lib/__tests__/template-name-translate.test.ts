import { describe, it, expect } from "vitest";
import { translateTemplateName } from "../i18n";

describe("translateTemplateName", () => {
  describe("static dictionary (predefined templates)", () => {
    it("translates Spanish template names to English", () => {
      expect(translateTemplateName("TC de cráneo", "en")).toBe("Head CT scan");
      expect(translateTemplateName("RM cerebral", "en")).toBe("Brain MRI");
      expect(translateTemplateName("Ecografía de abdomen", "en")).toBe("Abdominal ultrasound");
    });

    it("translates Spanish template names to Portuguese", () => {
      expect(translateTemplateName("TC de cráneo", "pt")).toBe("TC de crânio");
      expect(translateTemplateName("RM cerebral", "pt")).toBe("RM cerebral");
    });

    it("returns Spanish names as-is for Spanish", () => {
      expect(translateTemplateName("TC de cráneo", "es")).toBe("TC de cráneo");
    });
  });

  describe("reverse lookup (English → Spanish)", () => {
    it("translates known English template names to Spanish", () => {
      expect(translateTemplateName("Head CT scan", "es")).toBe("TC de cráneo");
      expect(translateTemplateName("Brain MRI", "es")).toBe("RM cerebral");
      expect(translateTemplateName("Abdominal ultrasound", "es")).toBe("Ecografía de abdomen");
    });

    it("translates English template names to Portuguese", () => {
      expect(translateTemplateName("Head CT scan", "pt")).toBe("TC de crânio");
      expect(translateTemplateName("Chest CT scan", "pt")).toBe("TC de tórax");
    });

    it("is case-insensitive", () => {
      expect(translateTemplateName("head ct scan", "es")).toBe("TC de cráneo");
      expect(translateTemplateName("HEAD CT SCAN", "es")).toBe("TC de cráneo");
      expect(translateTemplateName("BRAIN MRI", "es")).toBe("RM cerebral");
    });
  });

  describe("standalone medical terms", () => {
    it("translates 'polytrauma' to Spanish", () => {
      expect(translateTemplateName("polytrauma", "es")).toBe("Politraumatismo");
    });

    it("translates 'polytrauma' to Portuguese", () => {
      expect(translateTemplateName("polytrauma", "pt")).toBe("Politraumatismo");
    });

    it("translates 'Politraumatismo' to English", () => {
      expect(translateTemplateName("Politraumatismo", "en")).toBe("Polytrauma");
    });

    it("translates 'mammography' to Spanish", () => {
      expect(translateTemplateName("mammography", "es")).toBe("Mamografía");
    });

    it("translates 'Mamografía' to English", () => {
      expect(translateTemplateName("Mamografía", "en")).toBe("Mammography");
    });

    it("translates procedure terms", () => {
      expect(translateTemplateName("biopsy", "es")).toBe("Biopsia");
      expect(translateTemplateName("drainage", "es")).toBe("Drenaje");
      expect(translateTemplateName("cystography", "es")).toBe("Cistografía");
    });
  });

  describe("multi-word auto-translation", () => {
    it("translates compound names word-by-word", () => {
      const result = translateTemplateName("CT polytrauma", "es");
      expect(result.toLowerCase()).toContain("tc");
      expect(result.toLowerCase()).toContain("politraumatismo");
    });

    it("translates multi-word medical terms as phrases", () => {
      expect(translateTemplateName("stroke code", "es")).toBe("Código ictus");
      expect(translateTemplateName("soft tissue", "es")).toBe("Partes blandas");
      expect(translateTemplateName("brachial plexus", "es")).toBe("Plexo braquial");
    });

    it("translates 'código ictus' to English", () => {
      expect(translateTemplateName("código ictus", "en")).toBe("Stroke code");
    });
  });

  describe("fallback for unknown names", () => {
    it("returns original name if no translation found", () => {
      expect(translateTemplateName("My custom template", "es")).toBe("My custom template");
      expect(translateTemplateName("Protocol XYZ", "en")).toBe("Protocol XYZ");
    });

    it("returns original for empty string", () => {
      expect(translateTemplateName("", "es")).toBe("");
    });
  });

  describe("modality abbreviations", () => {
    it("translates CT to TC for Spanish", () => {
      expect(translateTemplateName("ct", "es")).toBe("TC");
    });

    it("translates MRI to RM for Spanish", () => {
      expect(translateTemplateName("mri", "es")).toBe("RM");
    });

    it("translates TC to CT for English", () => {
      expect(translateTemplateName("tc", "en")).toBe("CT");
    });
  });
});
