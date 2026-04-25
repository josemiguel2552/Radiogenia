"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";

export function AnatomyLoader({ label }: { label?: string }) {
  const t = useT();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 select-none">
      <div className="relative w-full max-w-md mx-auto flex items-center justify-center overflow-hidden rounded-xl" style={{ aspectRatio: "1902/827" }}>
        {!imgError ? (
          <img
            src="/anatomy-loader.png"
            alt=""
            className="w-full h-full object-contain opacity-85 dark:opacity-75"
            onError={() => setImgError(true)}
          />
        ) : (
          <FallbackAnatomy />
        )}

        {/* CT scan sweep line */}
        <div className="absolute inset-x-0 h-1 scan-sweep pointer-events-none" />

        {/* Soft glow backdrop */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--primary) / 0.06), transparent 30%, transparent 70%, hsl(var(--primary) / 0.06))",
          }}
        />
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 animate-pulse">
          {label || t("dash.generating")}
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0s" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0.15s" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>

      <style jsx>{`
        .scan-sweep {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.3) 30%,
            hsl(var(--primary) / 0.6) 50%,
            hsl(var(--primary) / 0.3) 70%,
            transparent 100%
          );
          box-shadow: 0 0 20px 4px hsl(var(--primary) / 0.2);
          animation: ct-scan 3s ease-in-out infinite;
        }

        @keyframes ct-scan {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          50% { top: 96%; opacity: 0.7; }
          55% { opacity: 0; }
          60% { top: 96%; }
          65% { opacity: 1; }
          95% { top: 0%; opacity: 0.7; }
          100% { top: 0%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FallbackAnatomy() {
  return (
    <svg viewBox="0 0 200 420" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Simplified body silhouette */}
      <path
        d="M100 20 C80 20 65 35 65 55 C65 70 75 80 80 85 L75 95 L55 100 C40 105 30 120 30 135 L30 210 C30 220 35 225 45 225 L50 225 L50 240 C50 245 52 248 55 248 L60 248 L58 330 C58 340 62 348 70 348 L75 380 C75 390 80 400 90 400 L92 400 C95 400 98 395 98 390 L100 348 L100 348 L102 390 C102 395 105 400 108 400 L110 400 C120 400 125 390 125 380 L130 348 C138 348 142 340 142 330 L140 248 L145 248 C148 248 150 245 150 240 L150 225 L155 225 C165 225 170 220 170 210 L170 135 C170 120 160 105 145 100 L125 95 L120 85 C125 80 135 70 135 55 C135 35 120 20 100 20Z"
        className="fill-gray-200 dark:fill-gray-700"
        opacity="0.5"
      />
      {/* Brain outline */}
      <ellipse cx="100" cy="40" rx="22" ry="18" className="fill-purple-300/30 dark:fill-purple-400/20 stroke-purple-400/40" strokeWidth="0.8" />
      {/* Heart */}
      <path d="M92 130 C86 122 86 116 92 112 C96 110 100 114 100 120 C100 114 104 110 108 112 C114 116 114 122 108 130 L100 142Z"
        className="fill-red-400/30 dark:fill-red-400/20" />
      {/* Lungs */}
      <path d="M72 115 C62 120 58 135 60 155 C62 165 68 168 74 162 L80 130 C78 120 72 115 72 115Z"
        className="fill-blue-300/25 dark:fill-blue-400/15" />
      <path d="M128 115 C138 120 142 135 140 155 C138 165 132 168 126 162 L120 130 C122 120 128 115 128 115Z"
        className="fill-blue-300/25 dark:fill-blue-400/15" />
      {/* Liver */}
      <path d="M78 170 C74 178 82 188 100 188 C118 188 126 180 124 172 C118 168 78 168 78 170Z"
        className="fill-amber-400/25 dark:fill-amber-400/15" />
      {/* Kidneys */}
      <ellipse cx="75" cy="198" rx="8" ry="12" className="fill-orange-300/25 dark:fill-orange-400/15" />
      <ellipse cx="125" cy="198" rx="8" ry="12" className="fill-orange-300/25 dark:fill-orange-400/15" />
      {/* Intestines */}
      <path d="M85 210 C80 220 82 240 90 245 C95 248 100 240 105 245 C110 248 115 240 112 230 C110 220 105 215 100 210 C95 208 88 208 85 210Z"
        className="fill-green-300/20 dark:fill-green-400/12" />
      {/* Vascular lines */}
      <path d="M100 55 L100 85 L100 120 L100 170 L100 220 L100 270 L95 340 M100 270 L105 340"
        className="stroke-red-400/30 dark:stroke-red-400/20" strokeWidth="1" fill="none" />
      <path d="M100 95 L75 100 L50 130 M100 95 L125 100 L150 130"
        className="stroke-red-400/20 dark:stroke-red-400/12" strokeWidth="0.8" fill="none" />
    </svg>
  );
}
