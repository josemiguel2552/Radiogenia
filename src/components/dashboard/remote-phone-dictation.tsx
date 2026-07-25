"use client";

/* Desktop side of phone-as-dictaphone. Shows a QR pairing code, keeps a
   Supabase Realtime channel open, and forwards the text dictated on the
   phone into the dictation box via the callbacks below. Desktop-only:
   the trigger is hidden on small screens (mobile users dictate in place). */

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Smartphone, Loader2, CheckCircle2, Unlink } from "lucide-react";

export interface RemoteDictationContext {
  language: string;
  templateSections?: string;
  studyContext?: string;
  modality?: string;
  studyType?: string;
}

interface RemotePhoneDictationProps {
  getContext: () => RemoteDictationContext;
  onFinal: (text: string) => void;
  onRefine: (text: string) => void;
  onRecStart: () => void;
  onRecStop: () => void;
}

export function RemotePhoneDictation({
  getContext,
  onFinal,
  onRefine,
  onRecStart,
  onRecStop,
}: RemotePhoneDictationProps) {
  const t = useT();
  const { prefs } = useUIPrefs();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [phonePresent, setPhonePresent] = useState(false);
  const [phoneRecording, setPhoneRecording] = useState(false);
  const [error, setError] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const getContextRef = useRef(getContext);
  getContextRef.current = getContext;
  const callbacksRef = useRef({ onFinal, onRefine, onRecStart, onRecStop });
  callbacksRef.current = { onFinal, onRefine, onRecStart, onRecStop };

  const sendSettings = useCallback(() => {
    const ctx = getContextRef.current();
    channelRef.current?.send({
      type: "broadcast",
      event: "msg",
      payload: { type: "settings", ...ctx },
    }).catch(() => {});
  }, []);

  const teardown = useCallback((notifyPhone: boolean) => {
    const channel = channelRef.current;
    if (channel) {
      if (notifyPhone) {
        channel.send({ type: "broadcast", event: "msg", payload: { type: "end" } }).catch(() => {});
      }
      channel.unsubscribe();
    }
    channelRef.current = null;
    setLinked(false);
    setPhonePresent(false);
    setPhoneRecording(false);
    setQrDataUrl(null);
  }, []);

  useEffect(() => () => teardown(true), [teardown]);

  const startPairing = useCallback(async () => {
    setStarting(true);
    setError(false);
    try {
      const res = await fetch("/api/remote-dictation/token", { method: "POST" });
      if (!res.ok) throw new Error("token");
      const { token, channelId } = await res.json();

      const lang = prefs.uiLanguage || "es";
      const dictLang = getContextRef.current().language || "es";
      const url = `${window.location.origin}/remote-dictation?t=${encodeURIComponent(token)}&lang=${lang}&dl=${encodeURIComponent(dictLang)}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 1 });

      const supabase = createClient();
      const channel = supabase.channel(`rd-${channelId}`, {
        config: { broadcast: { self: false }, presence: { key: "desktop" } },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "msg" }, ({ payload }) => {
          if (!payload) return;
          switch (payload.type) {
            case "hello":
              sendSettings();
              break;
            case "final":
              if (typeof payload.text === "string" && payload.text) callbacksRef.current.onFinal(payload.text);
              break;
            case "refine":
              if (typeof payload.text === "string" && payload.text) callbacksRef.current.onRefine(payload.text);
              break;
            case "rec-start":
              setPhoneRecording(true);
              // Re-send settings so the phone has the latest study context.
              sendSettings();
              callbacksRef.current.onRecStart();
              break;
            case "rec-stop":
              setPhoneRecording(false);
              callbacksRef.current.onRecStop();
              break;
          }
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const present = Boolean(state["phone"]?.length);
          setPhonePresent(present);
          if (!present) setPhoneRecording(false);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ role: "desktop" });
          }
        });

      setQrDataUrl(dataUrl);
      setLinked(true);
      setDialogOpen(true);
    } catch {
      setError(true);
      teardown(false);
      setDialogOpen(true);
    } finally {
      setStarting(false);
    }
  }, [prefs.uiLanguage, sendSettings, teardown]);

  const handleTriggerClick = useCallback(() => {
    if (linked) {
      setDialogOpen(true);
    } else {
      startPairing();
    }
  }, [linked, startPairing]);

  const handleUnlink = useCallback(() => {
    teardown(true);
    setDialogOpen(false);
  }, [teardown]);

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={starting}
        className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
          linked && phonePresent
            ? "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40"
            : "text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        {starting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Smartphone className="h-3.5 w-3.5" />
        )}
        {linked && phonePresent
          ? (phoneRecording ? t("rd.phone_recording") : t("rd.connected"))
          : t("rd.button")}
        {linked && phonePresent && (
          <span className={`h-1.5 w-1.5 rounded-full ${phoneRecording ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
        )}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> {t("rd.button")}
            </DialogTitle>
            <DialogDescription>
              {phonePresent ? t("rd.connected_hint") : t("rd.scan_hint")}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-sm text-red-500 text-center py-6">{t("rd.error")}</p>
          ) : phonePresent ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {phoneRecording ? t("rd.phone_recording") : t("rd.connected")}
              </p>
            </div>
          ) : qrDataUrl ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR" className="h-52 w-52" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{t("rd.scan")}</p>
              <p className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("rd.waiting")}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{t("rd.link_info")}</p>
            {linked && (
              <Button variant="outline" size="sm" onClick={handleUnlink} className="gap-1.5 text-xs shrink-0">
                <Unlink className="h-3 w-3" /> {t("rd.disconnect")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
