import { describe, it, expect } from "vitest";

// voice-commands.ts has "use client" at the top but no actual browser deps.
// We can import the function directly since vitest runs in Node.
import { processVoiceCommands } from "../voice-commands";

describe("processVoiceCommands", () => {
  describe("Spanish commands", () => {
    it("converts punto to period", () => {
      expect(processVoiceCommands("Hígado normal punto", "es")).toBe("Hígado normal.");
    });

    it("converts coma to comma", () => {
      expect(processVoiceCommands("grande coma irregular", "es")).toBe("grande, irregular");
    });

    it("converts nueva línea to newline", () => {
      const result = processVoiceCommands("Hallazgo uno nueva línea Hallazgo dos", "es");
      expect(result).toContain("\n");
      expect(result).toContain("Hallazgo uno");
      expect(result).toContain("Hallazgo dos");
    });

    it("converts punto nueva línea together", () => {
      const result = processVoiceCommands("Normal punto nueva línea Siguiente", "es");
      expect(result).toContain("Normal.");
      expect(result).toContain("Siguiente");
    });

    it("converts peritoneal line artifact", () => {
      const result = processVoiceCommands("Riñón normal peritoneal line Bazo", "es");
      expect(result).not.toContain("peritoneal");
      expect(result).toContain("Riñón normal.");
    });

    it("converts nueve línea (common mishearing)", () => {
      const result = processVoiceCommands("Hígado normal nueve línea Bazo normal", "es");
      expect(result).toContain("\n");
    });
  });

  describe("English commands", () => {
    it("converts period to .", () => {
      expect(processVoiceCommands("Normal liver period", "en")).toBe("Normal liver.");
    });

    it("converts comma to ,", () => {
      expect(processVoiceCommands("large comma irregular", "en")).toBe("large, irregular");
    });

    it("converts new line to newline", () => {
      const result = processVoiceCommands("Finding one new line Finding two", "en");
      expect(result).toContain("\n");
    });

    it("converts peritoneal line artifact in English too", () => {
      const result = processVoiceCommands("Normal kidney peritoneal line Spleen normal", "en");
      expect(result).not.toContain("peritoneal");
    });
  });

  it("cleans up extra spaces", () => {
    const result = processVoiceCommands("texto  con   espacios", "es");
    expect(result).not.toContain("  ");
  });
});
