import type { AIProvider } from "./types";

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AIResult {
  text: string;
  usage: AIUsage;
}

export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  getUsage: () => AIUsage | null;
}

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
  extractUsage: (data: unknown) => AIUsage;
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
        extractUsage: (data: unknown) => {
          const d = data as { usage?: { input_tokens?: number; output_tokens?: number } };
          return {
            inputTokens: d.usage?.input_tokens || 0,
            outputTokens: d.usage?.output_tokens || 0,
          };
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
        extractUsage: (data: unknown) => {
          const d = data as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
          return {
            inputTokens: d.usage?.prompt_tokens || 0,
            outputTokens: d.usage?.completion_tokens || 0,
          };
        },
      };

    case "deepseek":
      return {
        url: "https://api.deepseek.com/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (model, system, user, maxTokens) => {
          // DeepSeek retired the legacy model names on 2026-07-24 (the API now
          // only accepts deepseek-v4-pro / deepseek-v4-flash). Since April 2026
          // "deepseek-chat" was already an alias FOR v4-flash, so remapping to
          // v4-flash preserves the exact model (and cost) previously in use;
          // the thinking-mode "deepseek-reasoner" maps to the advanced v4-pro.
          const resolved =
            model === "deepseek-chat" ? "deepseek-v4-flash" : model === "deepseek-reasoner" ? "deepseek-v4-pro" : model;
          return {
            model: resolved,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: maxTokens,
            temperature: 0,
            // V4 models default to thinking mode when called by their new names,
            // which adds latency and changes prose. The old "deepseek-chat" was
            // v4-flash with thinking OFF, so disable it to match that behavior;
            // v4-pro keeps thinking on (that was "deepseek-reasoner"'s behavior).
            ...(resolved === "deepseek-v4-flash" ? { thinking: { type: "disabled" } } : {}),
          };
        },
        extractText: (data: unknown) => {
          const d = data as { choices: { message: { content: string } }[] };
          return d.choices?.[0]?.message?.content || "";
        },
        extractUsage: (data: unknown) => {
          const d = data as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
          return {
            inputTokens: d.usage?.prompt_tokens || 0,
            outputTokens: d.usage?.completion_tokens || 0,
          };
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
        extractUsage: (data: unknown) => {
          const d = data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
          return {
            inputTokens: d.usageMetadata?.promptTokenCount || 0,
            outputTokens: d.usageMetadata?.candidatesTokenCount || 0,
          };
        },
      };

    case "openrouter":
      return {
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (model, system, user, maxTokens) => ({
          // OpenRouter's Qwen 32B id has no hyphen after "qwen" (unlike the
          // 72B's "qwen-2.5"), so heal configs saved with the hyphenated form.
          model: model === "qwen/qwen-2.5-32b-instruct" ? "qwen/qwen2.5-32b-instruct" : model,
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
        extractUsage: (data: unknown) => {
          const d = data as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
          return {
            inputTokens: d.usage?.prompt_tokens || 0,
            outputTokens: d.usage?.completion_tokens || 0,
          };
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
        extractUsage: (data: unknown) => {
          const d = data as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
          return {
            inputTokens: d.usage?.prompt_tokens || 0,
            outputTokens: d.usage?.completion_tokens || 0,
          };
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

export async function generateAIWithUsage(params: GenerateParams): Promise<AIResult> {
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
  return {
    text: config.extractText(data),
    usage: config.extractUsage(data),
  };
}

/* ── Streaming support ──────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStreamToken(parsed: any, provider: AIProvider, eventType: string): string {
  switch (provider) {
    case "openai":
    case "deepseek":
    case "openrouter":
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStreamUsage(parsed: any, provider: AIProvider, eventType: string, usage: AIUsage): void {
  switch (provider) {
    case "openai":
    case "deepseek":
    case "openrouter":
    case "custom":
      if (parsed?.usage) {
        usage.inputTokens = parsed.usage.prompt_tokens || 0;
        usage.outputTokens = parsed.usage.completion_tokens || 0;
      }
      break;
    case "claude":
      if (eventType === "message_start" && parsed?.message?.usage) {
        usage.inputTokens = parsed.message.usage.input_tokens || 0;
      }
      if (eventType === "message_delta" && parsed?.usage) {
        usage.outputTokens = parsed.usage.output_tokens || 0;
      }
      break;
    case "gemini":
      if (parsed?.usageMetadata) {
        usage.inputTokens = parsed.usageMetadata.promptTokenCount || 0;
        usage.outputTokens = parsed.usageMetadata.candidatesTokenCount || 0;
      }
      break;
  }
}

function extractSSEError(parsed: Record<string, unknown>, provider: AIProvider, eventType: string): string | null {
  if (eventType === "error") {
    const err = parsed as { error?: { message?: string }; message?: string };
    return err.error?.message || err.message || "Stream error";
  }
  if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
    const obj = parsed as { error?: { message?: string } };
    if (obj.error?.message) return obj.error.message;
  }
  if (provider === "gemini") {
    const obj = parsed as { error?: { message?: string } };
    if (obj.error?.message) return obj.error.message;
  }
  return null;
}

function parseSSEToTextStream(body: ReadableStream<Uint8Array>, provider: AIProvider, usageHolder?: AIUsage): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const ERROR_PREFIX = "__STREAM_ERROR__:";

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let eventType = "";

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
                controller.enqueue(encoder.encode(token));
              }
              if (usageHolder) {
                extractStreamUsage(parsed, provider, eventType, usageHolder);
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

export async function generateAIStreamWithUsage(params: GenerateParams): Promise<StreamResult> {
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
  } else if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
    requestBody = { ...body, stream: true, stream_options: { include_usage: true } };
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

  const usageHolder: AIUsage = { inputTokens: 0, outputTokens: 0 };

  if (!response.body) {
    const data = await response.json();
    const text = config.extractText(data);
    const usage = config.extractUsage(data);
    usageHolder.inputTokens = usage.inputTokens;
    usageHolder.outputTokens = usage.outputTokens;
    const encoder = new TextEncoder();
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      }),
      getUsage: () => ({ ...usageHolder }),
    };
  }

  return {
    stream: withKeepalive(parseSSEToTextStream(response.body, provider, usageHolder)),
    getUsage: () => ({ ...usageHolder }),
  };
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
