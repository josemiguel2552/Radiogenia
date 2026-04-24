"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Check,
  X,
  Pencil,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Search,
  Sparkles,
} from "lucide-react";
import type { UserRecommendation } from "@/lib/types";

interface ExtractedRec {
  trigger: string;
  recommendation: string;
  guideline: string;
  keywords?: string;
  supported_report_types?: string;
}

export function RecommendationsTab() {
  const [recs, setRecs] = useState<UserRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [trigger, setTrigger] = useState("");
  const [recText, setRecText] = useState("");
  const [guideline, setGuideline] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [editRec, setEditRec] = useState<UserRecommendation | null>(null);
  const [editTrigger, setEditTrigger] = useState("");
  const [editRecText, setEditRecText] = useState("");
  const [editGuideline, setEditGuideline] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [extractedRecs, setExtractedRecs] = useState<ExtractedRec[]>([]);
  const [reviewOpen, setReviewOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/recommendations");
    if (res.ok) setRecs(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = recs.filter((r) =>
    r.trigger_keyword.toLowerCase().includes(search.toLowerCase()) ||
    r.recommendation_text.toLowerCase().includes(search.toLowerCase()) ||
    (r.guideline_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, UserRecommendation[]>>((acc, r) => {
    const group = r.guideline_name || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(r);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  async function handleAdd() {
    if (!trigger.trim() || !recText.trim()) return;
    setSaving(true);
    await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger_keyword: trigger,
        recommendation_text: recText,
        source: "manual",
        guideline_name: guideline,
      }),
    });
    setTrigger("");
    setRecText("");
    setGuideline("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  function openEdit(r: UserRecommendation) {
    setEditRec(r);
    setEditTrigger(r.trigger_keyword);
    setEditRecText(r.recommendation_text);
    setEditGuideline(r.guideline_name || "");
  }

  async function handleEditSave() {
    if (!editRec) return;
    setEditSaving(true);
    await fetch("/api/recommendations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editRec.id,
        trigger_keyword: editTrigger,
        recommendation_text: editRecText,
        guideline_name: editGuideline,
      }),
    });
    setEditRec(null);
    setEditSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recommendation?")) return;
    await fetch(`/api/recommendations?id=${id}`, { method: "DELETE" });
    load();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractedRecs([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/recommendations", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setExtractedRecs(data.recommendations || []);
        setReviewOpen(true);
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "Upload failed"));
      }
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    setExtracting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function approveExtracted(idx: number) {
    const rec = extractedRecs[idx];
    await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger_keyword: rec.trigger,
        recommendation_text: rec.recommendation,
        source: "pdf_extracted",
        guideline_name: rec.guideline || "",
      }),
    });
    setExtractedRecs((prev) => prev.filter((_, i) => i !== idx));
    load();
  }

  async function approveAllExtracted() {
    const batch = extractedRecs.map((rec) => ({
      trigger_keyword: rec.trigger,
      recommendation_text: rec.recommendation,
      source: "pdf_extracted",
      guideline_name: rec.guideline || "",
    }));
    await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    setExtractedRecs([]);
    load();
  }

  function rejectExtracted(idx: number) {
    setExtractedRecs((prev) => prev.filter((_, i) => i !== idx));
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Guidelines</h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {recs.length} {recs.length === 1 ? "recommendation" : "recommendations"} · grouped by source
        </p>
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          title="Upload Word/PDF guidelines"
          className="h-8 w-8 shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="default"
          onClick={() => setShowForm(!showForm)}
          title="Add recommendation manually"
          className="h-8 w-8 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <input
        type="file"
        accept=".docx,.doc,.pdf"
        ref={fileRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Add form */}
      {showForm && (
        <div className="space-y-2 p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div>
            <Label className="text-[11px] text-gray-500">Trigger finding</Label>
            <Input
              placeholder="e.g. Pulmonary nodule >8mm"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500">Recommendation</Label>
            <Textarea
              placeholder="e.g. Follow-up chest CT in 3 months"
              value={recText}
              onChange={(e) => setRecText(e.target.value)}
              className="min-h-[60px] text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500">Guideline / source</Label>
            <Input
              placeholder="e.g. Fleischner Society"
              value={guideline}
              onChange={(e) => setGuideline(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" onClick={handleAdd} disabled={saving} className="h-7 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Upload status */}
      {extracting && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-soft text-accent">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <p className="text-xs">AI is extracting recommendations…</p>
        </div>
      )}

      {/* Review queue */}
      {extractedRecs.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setReviewOpen(!reviewOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                {extractedRecs.length} extracted, awaiting review
              </span>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-amber-700 dark:text-amber-300 transition-transform ${
                reviewOpen ? "" : "-rotate-90"
              }`}
            />
          </button>

          {reviewOpen && (
            <div className="px-3 pb-3 space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={approveAllExtracted}
                className="w-full h-7 text-xs gap-1.5 bg-white dark:bg-gray-900"
              >
                <Check className="h-3 w-3 text-green-600" /> Approve all {extractedRecs.length}
              </Button>
              {extractedRecs.map((r, i) => (
                <div
                  key={i}
                  className="p-2.5 border border-amber-200/60 dark:border-amber-900/40 rounded-md bg-white dark:bg-gray-900"
                >
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{r.trigger}</p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {r.recommendation}
                  </p>
                  {r.guideline && (
                    <Badge variant="outline" className="text-[9px] mt-1 h-4 px-1.5">
                      {r.guideline}
                    </Badge>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] flex-1 gap-1 text-green-600"
                      onClick={() => approveExtracted(i)}
                    >
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-gray-500 hover:text-red-500"
                      onClick={() => rejectExtracted(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations list */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {search ? "No matching recommendations" : "No recommendations yet"}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {search
                ? "Try a different search term"
                : "Add manually or upload guideline documents"}
            </p>
          </div>
        )}
        {sortedGroups.map((group) => {
          const isCollapsed = collapsedGroups[group];
          return (
            <div key={group} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-1.5 py-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span className="truncate">{group}</span>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-auto">
                  {grouped[group].length}
                </Badge>
              </button>
              {!isCollapsed && (
                <div className="space-y-1 pl-1">
                  {grouped[group].map((r) => (
                    <div
                      key={r.id}
                      className="group p-2 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900/50 hover:border-accent-soft hover:shadow-sm transition-all"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {r.trigger_keyword}
                          </p>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {r.recommendation_text}
                          </p>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 mt-1">
                            {r.source === "pdf_extracted" ? "Imported" : "Manual"}
                          </Badge>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEdit(r)}
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(r.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editRec} onOpenChange={(open) => { if (!open) setEditRec(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Trigger finding</Label>
              <Input value={editTrigger} onChange={(e) => setEditTrigger(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Recommendation</Label>
              <Textarea
                value={editRecText}
                onChange={(e) => setEditRecText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div>
              <Label className="text-xs">Guideline / source</Label>
              <Input value={editGuideline} onChange={(e) => setEditGuideline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
