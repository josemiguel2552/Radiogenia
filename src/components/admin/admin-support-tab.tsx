"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, MessageSquare, CheckCircle, Clock, AlertCircle, ChevronDown,
} from "lucide-react";
import type { SupportTicket, SupportTicketStatus } from "@/lib/types";

export function AdminSupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/support" : `/api/admin/support?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) setTickets(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleReply(ticketId: string) {
    if (!replyText.trim()) return;
    setSaving(true);
    await fetch("/api/admin/support", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, admin_reply: replyText.trim(), status: "resolved" }),
    });
    setSaving(false);
    setReplyingId(null);
    setReplyText("");
    await load();
  }

  async function handleStatusChange(ticketId: string, status: SupportTicketStatus) {
    await fetch("/api/admin/support", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, status }),
    });
    await load();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case "open": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      case "in_progress": return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case "resolved": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      default: return <MessageSquare className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "in_progress": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "resolved": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Group by org
  const orgGroups = new Map<string, SupportTicket[]>();
  const individualTickets: SupportTicket[] = [];
  for (const t of tickets) {
    if (t.org_name) {
      const group = orgGroups.get(t.org_name) || [];
      group.push(t);
      orgGroups.set(t.org_name, group);
    } else {
      individualTickets.push(t);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Support Tickets
          {openCount > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px]">
              {openCount} open
            </Badge>
          )}
        </h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No tickets {filter !== "all" ? `with status "${filter}"` : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Org-grouped tickets */}
          {Array.from(orgGroups.entries()).map(([orgName, orgTickets]) => (
            <div key={orgName}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {orgName}
                <Badge variant="secondary" className="text-[9px] ml-1">{orgTickets.length}</Badge>
              </h3>
              <div className="space-y-1.5">
                {orgTickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    expanded={expanded.has(t.id)}
                    onToggle={() => toggleExpand(t.id)}
                    statusIcon={statusIcon}
                    statusColor={statusColor}
                    replyingId={replyingId}
                    replyText={replyText}
                    saving={saving}
                    onStartReply={(id) => { setReplyingId(id); setReplyText(""); }}
                    onReplyChange={setReplyText}
                    onSendReply={handleReply}
                    onStatusChange={handleStatusChange}
                    onCancelReply={() => setReplyingId(null)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Individual tickets */}
          {individualTickets.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Individual Users
                <Badge variant="secondary" className="text-[9px] ml-1">{individualTickets.length}</Badge>
              </h3>
              <div className="space-y-1.5">
                {individualTickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    expanded={expanded.has(t.id)}
                    onToggle={() => toggleExpand(t.id)}
                    statusIcon={statusIcon}
                    statusColor={statusColor}
                    replyingId={replyingId}
                    replyText={replyText}
                    saving={saving}
                    onStartReply={(id) => { setReplyingId(id); setReplyText(""); }}
                    onReplyChange={setReplyText}
                    onSendReply={handleReply}
                    onStatusChange={handleStatusChange}
                    onCancelReply={() => setReplyingId(null)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketRow({
  ticket: t, expanded, onToggle, statusIcon, statusColor,
  replyingId, replyText, saving,
  onStartReply, onReplyChange, onSendReply, onStatusChange, onCancelReply,
}: {
  ticket: SupportTicket;
  expanded: boolean;
  onToggle: () => void;
  statusIcon: (s: string) => React.ReactNode;
  statusColor: (s: string) => string;
  replyingId: string | null;
  replyText: string;
  saving: boolean;
  onStartReply: (id: string) => void;
  onReplyChange: (text: string) => void;
  onSendReply: (id: string) => void;
  onStatusChange: (id: string, status: SupportTicketStatus) => void;
  onCancelReply: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <button type="button" className="w-full text-left" onClick={onToggle}>
          <div className="flex items-center gap-2">
            {statusIcon(t.status)}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">
                {t.subject || t.body.slice(0, 60)}
              </span>
              <span className="text-[10px] text-gray-400">
                {t.user_name || t.user_email} — {new Date(t.created_at).toLocaleDateString()}
              </span>
            </div>
            <Badge className={`text-[9px] ${statusColor(t.status)}`}>{t.status}</Badge>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{t.body}</p>

            {t.admin_reply && (
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">Admin reply:</span>
                <p className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{t.admin_reply}</p>
              </div>
            )}

            {replyingId === t.id ? (
              <div className="space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => onReplyChange(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  autoFocus
                />
                <div className="flex gap-1.5 justify-end">
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onCancelReply}>Cancel</Button>
                  <Button size="sm" className="h-7 text-[10px]" onClick={() => onSendReply(t.id)} disabled={saving || !replyText.trim()}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reply & Resolve"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onStartReply(t.id)}>
                  Reply
                </Button>
                {t.status === "open" && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onStatusChange(t.id, "in_progress")}>
                    Mark In Progress
                  </Button>
                )}
                {t.status !== "closed" && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onStatusChange(t.id, "closed")}>
                    Close
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
