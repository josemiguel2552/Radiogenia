"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Search, Download, ClipboardList, GraduationCap, Stethoscope } from "lucide-react";

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

export function AdminWaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/waitlist")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setEntries(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch("/api/admin/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  }

  function handleExportCsv() {
    const header = "Nombre,Apellidos,Email,País,Hospital,Perfil,Fecha";
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendingCount}</p>
              <p className="text-xs text-gray-500">Facultativos</p>
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
              <p className="text-xs text-gray-500">Residentes</p>
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
                placeholder="Buscar por nombre, email, hospital..."
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
              {entries.length === 0 ? "No hay registros en la lista de espera." : "Sin resultados para esta búsqueda."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Nombre</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Apellidos</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Email</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">País</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Hospital</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Perfil</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Fecha</th>
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
                        <Badge variant="secondary" className={`text-[10px] ${e.role === "resident" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"}`}>
                          {e.role === "resident" ? "Residente" : "Facultativo"}
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
    </div>
  );
}
