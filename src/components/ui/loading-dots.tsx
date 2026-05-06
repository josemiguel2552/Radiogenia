"use client";

import { cn } from "@/lib/utils";

export function LoadingDots({ className, size = "sm" }: { className?: string; size?: "xs" | "sm" | "md" }) {
  const dotSize = size === "xs" ? "h-1 w-1" : size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const gap = size === "xs" ? "gap-0.5" : "gap-1";

  return (
    <span className={cn("inline-flex items-center", gap, className)}>
      <span className={cn(dotSize, "rounded-full bg-current animate-[loading-dot_1.4s_ease-in-out_infinite]")} />
      <span className={cn(dotSize, "rounded-full bg-current animate-[loading-dot_1.4s_ease-in-out_0.2s_infinite]")} />
      <span className={cn(dotSize, "rounded-full bg-current animate-[loading-dot_1.4s_ease-in-out_0.4s_infinite]")} />
    </span>
  );
}
