"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "cookie_consent";

export function CookieBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept(value: "all" | "essential") {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          {t("cookie.message")}{" "}
          <a href="/legal" className="underline hover:text-foreground">
            {t("cookie.privacy_link")}
          </a>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => accept("essential")}>
            {t("cookie.reject")}
          </Button>
          <Button size="sm" onClick={() => accept("all")}>
            {t("cookie.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
