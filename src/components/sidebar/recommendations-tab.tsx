"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Loader2, Check, X, Pencil, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
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

  // Edit state
  const [editRec, setEditRec] = useState<UserRecommendation | null>(null);
  const [editTrigger, setEditTrigger] = useState("");
  const [editRecText, setEditRecText] = useState("");
  const [editGuideline, setEditGuideline] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Document upload (Word + PDF)
  const [extracting, setExtracting] = useState(false);
  const [extractedRecs, setExtractedRecs] = useState<ExtractedRec[]>([]);
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

  // Group by guideline
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

  // Unified file upload (Word or PDF)
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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-3">
      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <Input placeholder="Search recommendations..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button size="icon" variant="outline" onClick={() => setShowForm(!showForm)} title="Add recommendation">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="space-y-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <div>
            <Label className="text-xs">Trigger finding</Label>
            <Input placeholder="e.g., Pulmonary nodule >8mm" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Recommendation</Label>
            <Textarea placeholder="e.g., Follow-up chest CT in 3 months" value={recText} onChange={(e) => setRecText(e.target.value)} className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Guideline</Label>
            <Input placeholder="e.g., Fleischner Society" value={guideline} onChange={(e) => setGuideline(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Document Import Zone */}
      <input type="file" accept=".docx,.doc,.pdf" ref={fileRef} onChange={handleFileUpload} className="hidden" />
      <div
        className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors dark:border-gray-600"
        onClick={() => fileRef.current?.click()}
      >
        {extracting ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-xs text-gray-500">AI is extracting recommendations...</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-4 w-4 text-gray-400" />
            <p className="text-xs text-gray-500">Upload Word/PDF guidelines</p>
          </div>
        )}
      </div>

      {/* Extracted recommendations for review */}
      {extractedRecs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">{extractedRecs.length} extracted:</p>
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={approveAllExtracted}>
              <Check className="h-3 w-3" /> Approve all
            </Button>
          </div>
          {extractedRecs.map((r, i) => (
            <div key={i} className="p-2.5 border rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="font-medium text-gray-900 dark:text-white">{r.trigger}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5">{r.recommendation}</p>
              {r.guideline && <Badge variant="outline" className="text-[10px] mt-1">{r.guideline}</Badge>}
              <div className="flex gap-1 mt-2">
                <Button size="sm" variant="outline" className="h-6 text-xs text-green-600" onClick={() => approveExtracted(i)}>
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs text-red-500" onClick={() => rejectExtracted(i)}>
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Recommendations list grouped by guideline */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recommendations found</p>
            <p className="text-xs">Add manually or upload a guidelines document</p>
          </div>
        )}
        {sortedGroups.map((group) => (
          <div key={group}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-2 py-2 px-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {collapsedGroups[group] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {group}
              <Badge variant="secondary" className="text-[10px] ml-auto">{grouped[group].length}</Badge>
            </button>

            {/* Recommendations in this group */}
            {!collapsedGroups[group] && (
              <div className="space-y-1.5 ml-2 mb-2">
                {grouped[group].map((r) => (
                  <div key={r.id} className="p-2.5 border rounded-lg text-xs dark:border-gray-700 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{r.trigger_keyword}</p>
                        <p className="text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{r.recommendation_text}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">{r.source === "pdf_extracted" ? "Imported" : "Manual"}</Badge>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDelete(r.id)} title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editRec} onOpenChange={(open) => { if (!open) setEditRec(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trigger finding</Label>
              <Input value={editTrigger} onChange={(e) => setEditTrigger(e.target.value)} />
            </div>
            <div>
              <Label>Recommendation</Label>
              <Textarea value={editRecText} onChange={(e) => setEditRecText(e.target.value)} className="min-h-[100px]" />
            </div>
            <div>
              <Label>Guideline</Label>
              <Input value={editGuideline} onChange={(e) => setEditGuideline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
