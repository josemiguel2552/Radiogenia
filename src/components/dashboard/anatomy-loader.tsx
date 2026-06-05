"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";

export function AnatomyLoader({ label }: { label?: string }) {
  const t = useT();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6 select-none">
      <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center overflow-hidden rounded-2xl">
        <div className="relative w-full" style={{ aspectRatio: "1902/827" }}>
          {!imgError ? (
            <img
              src="/anatomy-loader.png"
              alt=""
              className="w-full h-full object-contain loader-breathe"
              onError={() => setImgError(true)}
            />
          ) : (
            <FallbackAnatomy />
          )}

          {/* Horizontal shimmer sweep */}
          <div className="absolute inset-0 loader-shimmer pointer-events-none" />

          {/* Scan line — vertical sweep */}
          <div className="absolute inset-y-0 w-px scan-line pointer-events-none" />

          {/* Edge vignette */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              boxShadow: "inset 0 0 60px 20px hsl(var(--background))",
            }}
          />
        </div>
      </div>

      {/* Label + progress bar */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 tracking-wide">
          {label || t("dash.generating")}
        </p>
        <div className="w-full h-1 rounded-full bg-gray-200/60 dark:bg-gray-700/40 overflow-hidden">
          <div className="h-full rounded-full progress-indeterminate" />
        </div>
      </div>

      <style jsx>{`
        .loader-breathe {
          animation: breathe 4s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.7; filter: brightness(0.95); }
          50% { opacity: 0.9; filter: brightness(1.08); }
        }

        .loader-shimmer {
          background: linear-gradient(
            105deg,
            transparent 40%,
            hsl(var(--primary) / 0.06) 45%,
            hsl(var(--primary) / 0.12) 50%,
            hsl(var(--primary) / 0.06) 55%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: shimmer 2.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .scan-line {
          background: linear-gradient(
            180deg,
            transparent 0%,
            hsl(var(--primary) / 0.4) 40%,
            hsl(var(--primary) / 0.8) 50%,
            hsl(var(--primary) / 0.4) 60%,
            transparent 100%
          );
          box-shadow:
            0 0 12px 3px hsl(var(--primary) / 0.15),
            0 0 30px 6px hsl(var(--primary) / 0.08);
          height: 60%;
          top: 20%;
          animation: scan-x 4s ease-in-out infinite;
        }
        @keyframes scan-x {
          0%, 100% { left: -2%; opacity: 0; }
          5% { opacity: 1; }
          50% { left: 102%; opacity: 0.6; }
          55% { opacity: 0; }
          60% { left: 102%; }
          65% { opacity: 1; }
          95% { left: -2%; opacity: 0.6; }
        }

        .progress-indeterminate {
          width: 40%;
          background: linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--primary) / 0.6));
          animation: indeterminate 1.8s ease-in-out infinite;
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

function FallbackAnatomy() {
  return (
    <svg viewBox="0 0 200 420" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M100 20 C80 20 65 35 65 55 C65 70 75 80 80 85 L75 95 L55 100 C40 105 30 120 30 135 L30 210 C30 220 35 225 45 225 L50 225 L50 240 C50 245 52 248 55 248 L60 248 L58 330 C58 340 62 348 70 348 L75 380 C75 390 80 400 90 400 L92 400 C95 400 98 395 98 390 L100 348 L100 348 L102 390 C102 395 105 400 108 400 L110 400 C120 400 125 390 125 380 L130 348 C138 348 142 340 142 330 L140 248 L145 248 C148 248 150 245 150 240 L150 225 L155 225 C165 225 170 220 170 210 L170 135 C170 120 160 105 145 100 L125 95 L120 85 C125 80 135 70 135 55 C135 35 120 20 100 20Z"
        className="fill-gray-200 dark:fill-gray-700"
        opacity="0.5"
      />
      <ellipse cx="100" cy="40" rx="22" ry="18" className="fill-purple-300/30 dark:fill-purple-400/20 stroke-purple-400/40" strokeWidth="0.8" />
      <path d="M92 130 C86 122 86 116 92 112 C96 110 100 114 100 120 C100 114 104 110 108 112 C114 116 114 122 108 130 L100 142Z"
        className="fill-red-400/30 dark:fill-red-400/20" />
      <path d="M72 115 C62 120 58 135 60 155 C62 165 68 168 74 162 L80 130 C78 120 72 115 72 115Z"
        className="fill-blue-300/25 dark:fill-blue-400/15" />
      <path d="M128 115 C138 120 142 135 140 155 C138 165 132 168 126 162 L120 130 C122 120 128 115 128 115Z"
        className="fill-blue-300/25 dark:fill-blue-400/15" />
      <path d="M78 170 C74 178 82 188 100 188 C118 188 126 180 124 172 C118 168 78 168 78 170Z"
        className="fill-amber-400/25 dark:fill-amber-400/15" />
      <ellipse cx="75" cy="198" rx="8" ry="12" className="fill-orange-300/25 dark:fill-orange-400/15" />
      <ellipse cx="125" cy="198" rx="8" ry="12" className="fill-orange-300/25 dark:fill-orange-400/15" />
      <path d="M85 210 C80 220 82 240 90 245 C95 248 100 240 105 245 C110 248 115 240 112 230 C110 220 105 215 100 210 C95 208 88 208 85 210Z"
        className="fill-green-300/20 dark:fill-violet-400/12" />
      <path d="M100 55 L100 85 L100 120 L100 170 L100 220 L100 270 L95 340 M100 270 L105 340"
        className="stroke-red-400/30 dark:stroke-red-400/20" strokeWidth="1" fill="none" />
      <path d="M100 95 L75 100 L50 130 M100 95 L125 100 L150 130"
        className="stroke-red-400/20 dark:stroke-red-400/12" strokeWidth="0.8" fill="none" />
    </svg>
  );
}
