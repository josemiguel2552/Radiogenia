import { describe, it, expect } from "vitest";
import { computeEditDistance, computeEditRate, computeStructuralCompleteness } from "../pilot-metrics";

describe("computeEditDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(computeEditDistance("hello", "hello")).toBe(0);
  });

  it("returns 0 for both empty", () => {
    expect(computeEditDistance("", "")).toBe(0);
  });

  it("returns target length for empty original", () => {
    expect(computeEditDistance("", "hello")).toBe(5);
  });

  it("returns original length for empty final", () => {
    expect(computeEditDistance("hello", "")).toBe(5);
  });

  it("computes correct edit distance", () => {
    expect(computeEditDistance("kitten", "sitting")).toBe(3);
    expect(computeEditDistance("abc", "abd")).toBe(1);
  });

  it("handles whitespace trimming", () => {
    expect(computeEditDistance("  hello  ", "hello")).toBe(0);
  });

  it("falls back to length difference for large strings", () => {
    const longA = "a".repeat(9000);
    const longB = "b".repeat(9100);
    expect(computeEditDistance(longA, longB)).toBe(100);
  });
});

describe("computeEditRate", () => {
  it("returns 0 for empty original", () => {
    expect(computeEditRate("", "anything")).toBe(0);
  });

  it("returns 0 for identical strings", () => {
    expect(computeEditRate("hello", "hello")).toBe(0);
  });

  it("returns rate capped at 1", () => {
    expect(computeEditRate("a", "completely different")).toBeLessThanOrEqual(1);
  });

  it("calculates correct rate", () => {
    const rate = computeEditRate("abcd", "abce");
    expect(rate).toBe(0.25);
  });
});

describe("computeStructuralCompleteness", () => {
  it("returns zero for template with no sections", () => {
    const result = computeStructuralCompleteness("plain text", "some findings");
    expect(result).toEqual({ total: 0, filled: 0 });
  });

  it("counts filled sections", () => {
    const template = "***Liver***\n{Liver}\n***Kidneys***\n{Kidneys}";
    const findings = "Liver: Normal. No focal lesions.\nKidneys: Normal bilaterally.";
    const result = computeStructuralCompleteness(template, findings);
    expect(result.total).toBe(2);
    expect(result.filled).toBe(2);
  });

  it("identifies unfilled sections", () => {
    const template = "***Liver***\n{Liver}\n***Spleen***\n{Spleen}";
    const findings = "Liver: Normal appearance.";
    const result = computeStructuralCompleteness(template, findings);
    expect(result.total).toBe(2);
    expect(result.filled).toBe(1);
  });

  it("handles sections with only whitespace/punctuation as unfilled", () => {
    const template = "***Liver***\n{Liver}";
    const findings = "Liver: ...";
    const result = computeStructuralCompleteness(template, findings);
    expect(result.filled).toBe(0);
  });
});
