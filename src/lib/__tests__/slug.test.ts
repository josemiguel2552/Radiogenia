import { describe, it, expect } from "vitest";
import { toSlug } from "@/lib/slug";

describe("toSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(toSlug("My Section")).toBe("my-section");
  });

  it("preserves Spanish characters", () => {
    expect(toSlug("Radiología Abdominal")).toBe("radiología-abdominal");
  });

  it("removes special characters", () => {
    expect(toSlug("Test & Section!")).toBe("test--section");
  });

  it("trims whitespace", () => {
    expect(toSlug("  padded  ")).toBe("padded");
  });

  it("handles empty string", () => {
    expect(toSlug("")).toBe("");
  });

  it("collapses multiple spaces into single hyphen", () => {
    expect(toSlug("a   b")).toBe("a-b");
  });
});
