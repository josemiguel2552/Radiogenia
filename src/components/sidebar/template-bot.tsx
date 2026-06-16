"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Loader2, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import type { UserTemplate } from "@/lib/types";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParsedTemplate {
  name: string;
  modality: string;
  section: string;
  fields: string;
}

function parseTemplateBlock(text: string): ParsedTemplate | null {
  const match = text.match(/```template\n([\s\S]*?)```/);
  if (!match) return null;
  const block = match[1].trim();
  const lines = block.split("\n");

  let name = "";
  let modality = "";
  let section = "";
  const fieldLines: string[] = [];
  let pastSeparator = false;

  for (const line of lines) {
    if (line.startsWith("NAME:")) { name = line.replace("NAME:", "").trim(); continue; }
    if (line.startsWith("MODALITY:")) { modality = line.replace("MODALITY:", "").trim(); continue; }
    if (line.startsWith("SECTION:")) { section = line.replace("SECTION:", "").trim(); continue; }
    if (line.startsWith("---")) { pastSeparator = true; continue; }
    if (pastSeparator && line.trim()) fieldLines.push(line);
  }

  if (!name || !modality || fieldLines.length === 0) return null;

  const templateLines: string[] = [];
  for (const fl of fieldLines) {
    const isIndented = /^\s{2,}/.test(fl);
    const trimmed = fl.trim();
    const fieldMatch = trimmed.match(/^\*{2}([^*]+)\*{2}/);
    const label = fieldMatch ? fieldMatch[1].trim() : trimmed.replace(/[*{}:]/g, "").trim();
    if (!label) continue;

    const isParent = !isIndented && fieldLines.some((next) => {
      const idx = fieldLines.indexOf(fl);
      const nextLine = fieldLines[idx + 1];
      return nextLine && /^\s{2,}/.test(nextLine);
    });

    if (isParent) {
      templateLines.push(`**${label}**:`);
    } else if (isIndented) {
      templateLines.push(`   **${label}**: {${label.toLowerCase()}}`);
    } else {
      templateLines.push(`**${label}**: {${label.toLowerCase()}}`);
    }
  }

  const templateStr = `****FINDINGS****\n${templateLines.join("\n")}\n****CONCLUSION****\n{conclusion}`;
  return { name, modality, section: section || "Abdomen and pelvis", fields: templateStr };
}

function BotMessage({ content, onSave, saving, saved }: {
  content: string;
  onSave?: (tpl: ParsedTemplate) => void;
  saving?: boolean;
  saved?: boolean;
}) {
  const t = useT();
  const parsed = parseTemplateBlock(content);

  return (
    <div>
      <ReactMarkdown
        components={{
          h3: ({ children }) => (
            <p className="font-semibold text-[11px] text-teal-700 dark:text-teal-300 mt-2 mb-0.5 first:mt-0">{children}</p>
          ),
          p: ({ children }) => (
            <p className="mb-1.5 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-1.5 ml-2.5 space-y-0.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-1.5 ml-3 space-y-0.5 list-decimal marker:text-teal-400 marker:font-semibold marker:text-[10px] last:mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-2.5 [ul>&]:before:content-['•'] before:absolute before:left-0 before:text-teal-400 before:font-bold before:text-[9px] before:top-[1px] [ol>&]:pl-0.5 [ol>&]:before:content-none">{children}</li>
          ),
          code: ({ children, className }) => {
            if (className?.includes("language-template")) return null;
            return <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{children}</code>;
          },
          pre: ({ children }) => {
            const child = children as React.ReactElement<{ className?: string }>;
            if (child?.props?.className?.includes("language-template")) return null;
            return <pre className="text-[10px] bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto mb-1.5">{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {parsed && onSave && (
        <button
          onClick={() => onSave(parsed)}
          disabled={saving || saved}
          className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            saved
              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40"
          }`}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
          {saved ? t("tplbot.saved") : t("tplbot.save_template")}
        </button>
      )}
    </div>
  );
}

export function TemplateBot({ templates }: { templates: UserTemplate[] }) {
  const t = useT();
  const { prefs } = useUIPrefs();
  const lang = prefs.uiLanguage || "es";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const templatesSummary = templates
    .map((tpl) => {
      const fields = tpl.structure?.template;
      if (!fields) return `- ${tpl.name} (${tpl.modality}, ${tpl.section_name || ""})`;
      const fieldNames = fields
        .split("\n")
        .filter((l) => l.includes("**") && !l.includes("FINDINGS") && !l.includes("CONCLUSION"))
        .map((l) => l.replace(/\*\*/g, "").replace(/\{[^}]*\}/g, "").replace(/:/g, "").trim())
        .filter(Boolean);
      return `- ${tpl.name} (${tpl.modality}, ${tpl.section_name || ""}): campos=[${fieldNames.join(", ")}]`;
    })
    .join("\n");

  const handleSaveTemplate = useCallback(async (idx: number, parsed: ParsedTemplate) => {
    setSavingIdx(idx);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.name,
          modality: parsed.modality,
          structure: {
            id: 0,
            title: parsed.name,
            template: parsed.fields,
            technique: "",
            section: parsed.section,
          },
        }),
      });
      if (res.ok) {
        setSavedIdxs((prev) => new Set(prev).add(idx));
        window.dispatchEvent(new CustomEvent("radiogenai:templates-changed"));
      }
    } catch { /* ignore */ }
    setSavingIdx(null);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate/template-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, language: lang, templates: templatesSummary }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let errorMsg = `Error ${res.status}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) errorMsg = parsed.error;
        } catch {
          if (text) errorMsg = text.slice(0, 200);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: t("tplbot.error") }]);
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.startsWith("__STREAM_ERROR__:")) {
          accumulated = chunk.replace("__STREAM_ERROR__:", "");
          break;
        }
        accumulated += chunk;
        const text = accumulated;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: text };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("tplbot.error") }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, lang, templatesSummary, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
      >
        <span className="text-sm">📝</span>
        <span>{t("tplbot.title")}</span>
      </button>
    );
  }

  return (
    <div className="border border-teal-200 dark:border-teal-800 rounded-xl bg-white dark:bg-gray-900 shadow-lg flex flex-col" style={{ height: "420px" }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-teal-100 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📝</span>
          <span className="text-xs font-semibold text-teal-800 dark:text-teal-200">{t("tplbot.title")}</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-0.5 rounded hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <span className="text-3xl mb-2">📝</span>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t("tplbot.welcome_title")}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[220px]">{t("tplbot.welcome_desc")}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap bg-teal-600 text-white rounded-br-sm">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[90%] rounded-lg rounded-bl-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                {msg.content ? (
                  <div className="px-3 py-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                    <BotMessage
                      content={msg.content}
                      onSave={(parsed) => handleSaveTemplate(i, parsed)}
                      saving={savingIdx === i}
                      saved={savedIdxs.has(i)}
                    />
                  </div>
                ) : loading && i === messages.length - 1 ? (
                  <div className="px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("tplbot.thinking")}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="px-2 pb-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-1.5 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("tplbot.placeholder")}
            rows={1}
            className="flex-1 resize-none text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-600"
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-8 w-8 p-0 bg-teal-600 hover:bg-teal-700 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 text-center">{t("tplbot.disclaimer")}</p>
      </div>
    </div>
  );
}
