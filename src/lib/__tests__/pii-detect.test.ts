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

    it("detects DNI with dots", () => {
      const matches = detectPii("DNI 12.345.678Z adjunto.");
      expect(matches.some((m) => m.type === "dni")).toBe(true);
    });

    it("ignores measurements that look like DNI", () => {
      const matches = detectPii("Nódulo de 12345678mm en lóbulo hepático.");
      const dniMatches = matches.filter((m) => m.type === "dni");
      expect(dniMatches).toHaveLength(0);
    });

    it("ignores invalid check letter", () => {
      const matches = detectPii("Código 12345678A no válido.");
      const dniMatches = matches.filter((m) => m.type === "dni");
      expect(dniMatches).toHaveLength(0);
    });
  });

  describe("NIE detection", () => {
    it("detects valid NIE", () => {
      const matches = detectPii("NIE X0000000T del paciente.");
      expect(matches.some((m) => m.type === "nie")).toBe(true);
    });
  });

  describe("CURP detection (Mexico)", () => {
    it("detects valid CURP", () => {
      const matches = detectPii("CURP del paciente: GARC850101HDFRRL09");
      expect(matches.some((m) => m.type === "curp")).toBe(true);
      expect(matches.find((m) => m.type === "curp")!.value).toBe("GARC850101HDFRRL09");
    });

    it("ignores invalid CURP (bad month)", () => {
      const matches = detectPii("Código GARC851301HDFRRL09 no válido.");
      expect(matches.filter((m) => m.type === "curp")).toHaveLength(0);
    });
  });

  describe("CPF detection (Brazil)", () => {
    it("detects formatted CPF", () => {
      // Valid CPF: 529.982.247-25
      const matches = detectPii("CPF do paciente: 529.982.247-25");
      expect(matches.some((m) => m.type === "cpf")).toBe(true);
    });

    it("rejects all-same-digit CPF", () => {
      const matches = detectPii("Número 111.111.111-11 inválido.");
      expect(matches.filter((m) => m.type === "cpf")).toHaveLength(0);
    });
  });

  describe("RUT detection (Chile)", () => {
    it("detects formatted RUT", () => {
      // 12.345.678-5 — validate: sum = 8*2+7*3+6*4+5*5+4*6+3*7+2*2+1*3 = 16+21+24+25+24+21+4+3 = 138; 138%11=6; 11-6=5 → check=5
      const matches = detectPii("RUT del paciente: 12.345.678-5");
      expect(matches.some((m) => m.type === "rut")).toBe(true);
    });

    it("detects RUT without dots", () => {
      const matches = detectPii("RUT: 12345678-5 adjunto.");
      expect(matches.some((m) => m.type === "rut")).toBe(true);
    });
  });

  describe("Cédula detection (Colombia)", () => {
    it("detects cédula with CC prefix", () => {
      const matches = detectPii("C.C. 1234567890 del paciente.");
      expect(matches.some((m) => m.type === "cedula")).toBe(true);
    });

    it("detects cédula with keyword", () => {
      const matches = detectPii("Cédula: 80123456 registrada.");
      expect(matches.some((m) => m.type === "cedula")).toBe(true);
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

    it("detects Mexican phone", () => {
      const matches = detectPii("Tel: +52 55 1234 5678 del paciente.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects Colombian phone", () => {
      const matches = detectPii("Contacto: +57 310 123 4567.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });

    it("detects Brazilian phone", () => {
      const matches = detectPii("Fone: +55 11 98765 4321.");
      expect(matches.some((m) => m.type === "phone")).toBe(true);
    });
  });

  describe("NHC / medical record detection", () => {
    it("detects NHC prefix", () => {
      const matches = detectPii("NHC: 123456789 del paciente.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("detects Historia Clínica", () => {
      const matches = detectPii("Historia Clínica: 987654321.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });

    it("detects HC abbreviation", () => {
      const matches = detectPii("HC: 12345/2024 adjunto.");
      expect(matches.some((m) => m.type === "nhc")).toBe(true);
    });
  });

  describe("name detection", () => {
    it("detects full name with known first name", () => {
      const matches = detectPii("Se presenta María García López para estudio.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("detects name with patient prefix", () => {
      const matches = detectPii("Paciente Carlos Rodríguez acude a consulta.");
      expect(matches.some((m) => m.type === "name")).toBe(true);
    });

    it("ignores anatomy terms", () => {
      const matches = detectPii("Arteria Hepática con flujo normal.");
      expect(matches.filter((m) => m.type === "name")).toHaveLength(0);
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

    it("ignores accession numbers", () => {
      const text = "Estudio: 123456789012 realizado hoy.";
      const matches = detectPii(text);
      expect(matches).toHaveLength(0);
    });

    it("ignores typical radiology dictation", () => {
      const text = "Hígado de ecoestructura homogénea, tamaño normal de 15 cm. Vía biliar no dilatada. Vesícula biliar de paredes finas sin litiasis. Bazo homogéneo de 11 cm. Riñones de tamaño y morfología normal, con buena diferenciación córtico-medular. No se observa líquido libre intraperitoneal.";
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
