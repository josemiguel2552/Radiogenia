"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Plus, MessageSquare, CheckCircle, Clock, AlertCircle, Send,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { SupportTicket, SupportTicketCategory } from "@/lib/types";

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("general");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/support");
      if (res.ok) setTickets(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), body: body.trim(), category }),
    });
    if (res.ok) {
      setShowForm(false);
      setSubject("");
      setBody("");
      setCategory("general");
      await load();
    }
    setSending(false);
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case "open": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      case "in_progress": return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case "resolved": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      default: return <MessageSquare className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const statusLabel: Record<string, string> = {
    open: "Abierto",
    in_progress: "En curso",
    resolved: "Resuelto",
    closed: "Cerrado",
  };

  const categoryLabel: Record<string, string> = {
    error: "Error",
    question: "Pregunta",
    complaint: "Queja",
    general: "General",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" variant="icon" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Soporte</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mis tickets</h2>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuevo ticket
          </Button>
        </div>

        {/* New ticket form */}
        {showForm && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Asunto</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Resumen breve del problema"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error / Bug</SelectItem>
                    <SelectItem value="question">Pregunta</SelectItem>
                    <SelectItem value="complaint">Queja</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe el problema con el máximo detalle posible..."
                  rows={4}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSubmit} disabled={sending || !body.trim()} className="gap-1.5">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5" />Enviar</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ticket list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : tickets.length === 0 && !showForm ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No tienes tickets de soporte</p>
              <p className="text-xs text-gray-400 mt-1">Crea uno si tienes alguna duda, queja o error</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {statusIcon(t.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {t.subject || t.body.slice(0, 60)}
                        </span>
                        <Badge variant="secondary" className="text-[9px]">{categoryLabel[t.category] || t.category}</Badge>
                        <Badge variant="secondary" className="text-[9px]">{statusLabel[t.status] || t.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(t.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                      </span>

                      {t.admin_reply && (
                        <div className="mt-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">Respuesta del equipo:</span>
                          <p className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{t.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
