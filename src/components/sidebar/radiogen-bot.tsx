"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function BotMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h3: ({ children }) => (
          <p className="font-semibold text-[11px] text-violet-700 dark:text-violet-300 mt-2 mb-0.5 first:mt-0">{children}</p>
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
          <ol className="mb-1.5 ml-3 space-y-0.5 list-decimal marker:text-violet-400 marker:font-semibold marker:text-[10px] last:mb-0">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="relative pl-2.5 [ul>&]:before:content-['•'] before:absolute before:left-0 before:text-violet-400 before:font-bold before:text-[9px] before:top-[1px] [ol>&]:pl-0.5 [ol>&]:before:content-none">{children}</li>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function RadiogenBot() {
  const t = useT();
  const { prefs } = useUIPrefs();
  const lang = prefs.uiLanguage || "es";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, language: lang }),
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
        setMessages((prev) => [...prev, { role: "assistant", content: t("bot.error") }]);
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
      setMessages((prev) => [...prev, { role: "assistant", content: t("bot.error") }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, lang, t]);

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
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
      >
        <span className="text-sm">🧠</span>
        <span>Radiogen Bot</span>
      </button>
    );
  }

  return (
    <div className="border border-violet-200 dark:border-violet-800 rounded-xl bg-white dark:bg-gray-900 shadow-lg flex flex-col" style={{ height: "420px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🧠</span>
          <span className="text-xs font-semibold text-violet-800 dark:text-violet-200">Radiogen Bot</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-0.5 rounded hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <span className="text-3xl mb-2">🧠</span>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t("bot.welcome_title")}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[200px]">{t("bot.welcome_desc")}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap bg-violet-600 text-white rounded-br-sm">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[90%] rounded-lg rounded-bl-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                {msg.content ? (
                  <div className="px-3 py-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                    <BotMessage content={msg.content} />
                  </div>
                ) : loading && i === messages.length - 1 ? (
                  <div className="px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("bot.thinking")}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-2 pb-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-1.5 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("bot.placeholder")}
            rows={1}
            className="flex-1 resize-none text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:focus:ring-violet-600"
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 text-center">{t("bot.disclaimer")}</p>
      </div>
    </div>
  );
}
