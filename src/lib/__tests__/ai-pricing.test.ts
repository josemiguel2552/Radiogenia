import { describe, it, expect } from "vitest";
import { getModelPricing, calculateCost, calculateAudioCost } from "@/lib/ai-pricing";

describe("getModelPricing", () => {
  it("returns pricing for known model", () => {
    const pricing = getModelPricing("gpt-4o-mini");
    expect(pricing.inputPer1M).toBe(0.15);
    expect(pricing.outputPer1M).toBe(0.60);
  });

  it("falls back to gpt-4o-mini for unknown model", () => {
    const pricing = getModelPricing("unknown-model");
    expect(pricing.inputPer1M).toBe(0.15);
  });
});

describe("calculateCost", () => {
  it("calculates cost correctly", () => {
    const cost = calculateCost("gpt-4o-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.75);
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost("gpt-4o-mini", 0, 0)).toBe(0);
  });

  it("handles small token counts", () => {
    const cost = calculateCost("gpt-4o-mini", 1000, 500);
    expect(cost).toBeCloseTo(0.00045);
  });
});

describe("calculateAudioCost", () => {
  it("calculates whisper cost per minute", () => {
    const cost = calculateAudioCost("whisper-1", 60);
    expect(cost).toBeCloseTo(0.006);
  });

  it("calculates deepgram cost", () => {
    const cost = calculateAudioCost("deepgram-nova-2", 120);
    expect(cost).toBeCloseTo(0.0086);
  });

  it("falls back to whisper pricing for unknown model", () => {
    const cost = calculateAudioCost("unknown", 60);
    expect(cost).toBeCloseTo(0.006);
  });
});
