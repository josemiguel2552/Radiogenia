"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Check, Pencil,
  PenLine, Plus, Trash2,
} from "lucide-react";
import { type Signature } from "@/lib/types";
import { useT } from "@/lib/i18n";

export function ModelConfigTab() {
  const t = useT();

  // Signatures
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [showAddSig, setShowAddSig] = useState(false);
  const [editingSig, setEditingSig] = useState<Signature | null>(null);
  const [sigLabel, setSigLabel] = useState("");
  const [sigBody, setSigBody] = useState("");
  const [savingSig, setSavingSig] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [sigSetupNeeded, setSigSetupNeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSignatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signatures");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSignatures(data);
          setSigSetupNeeded(false);
        } else if (data?.error === "SETUP_REQUIRED") {
          setSigSetupNeeded(true);
        }
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error === "SETUP_REQUIRED") {
          setSigSetupNeeded(true);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadSignatures(); }, [loadSignatures]);

  async function handleSaveSig() {
    if (!sigLabel.trim() || !sigBody.trim()) return;
    setSavingSig(true);
    setSigError(null);
    try {
      const res = editingSig
        ? await fetch("/api/signatures", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingSig.id, label: sigLabel, body: sigBody }),
          })
        : await fetch("/api/signatures", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: sigLabel, body: sigBody }),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        if (err.error === "SETUP_REQUIRED") {
          setSigSetupNeeded(true);
          setSigError("Run migration 015_signatures.sql in the Supabase SQL Editor.");
        } else {
          setSigError(err.error || "Failed to save signature");
        }
        setSavingSig(false);
        return;
      }
      setSigLabel(""); setSigBody(""); setShowAddSig(false); setEditingSig(null);
      setSigError(null);
      await loadSignatures();
    } catch {
      setSigError("Network error saving signature");
    }
    setSavingSig(false);
  }

  async function handleToggleSigActive(sig: Signature) {
    try {
      const res = await fetch("/api/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sig.id, is_active: !sig.is_active }),
      });
      if (!res.ok) console.error("Toggle signature error:", await res.text());
    } catch (e) {
      console.error("Toggle signature error:", e);
    }
    await loadSignatures();
  }

  async function handleDeleteSig(id: string) {
    try {
      const res = await fetch(`/api/signatures?id=${id}`, { method: "DELETE" });
      if (!res.ok) console.error("Delete signature error:", await res.text());
    } catch (e) {
      console.error("Delete signature error:", e);
    }
    await loadSignatures();
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-3">
      {/* Signatures */}
      <div className="flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-sm font-semibold">{t("sig.title")}</span>
        {signatures.some((s) => s.is_active) && (
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        )}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">
        {t("sig.desc")}
      </p>

      {sigSetupNeeded && (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">Setup required</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
            Run migration <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">015_signatures.sql</code> in the Supabase SQL Editor to enable signatures.
          </p>
        </div>
      )}

      {!sigSetupNeeded && signatures.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-gray-400">{t("sig.no_signatures")}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{t("sig.no_signatures_hint")}</p>
        </div>
      ) : !sigSetupNeeded && (
        <div className="space-y-1.5">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className={`p-2 rounded-lg border transition-colors ${
                sig.is_active
                  ? "border-violet-500/40 bg-green-50 dark:bg-green-900/10"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSigActive(sig)}
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    sig.is_active
                      ? "border-violet-500 bg-violet-500"
                      : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
                  }`}
                  title={sig.is_active ? t("sig.active") : t("sig.set_active")}
                >
                  {sig.is_active && <Check className="h-2.5 w-2.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">{sig.label}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">{sig.body.split("\n")[0]}</span>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-brand"
                    onClick={() => { setEditingSig(sig); setSigLabel(sig.label); setSigBody(sig.body); setShowAddSig(true); }}
                    title={t("edit")}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-red-500"
                    onClick={() => { if (confirm(t("sig.confirm_delete"))) handleDeleteSig(sig.id); }}
                    title={t("delete")}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm" variant="outline" className="w-full text-xs gap-1.5"
        onClick={() => { setEditingSig(null); setSigLabel(""); setSigBody(""); setShowAddSig(true); }}
      >
        <Plus className="h-3 w-3" />
        {t("sig.add")}
      </Button>

      {/* Signature Add/Edit Dialog */}
      <Dialog open={showAddSig} onOpenChange={(v) => { setShowAddSig(v); if (!v) setEditingSig(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSig ? t("edit") : t("sig.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.label")}</Label>
              <Input
                value={sigLabel}
                onChange={(e) => setSigLabel(e.target.value)}
                placeholder={t("sig.label_placeholder")}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.body")}</Label>
              <textarea
                value={sigBody}
                onChange={(e) => setSigBody(e.target.value)}
                placeholder={t("sig.body_placeholder")}
                rows={4}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>
            {sigBody.trim() && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-gray-400">{t("sig.preview")}</Label>
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans">{sigBody}</pre>
                </div>
              </div>
            )}
            {sigError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{sigError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAddSig(false); setEditingSig(null); setSigError(null); }}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleSaveSig} disabled={savingSig || !sigLabel.trim() || !sigBody.trim()}>
                {savingSig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
