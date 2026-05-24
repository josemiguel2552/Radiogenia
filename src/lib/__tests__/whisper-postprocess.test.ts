import { describe, it, expect } from "vitest";
import { postprocessWhisper } from "../whisper-postprocess";

describe("postprocessWhisper", () => {
  it("removes peritoneal line artifacts", () => {
    const result = postprocessWhisper("Hígado normal peritoneal line siguiente hallazgo.");
    expect(result).not.toContain("peritoneal line");
  });

  it("removes Whisper hallucination endings", () => {
    const result = postprocessWhisper("Riñones normales. Thank you.");
    expect(result).not.toContain("Thank you");
    expect(result).toContain("Riñones normales");
  });

  it("collapses multiple periods", () => {
    const result = postprocessWhisper("Hallazgo uno.... Hallazgo dos.");
    expect(result).not.toContain("....");
  });

  it("removes repeated character artifacts", () => {
    const result = postprocessWhisper("Texto válido *****");
    expect(result).not.toContain("*****");
  });

  it("returns empty string for pure hallucination", () => {
    const result = postprocessWhisper("thank thank thank thank thank thank");
    expect(result).toBe("");
  });

  it("fixes space before punctuation", () => {
    const result = postprocessWhisper("Riñón derecho normal ,sin alteraciones .");
    expect(result).toContain("normal,");
    expect(result).not.toContain(" ,");
  });

  it("adds space after punctuation before words", () => {
    const result = postprocessWhisper("Normal.Sin alteraciones.");
    expect(result).toContain(". Sin");
  });

  it("preserves valid radiology text unchanged", () => {
    const input = "Hígado de ecoestructura homogénea. Sin lesiones focales.";
    const result = postprocessWhisper(input);
    expect(result).toBe(input);
  });
});
