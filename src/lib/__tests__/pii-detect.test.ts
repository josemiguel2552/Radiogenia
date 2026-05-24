import { describe, it, expect } from "vitest";
import { detectPii, hasPii } from "../pii-detect";

describe("detectPii", () => {
  describe("DNI detection", () => {
    it("detects valid Spanish DNI", () => {
      const matches = detectPii("Paciente con DNI 12345678Z presenta dolor.");
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe("dni");
      expect(matches[0].value).toBe("12345678Z");
    });

    it("ignores measurements that look like DNI", () => {
      const matches = detectPii("Nódulo de 12345678mm en lóbulo hepático.");
      const dniMatches = matches.filter((m) => m.type === "dni");
      expect(dniMatches).toHaveLength(0);
    });
  });

  describe("email detection", () => {
    it("detects email addresses", () => {
      const matches = detectPii("Contactar a doctor@hospital.com para seguimiento.");
      expect(matches.some((m) => m.type === "email")).toBe(true);
    });
  });

  describe("phone detection", () => {
    it("detects Spanish phone with prefix", () => {
      const matches = detectPii("Llamar al +34 612 345 678 para cita.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects 9-digit Spanish mobile", () => {
      const matches = detectPii("Teléfono: 612 345 678.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });
  });

  describe("false positive avoidance", () => {
    it("ignores dates", () => {
      const matches = detectPii("Estudio realizado el 15/03/2024.");
      expect(matches).toHaveLength(0);
    });

    it("ignores medical measurements", () => {
      const text = "Nódulo de 15 mm en segmento IV. Densidad 45 HU.";
      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });
  });

  describe("hasPii", () => {
    it("returns true when PII exists", () => {
      expect(hasPii("Email: test@example.com")).toBe(true);
    });

    it("returns false for clean radiology text", () => {
      expect(hasPii("Hígado de ecoestructura homogénea, tamaño normal.")).toBe(false);
    });
  });
});
