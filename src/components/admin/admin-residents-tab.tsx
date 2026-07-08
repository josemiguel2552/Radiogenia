"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GraduationCap, Check, X, ChevronDown, ExternalLink } from "lucide-react";
import type { ResidentVerification, ResidentVerificationStatus } from "@/lib/types";
import { useT } from "@/lib/i18n";

export function AdminResidentsTab() {
  const t = useT();
  const [verifications, setVerifications] = useState<ResidentVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resident-verifications");
      if (res.ok) setVerifications(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReview(id: string, status: "approved" | "rejected") {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/resident-verifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, admin_notes: notes[id] || "" }),
      });
      if (res.ok) await load();
    } catch { /* ignore */ }
    setProcessing(null);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const statusColor: Record<ResidentVerificationStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  const filtered = filter === "all" ? verifications : verifications.filter((v) => v.status === filter);
  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 px-5 pt-5 pb-3 flex-wrap">
          <GraduationCap className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.residents.title")}</h2>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">
              {pendingCount} {t("admin.residents.pending")}
            </Badge>
          )}
          <div className="ml-auto flex gap-1">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => {
              const labelMap: Record<string, string> = {
                all: t("admin.residents.all"),
                pending: t("admin.residents.filter_pending"),
                approved: t("admin.residents.filter_approved"),
                rejected: t("admin.residents.filter_rejected"),
              };
              return (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilter(f)}
                >
                  {labelMap[f]}
                </Button>
              );
            })}
          </div>
        </div>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">{t("admin.residents.no_verifications")}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => {
                const isExpanded = expanded.has(v.id);
                return (
                  <div key={v.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      onClick={() => toggleExpand(v.id)}
                    >
                      <Badge className={`${statusColor[v.status]} text-[10px]`}>
                        {v.status}
                      </Badge>
                      <div className="text-left min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                          {v.user_name || v.user_email}
                        </span>
                        <span className="text-[11px] text-gray-500 block truncate">
                          {v.institution_name || t("admin.residents.no_institution")} · {v.residency_start} → {v.residency_end}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500 block">{t("admin.residents.email")}</span>
                            <span className="text-gray-900 dark:text-white">{v.user_email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">{t("admin.residents.institution")}</span>
                            <span className="text-gray-900 dark:text-white">{v.institution_name || "—"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">{t("admin.residents.residency_period")}</span>
                            <span className="text-gray-900 dark:text-white">{v.residency_start} → {v.residency_end}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">{t("admin.residents.submitted")}</span>
                            <span className="text-gray-900 dark:text-white">{new Date(v.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {v.document_url !== "not-stored" && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">{t("admin.residents.document")}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/resident-verifications/document?path=${encodeURIComponent(v.document_url)}`);
                                if (res.ok) {
                                  const { url } = await res.json();
                                  window.open(url, "_blank");
                                }
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {t("admin.residents.view_document")}
                            </Button>
                          </div>
                        )}

                        {v.status === "pending" && (
                          <div className="space-y-2">
                            <textarea
                              className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                              rows={2}
                              placeholder={t("admin.residents.notes_placeholder")}
                              value={notes[v.id] || ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleReview(v.id, "approved")}
                                disabled={processing === v.id}
                              >
                                {processing === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                {t("admin.residents.approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs gap-1"
                                onClick={() => handleReview(v.id, "rejected")}
                                disabled={processing === v.id}
                              >
                                {processing === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                {t("admin.residents.reject")}
                              </Button>
                            </div>
                          </div>
                        )}

                        {v.status !== "pending" && v.admin_notes && (
                          <div>
                            <span className="text-xs text-gray-500 block">{t("admin.residents.admin_notes")}</span>
                            <p className="text-xs text-gray-900 dark:text-white">{v.admin_notes}</p>
                          </div>
                        )}

                        {v.reviewed_at && (
                          <div className="text-[10px] text-gray-400">
                            {t("admin.residents.reviewed")} {new Date(v.reviewed_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
