import type { AIProvider } from "./types";

interface GenerateParams {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
  system: string;
  user: string;
}

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  buildBody: (model: string, system: string, user: string) => object;
  extractText: (data: unknown) => string;
}

function getProviderConfig(params: GenerateParams): ProviderConfig {
  const { provider, modelName, apiKey, customBaseUrl } = params;

  switch (provider) {
    case "claude":
      return {
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        buildBody: (model, system, user) => ({
          model,
          max_tokens: 4096,
          system,
          messages: [{ role: "user", content: user }],
        }),
        extractText: (data: unknown) => {
          const d = data as { content: { type: string; text: string }[] };
          return d.content?.find((c) => c.type === "text")?.text || "";
        },
      };

    case "openai":
      return {
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (model, system, user) => ({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 4096,
        }),
        extractText: (data: unknown) => {
          const d = data as { choices: { message: { content: string } }[] };
          return d.choices?.[0]?.message?.content || "";
        },
      };

    case "deepseek":
      return {
        url: "https://api.deepseek.com/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (model, system, user) => ({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 4096,
        }),
        extractText: (data: unknown) => {
          const d = data as { choices: { message: { content: string } }[] };
          return d.choices?.[0]?.message?.content || "";
        },
      };

    case "gemini":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        headers: { "Content-Type": "application/json" },
        buildBody: (_model, system, user) => ({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: 4096 },
        }),
        extractText: (data: unknown) => {
          const d = data as { candidates: { content: { parts: { text: string }[] } }[] };
          return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        },
      };

    case "custom":
      return {
        url: `${customBaseUrl || "http://localhost:11434"}/v1/chat/completions`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (model, system, user) => ({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 4096,
        }),
        extractText: (data: unknown) => {
          const d = data as { choices: { message: { content: string } }[] };
          return d.choices?.[0]?.message?.content || "";
        },
      };
  }
}

export async function generateAI(params: GenerateParams): Promise<string> {
  const config = getProviderConfig(params);
  const body = config.buildBody(params.modelName, params.system, params.user);

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI provider error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return config.extractText(data);
}

export async function testConnection(params: Omit<GenerateParams, "system" | "user">): Promise<boolean> {
  try {
    const result = await generateAI({
      ...params,
      system: "Reply with exactly: OK",
      user: "Test connection",
    });
    return result.toLowerCase().includes("ok");
  } catch {
    return false;
  }
}
