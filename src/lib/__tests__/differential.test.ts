import { describe, it, expect } from "vitest";
import {
  buildDifferentialPrompt,
  parseDifferentialResponse,
  radiopaediaSearchUrl,
  isBodyRegion,
  BODY_REGIONS,
  type DifferentialLang,
} from "@/lib/differential";
import { buildVisionBody, providerSupportsVision, isAcceptedImageType } from "@/lib/vision-ai";

const LANGS: DifferentialLang[] = ["es", "en", "pt"];

const base = {
  region: "abdomen" as const,
  regionLabel: "Abdomen",
  imageCount: 1,
  hasRoi: false,
};

describe("the prompt refuses to invent references", () => {
  for (const lang of LANGS) {
    it(`tells the model not to cite articles or URLs (${lang})`, () => {
      const { system } = buildDifferentialPrompt({ ...base, lang });
      // A fabricated citation reads as verification while being the opposite,
      // so the model is told to name the entity and nothing more.
      expect(/NO cites artículos|Do NOT cite articles|NÃO cite artigos/.test(system)).toBe(true);
    });

    it(`asks for exactly 5 and for an observation first (${lang})`, () => {
      const { system } = buildDifferentialPrompt({ ...base, lang });
      expect(/EXACTAMENTE 5|EXACTLY 5|EXATAMENTE 5/.test(system)).toBe(true);
      expect(/DESCRIBE|DESCREVA/.test(system)).toBe(true);
    });

    it(`allows saying the image is not good enough (${lang})`, () => {
      const { system } = buildDifferentialPrompt({ ...base, lang });
      expect(/no da para más|does not support more|não dá para mais/.test(system)).toBe(true);
    });

    it(`forbids recommending treatment (${lang})`, () => {
      const { system } = buildDifferentialPrompt({ ...base, lang });
      expect(/NO recomiendes tratamiento|Do NOT recommend treatment|NÃO recomende tratamento/.test(system)).toBe(true);
    });
  }
});

describe("what the radiologist typed reaches the model", () => {
  it("passes the measured density through", () => {
    const { user } = buildDifferentialPrompt({ ...base, lang: "es", hounsfield: "18 UH" });
    expect(user).toContain("18 UH");
  });

  it("says so explicitly when there is no density, so it is not guessed", () => {
    const { user } = buildDifferentialPrompt({ ...base, lang: "es" });
    expect(user).toContain("No se ha aportado densidad");
  });

  it("points the model at the box when one was drawn", () => {
    const withRoi = buildDifferentialPrompt({ ...base, lang: "es", hasRoi: true }).user;
    const without = buildDifferentialPrompt({ ...base, lang: "es", hasRoi: false }).user;
    expect(withRoi).toContain("recuadro");
    expect(without).not.toContain("recuadro");
  });

  it("carries the region, modality and clinical note", () => {
    const { user } = buildDifferentialPrompt({
      ...base, lang: "es", regionLabel: "Hepatobiliar", modality: "TC", clinicalNote: "Varón 62 años",
    });
    expect(user).toContain("Hepatobiliar");
    expect(user).toContain("TC");
    expect(user).toContain("Varón 62 años");
  });
});

describe("reference links are built, never quoted", () => {
  it("builds a search URL from the entity name", () => {
    expect(radiopaediaSearchUrl("Hepatic adenoma"))
      .toBe("https://radiopaedia.org/search?q=Hepatic%20adenoma&scope=articles");
  });

  it("escapes what would otherwise break the URL", () => {
    const url = radiopaediaSearchUrl("Ménétrier's disease & variants");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&variants");
    expect(url.startsWith("https://radiopaedia.org/search?q=")).toBe(true);
  });

  it("trims stray whitespace from the name", () => {
    expect(radiopaediaSearchUrl("  Angiomyolipoma  ")).toContain("q=Angiomyolipoma&");
  });
});

describe("parsing the model's reply", () => {
  const good = JSON.stringify({
    observation: "Lesión hipodensa de bordes bien definidos.",
    items: [
      { name: "Quiste simple", supporting: "Bordes netos", against: "No se mide densidad", discriminator: "Densidad < 20 UH" },
      { name: "Hemangioma", supporting: "Bien delimitado", against: "Sin realce visible", discriminator: "Realce periférico nodular" },
    ],
    nextStep: "Fase portal.",
  });

  it("reads a clean reply", () => {
    const r = parseDifferentialResponse(good);
    expect(r?.items).toHaveLength(2);
    expect(r?.observation).toContain("hipodensa");
    expect(r?.nextStep).toBe("Fase portal.");
  });

  it("attaches a reference link to every entity", () => {
    const r = parseDifferentialResponse(good);
    for (const item of r!.items) {
      expect(item.radiopaediaUrl).toContain("radiopaedia.org/search");
      expect(item.radiopaediaUrl).toContain(encodeURIComponent(item.name));
    }
  });

  it("survives a markdown fence", () => {
    expect(parseDifferentialResponse("```json\n" + good + "\n```")?.items).toHaveLength(2);
  });

  it("survives a sentence before the JSON", () => {
    expect(parseDifferentialResponse("Aquí tienes el análisis:\n" + good)?.items).toHaveLength(2);
  });

  it("drops entries with no name rather than showing a blank row", () => {
    const partial = JSON.stringify({
      observation: "x",
      items: [{ name: "Quiste simple", supporting: "a" }, { supporting: "sin nombre" }],
      nextStep: "",
    });
    const r = parseDifferentialResponse(partial);
    expect(r?.items).toHaveLength(1);
    expect(r?.items[0].against).toBe("");
  });

  it("returns nothing rather than something invented", () => {
    for (const bad of ["", "   ", "no soy JSON", "{}", '{"items":[]}', '{"items":"nope"}', "{roto"]) {
      expect(parseDifferentialResponse(bad)).toBeNull();
    }
  });
});

describe("body regions", () => {
  it("accepts the ones offered and nothing else", () => {
    for (const r of BODY_REGIONS) expect(isBodyRegion(r)).toBe(true);
    for (const r of ["", "liver", "abdomen; drop table", null, 7]) expect(isBodyRegion(r)).toBe(false);
  });
});

describe("the vision call", () => {
  const img = { base64: "AAAA", mediaType: "image/png" };
  const p = { modelName: "m", apiKey: "k", system: "s", user: "u", images: [img] };

  it("puts the images before the text for Claude", () => {
    const body = buildVisionBody({ ...p, provider: "claude" }) as {
      messages: { content: { type: string }[] }[];
    };
    expect(body.messages[0].content[0].type).toBe("image");
    expect(body.messages[0].content[1].type).toBe("text");
  });

  it("sends a data URL for OpenAI", () => {
    const body = buildVisionBody({ ...p, provider: "openai" }) as {
      messages: { content?: { type: string; image_url?: { url: string } }[] }[];
    };
    const parts = body.messages[1].content!;
    expect(parts[0].image_url!.url).toBe("data:image/png;base64,AAAA");
  });

  it("uses max_completion_tokens for GPT-5, which rejects max_tokens", () => {
    const g5 = buildVisionBody({ ...p, provider: "openai", modelName: "gpt-5.6-luna" });
    expect(g5).toHaveProperty("max_completion_tokens");
    expect(g5).not.toHaveProperty("max_tokens");
    const g4 = buildVisionBody({ ...p, provider: "openai", modelName: "gpt-4o" });
    expect(g4).toHaveProperty("max_tokens");
  });

  it("knows which providers can actually see", () => {
    expect(providerSupportsVision("claude")).toBe(true);
    expect(providerSupportsVision("openai")).toBe(true);
    // Answering about an image nobody looked at is worse than not answering.
    for (const p of ["deepseek", "gemini", "custom", ""]) {
      expect(providerSupportsVision(p)).toBe(false);
    }
  });

  it("accepts only the formats both providers take", () => {
    for (const t of ["image/png", "image/jpeg", "image/webp"]) expect(isAcceptedImageType(t)).toBe(true);
    for (const t of ["image/gif", "application/dicom", "text/html", ""]) expect(isAcceptedImageType(t)).toBe(false);
  });
});
