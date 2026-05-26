"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Indent,
  Outdent,
  FolderOpen,
} from "lucide-react";
import { useT } from "@/lib/i18n";

export interface TemplateField {
  id: string;
  label: string;
  indent: number;
}

let _fieldId = 0;
export function nextFieldId(): string { return `f_${++_fieldId}_${Date.now()}`; }

export function parseTemplateSections(raw: string): TemplateField[] {
  const fields: TemplateField[] = [];
  const body = raw
    .replace(/\*{4}FINDINGS\*{4}\n?/g, "")
    .replace(/\n?\*{4}CONCLUSION\*{4}\n?\{conclusion\}/g, "")
    .trim();
  if (!body) return fields;

  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    const isIndented = /^\s{2,}/.test(line);
    const trimmed = line.trim();

    const tripleMatch = trimmed.match(/^\*{3}([^*]+)\*{3}/);
    if (tripleMatch) {
      fields.push({ id: nextFieldId(), label: tripleMatch[1].trim(), indent: 0 });
      continue;
    }

    const fieldMatch = trimmed.match(/^\*{2}([^*]+)\*{2}/);
    if (fieldMatch) {
      fields.push({ id: nextFieldId(), label: fieldMatch[1].trim(), indent: isIndented ? 1 : 0 });
      continue;
    }

    if (trimmed.length > 1 && !trimmed.startsWith("{")) {
      fields.push({ id: nextFieldId(), label: trimmed.replace(/[*{}:]/g, "").trim(), indent: isIndented ? 1 : 0 });
    }
  }
  return fields;
}

export function serializeTemplateSections(fields: TemplateField[]): string {
  const lines: string[] = [];

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (!f.label.trim()) continue;

    const isParent = f.indent === 0 && fields[i + 1]?.indent === 1;

    if (isParent) {
      lines.push(`**${f.label}**:`);
    } else if (f.indent === 1) {
      lines.push(`   **${f.label}**: {${f.label.toLowerCase()}}`);
    } else {
      lines.push(`**${f.label}**: {${f.label.toLowerCase()}}`);
    }
  }

  return `****FINDINGS****\n${lines.join("\n")}\n\n****CONCLUSION****\n{conclusion}`;
}

export function SectionEditor({ fields, onChange }: { fields: TemplateField[]; onChange: (fields: TemplateField[]) => void }) {
  const t = useT();

  const updateLabel = useCallback((id: string, label: string) => {
    onChange(fields.map((f) => f.id === id ? { ...f, label } : f));
  }, [fields, onChange]);

  const indentField = useCallback((id: string) => {
    onChange(fields.map((f) => f.id === id ? { ...f, indent: Math.min(f.indent + 1, 1) } : f));
  }, [fields, onChange]);

  const outdentField = useCallback((id: string) => {
    onChange(fields.map((f) => f.id === id ? { ...f, indent: Math.max(f.indent - 1, 0) } : f));
  }, [fields, onChange]);

  const moveUp = useCallback((id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx <= 0) return;
    const next = [...fields];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }, [fields, onChange]);

  const moveDown = useCallback((id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0 || idx >= fields.length - 1) return;
    const next = [...fields];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }, [fields, onChange]);

  const remove = useCallback((id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  }, [fields, onChange]);

  const addAfter = useCallback((id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    const currentIndent = fields[idx]?.indent ?? 0;
    const next = [...fields];
    next.splice(idx + 1, 0, { id: nextFieldId(), label: "", indent: currentIndent });
    onChange(next);
  }, [fields, onChange]);

  const addAtEnd = useCallback(() => {
    onChange([...fields, { id: nextFieldId(), label: "", indent: 0 }]);
  }, [fields, onChange]);

  return (
    <div className="space-y-1.5">
      {fields.map((f, idx) => {
        const isParent = f.indent === 0 && fields[idx + 1]?.indent === 1;
        const isChild = f.indent === 1;

        return (
          <div key={f.id} className={`group rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-700 p-1 ${isChild ? "ml-5" : ""}`}>
            <div className="flex items-center gap-1">
              {isParent ? (
                <FolderOpen className="h-3.5 w-3.5 text-brand shrink-0" />
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isChild ? "bg-gray-300 dark:bg-gray-600" : "bg-gray-400 dark:bg-gray-500"}`} />
              )}

              <Input
                value={f.label}
                onChange={(e) => updateLabel(f.id, e.target.value)}
                placeholder={t("tpl.section_name_placeholder")}
                className={`h-7 text-xs flex-1 min-w-0 ${isParent ? "font-semibold" : ""}`}
                autoFocus={!f.label}
              />

              <div className="flex gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(f.id)} disabled={idx === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(f.id)} disabled={idx === fields.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => remove(f.id)} disabled={fields.length <= 1}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex gap-0.5 mt-0.5 ml-5">
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1 text-gray-500" onClick={() => indentField(f.id)} disabled={f.indent >= 1}>
                <Indent className="h-2.5 w-2.5" /> {t("tpl.make_group")}
              </Button>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1 text-gray-500" onClick={() => outdentField(f.id)} disabled={f.indent <= 0}>
                <Outdent className="h-2.5 w-2.5" /> {t("tpl.make_field")}
              </Button>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1 text-brand" onClick={() => addAfter(f.id)}>
                <Plus className="h-2.5 w-2.5" /> {t("tpl.add_below")}
              </Button>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 mt-2 border-dashed" onClick={addAtEnd}>
        <Plus className="h-3 w-3" /> {t("tpl.add_section")}
      </Button>
    </div>
  );
}
