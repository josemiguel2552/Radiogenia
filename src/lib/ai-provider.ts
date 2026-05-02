import type { AIProvider } from "./types";

interface GenerateParams {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  customBaseUrl?: string;
  system: string;
  user: string;
  maxTokens?: number;
}

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  buildBody: (model: string, system: string, user: string, maxTokens: number) => object;
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
        buildBody: (model, system, user, maxTokens) => ({
          model,
          max_tokens: maxTokens,
          temperature: 0,
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
        buildBody: (model, system, user, maxTokens) => ({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          temperature: 0,
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
        buildBody: (model, system, user, maxTokens) => ({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          temperature: 0,
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
        buildBody: (_model, system, user, maxTokens) => ({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0 },
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
        buildBody: (model, system, user, maxTokens) => ({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          temperature: 0,
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
  const maxTokens = params.maxTokens || 4096;
  const body = config.buildBody(params.modelName, params.system, params.user, maxTokens);

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

/* ── Streaming support ──────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStreamToken(parsed: any, provider: AIProvider, eventType: string): string {
  switch (provider) {
    case "openai":
    case "deepseek":
    case "custom":
      return parsed?.choices?.[0]?.delta?.content || "";
    case "claude":
      if (eventType === "content_block_delta" && parsed?.delta?.type === "text_delta") {
        return parsed.delta.text || "";
      }
      return "";
    case "gemini":
      return parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    default:
      return "";
  }
}

function extractSSEError(parsed: Record<string, unknown>, provider: AIProvider, eventType: string): string | null {
  if (eventType === "error") {
    const err = parsed as { error?: { message?: string }; message?: string };
    return err.error?.message || err.message || "Stream error";
  }
  if (provider === "openai" || provider === "deepseek" || provider === "custom") {
    const obj = parsed as { error?: { message?: string } };
    if (obj.error?.message) return obj.error.message;
  }
  if (provider === "gemini") {
    const obj = parsed as { error?: { message?: string } };
    if (obj.error?.message) return obj.error.message;
  }
  return null;
}

function parseSSEToTextStream(body: ReadableStream<Uint8Array>, provider: AIProvider): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const ERROR_PREFIX = "__STREAM_ERROR__:";

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let eventType = "";
      let hasTokens = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("event: ")) {
              eventType = trimmed.slice(7);
              continue;
            }

            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const errMsg = extractSSEError(parsed, provider, eventType);
              if (errMsg) {
                controller.enqueue(encoder.encode(ERROR_PREFIX + errMsg));
                break;
              }
              const token = extractStreamToken(parsed, provider, eventType);
              if (token) {
                hasTokens = true;
                controller.enqueue(encoder.encode(token));
              }
            } catch { /* skip unparseable SSE lines */ }
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });
}

function withKeepalive(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const encoder = new TextEncoder();
  const HEARTBEAT_MS = 10_000;

  return new ReadableStream({
    async start(controller) {
      let alive = true;
      const heartbeat = setInterval(() => {
        if (alive) {
          try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
        }
      }, HEARTBEAT_MS);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (e) {
        controller.error(e);
      } finally {
        alive = false;
        clearInterval(heartbeat);
        controller.close();
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

export async function generateAIStream(params: GenerateParams): Promise<ReadableStream<Uint8Array>> {
  const { provider, modelName } = params;
  const config = getProviderConfig(params);
  const maxTokens = params.maxTokens || 4096;
  const body = config.buildBody(modelName, params.system, params.user, maxTokens);

  let url = config.url;
  let requestBody: object;

  if (provider === "gemini") {
    url = url.replace(":generateContent", ":streamGenerateContent");
    url += url.includes("?") ? "&alt=sse" : "?alt=sse";
    requestBody = body;
  } else {
    requestBody = { ...body, stream: true };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI provider error (${response.status}): ${errText}`);
  }

  if (!response.body) {
    const data = await response.json();
    const text = config.extractText(data);
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  return withKeepalive(parseSSEToTextStream(response.body, provider));
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
