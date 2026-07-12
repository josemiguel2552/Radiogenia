"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Search, Download, ClipboardList, GraduationCap, Stethoscope, Building2, Mail } from "lucide-react";
import { useT } from "@/lib/i18n";

interface WaitlistEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  hospital: string;
  role: "attending" | "resident";
  created_at: string;
}

interface EnterpriseInquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export function AdminWaitlistTab() {
  const t = useT();
  const [subTab, setSubTab] = useState<"waitlist" | "enterprise">("waitlist");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [inquiries, setInquiries] = useState<EnterpriseInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [deletingInquiry, setDeletingInquiry] = useState<string | null>(null);
  const [expandedInquiry, setExpandedInquiry] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/waitlist")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { if (Array.isArray(d)) setEntries(d); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/admin/enterprise-inquiries")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { if (Array.isArray(d)) setInquiries(d); })
      .catch(() => {})
      .finally(() => setInquiriesLoading(false));
  }, []);

  async function handleDeleteInquiry(id: string) {
    setDeletingInquiry(id);
    try {
      const res = await fetch("/api/admin/enterprise-inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setInquiries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
    setDeletingInquiry(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  }

  function handleExportCsv() {
    const header = [t("admin.waitlist.col_name"), t("admin.waitlist.col_last_name"), t("admin.waitlist.col_email"), t("admin.waitlist.col_country"), t("admin.waitlist.col_hospital"), t("admin.waitlist.col_role"), t("admin.waitlist.col_date")].join(",");
    const rows = filtered.map((e) =>
      [e.first_name, e.last_name, e.email, e.country, e.hospital, e.role, new Date(e.created_at).toLocaleDateString()].map((v) => `"${v}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const q = search.toLowerCase();
  const filtered = entries.filter((e) =>
    !q ||
    e.first_name.toLowerCase().includes(q) ||
    e.last_name.toLowerCase().includes(q) ||
    e.email.toLowerCase().includes(q) ||
    e.country.toLowerCase().includes(q) ||
    e.hospital.toLowerCase().includes(q)
  );

  const attendingCount = entries.filter((e) => e.role === "attending").length;
  const residentCount = entries.filter((e) => e.role === "resident").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setSubTab("waitlist")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subTab === "waitlist" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
        >
          {t("admin.waitlist.tab_waitlist")}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("enterprise")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subTab === "enterprise" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
        >
          <Building2 className="h-3 w-3" />
          {t("admin.waitlist.tab_enterprise")}
          {inquiries.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{inquiries.length}</Badge>
          )}
        </button>
      </div>

      {subTab === "enterprise" ? (
        inquiriesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              {inquiries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t("admin.waitlist.enterprise_empty")}</p>
              ) : (
                <div className="space-y-2">
                  {inquiries.map((inq) => {
                    const isOpen = expandedInquiry === inq.id;
                    return (
                      <div key={inq.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedInquiry(isOpen ? null : inq.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inq.name}</p>
                            <p className="text-xs text-gray-500 truncate">{inq.email}</p>
                          </div>
                          <span className="text-[11px] text-gray-400 shrink-0">{new Date(inq.created_at).toLocaleDateString()}</span>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <div>
                              <p className="text-[11px] text-gray-500 mb-1">{t("admin.waitlist.col_message")}</p>
                              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{inq.message}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" asChild>
                                <a href={`mailto:${inq.email}`}>
                                  <Mail className="h-3 w-3" />
                                  {t("admin.waitlist.reply_by_email")}
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1.5 text-gray-400 hover:text-red-500"
                                onClick={() => handleDeleteInquiry(inq.id)}
                                disabled={deletingInquiry === inq.id}
                              >
                                {deletingInquiry === inq.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      ) : (
      <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
              <p className="text-xs text-gray-500">{t("admin.waitlist.total")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendingCount}</p>
              <p className="text-xs text-gray-500">{t("admin.waitlist.attending")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{residentCount}</p>
              <p className="text-xs text-gray-500">{t("admin.waitlist.residents")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("admin.waitlist.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {entries.length === 0 ? t("admin.waitlist.empty") : t("admin.waitlist.no_results")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_name")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_last_name")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_email")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_country")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_hospital")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_role")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.waitlist.col_date")}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="py-2 px-2 text-gray-900 dark:text-white font-medium">{e.first_name}</td>
                      <td className="py-2 px-2 text-gray-900 dark:text-white">{e.last_name}</td>
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-300">{e.email}</td>
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-300">{e.country}</td>
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{e.hospital}</td>
                      <td className="py-2 px-2">
                        <Badge variant="secondary" className={`text-[10px] ${e.role === "resident" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"}`}>
                          {e.role === "resident" ? t("admin.waitlist.role_resident") : t("admin.waitlist.role_attending")}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={() => handleDelete(e.id)}
                          disabled={deleting === e.id}
                        >
                          {deleting === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
