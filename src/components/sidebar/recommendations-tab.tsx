"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Upload, Loader2, Check, X } from "lucide-react";
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
  const [showForm, setShowForm] = useState(false);
  const [trigger, setTrigger] = useState("");
  const [recText, setRecText] = useState("");
  const [guideline, setGuideline] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handleDelete(id: string) {
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
    <div className="space-y-4">
      {/* Manual recommendations */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Manual Recommendations</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <div>
            <Label className="text-xs">Trigger finding</Label>
            <Input placeholder="e.g., Nódulo pulmonar >8mm" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Recommendation</Label>
            <Textarea placeholder="e.g., TC torácico control en 3 meses" value={recText} onChange={(e) => setRecText(e.target.value)} className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Guideline reference</Label>
            <Input placeholder="e.g., Fleischner Society" value={guideline} onChange={(e) => setGuideline(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-[25vh] overflow-y-auto">
        {recs.map((r) => (
          <div key={r.id} className="p-2.5 border rounded-lg text-xs dark:border-gray-700">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{r.trigger_keyword}</p>
                <p className="text-gray-600 dark:text-gray-400 mt-0.5">{r.recommendation_text}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{r.source}</Badge>
                  {r.guideline_name && <Badge variant="outline" className="text-[10px]">{r.guideline_name}</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {recs.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-4">No recommendations yet. Add manually or upload a document.</p>
        )}
      </div>

      <Separator />

      {/* Document Import (Word + PDF) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Import from Document</h3>
        <input type="file" accept=".docx,.doc,.pdf" ref={fileRef} onChange={handleFileUpload} className="hidden" />
        <div
          className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 transition-colors dark:border-gray-600"
          onClick={() => fileRef.current?.click()}
        >
          {extracting ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-xs text-gray-500">AI is extracting recommendations...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-500">Upload Word or PDF guideline</p>
              <p className="text-[10px] text-gray-400">ACR, Fleischner, BI-RADS, etc.</p>
            </div>
          )}
        </div>

        {/* Extracted recommendations for review */}
        {extractedRecs.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{extractedRecs.length} recommendations extracted — review:</p>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={approveAllExtracted}>
                <Check className="h-3 w-3" /> Approve all
              </Button>
            </div>
            {extractedRecs.map((r, i) => (
              <div key={i} className="p-2.5 border rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="font-medium text-gray-900 dark:text-white">{r.trigger}</p>
                <p className="text-gray-600 dark:text-gray-400 mt-0.5">{r.recommendation}</p>
                <div className="flex gap-1 mt-1">
                  {r.guideline && <Badge variant="outline" className="text-[10px]">{r.guideline}</Badge>}
                  {r.keywords && <span className="text-[10px] text-gray-400 italic">{r.keywords.substring(0, 50)}</span>}
                </div>
                {r.supported_report_types && (
                  <p className="text-[10px] text-gray-400 mt-1">Applies to: {r.supported_report_types}</p>
                )}
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
      </div>
    </div>
  );
}
