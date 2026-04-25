"use client";

const DRAW_DURATION = "3s";

export function AnatomyLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 select-none">
      <svg
        viewBox="0 0 200 440"
        className="w-28 h-auto anatomy-draw"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head */}
        <ellipse
          cx="100" cy="38" rx="26" ry="30"
          className="anatomy-stroke"
          style={{ animationDelay: "0s" }}
        />
        {/* Neck */}
        <line
          x1="100" y1="68" x2="100" y2="88"
          className="anatomy-stroke"
          style={{ animationDelay: "0.25s" }}
        />
        {/* Shoulders */}
        <path
          d="M100 88 Q100 98, 58 102"
          className="anatomy-stroke"
          style={{ animationDelay: "0.35s" }}
        />
        <path
          d="M100 88 Q100 98, 142 102"
          className="anatomy-stroke"
          style={{ animationDelay: "0.35s" }}
        />
        {/* Torso */}
        <path
          d="M58 102 L54 210 Q54 218, 72 218 L100 218"
          className="anatomy-stroke"
          style={{ animationDelay: "0.5s" }}
        />
        <path
          d="M142 102 L146 210 Q146 218, 128 218 L100 218"
          className="anatomy-stroke"
          style={{ animationDelay: "0.5s" }}
        />
        {/* Ribcage hints */}
        <path d="M72 120 Q100 128, 128 120" className="anatomy-stroke-light" style={{ animationDelay: "0.7s" }} />
        <path d="M68 140 Q100 150, 132 140" className="anatomy-stroke-light" style={{ animationDelay: "0.8s" }} />
        <path d="M66 160 Q100 170, 134 160" className="anatomy-stroke-light" style={{ animationDelay: "0.9s" }} />
        {/* Spine */}
        <line x1="100" y1="88" x2="100" y2="218" className="anatomy-stroke-light" style={{ animationDelay: "0.6s" }} />
        {/* Pelvis */}
        <path
          d="M72 218 Q68 240, 82 260 L100 252 L118 260 Q132 240, 128 218"
          className="anatomy-stroke"
          style={{ animationDelay: "1s" }}
        />
        {/* Left arm */}
        <path
          d="M58 102 L38 170 L32 210"
          className="anatomy-stroke"
          style={{ animationDelay: "1.1s" }}
        />
        <path
          d="M32 210 L28 240 Q26 248, 22 252"
          className="anatomy-stroke"
          style={{ animationDelay: "1.3s" }}
        />
        {/* Right arm */}
        <path
          d="M142 102 L162 170 L168 210"
          className="anatomy-stroke"
          style={{ animationDelay: "1.1s" }}
        />
        <path
          d="M168 210 L172 240 Q174 248, 178 252"
          className="anatomy-stroke"
          style={{ animationDelay: "1.3s" }}
        />
        {/* Left leg */}
        <path
          d="M82 260 L74 340 L72 380"
          className="anatomy-stroke"
          style={{ animationDelay: "1.5s" }}
        />
        <path
          d="M72 380 L70 410 Q68 420, 58 422"
          className="anatomy-stroke"
          style={{ animationDelay: "1.8s" }}
        />
        {/* Right leg */}
        <path
          d="M118 260 L126 340 L128 380"
          className="anatomy-stroke"
          style={{ animationDelay: "1.5s" }}
        />
        <path
          d="M128 380 L130 410 Q132 420, 142 422"
          className="anatomy-stroke"
          style={{ animationDelay: "1.8s" }}
        />
        {/* Organs — subtle, appear after body is drawn */}
        {/* Heart */}
        <path
          d="M92 130 Q88 124, 94 120 Q100 116, 100 124 Q100 116, 106 120 Q112 124, 108 130 L100 142 Z"
          className="anatomy-organ"
          style={{ animationDelay: "2.1s" }}
        />
        {/* Lungs */}
        <path
          d="M74 118 Q70 140, 72 162 Q76 166, 84 160 L86 126 Q84 118, 74 118Z"
          className="anatomy-organ"
          style={{ animationDelay: "2.3s" }}
        />
        <path
          d="M126 118 Q130 140, 128 162 Q124 166, 116 160 L114 126 Q116 118, 126 118Z"
          className="anatomy-organ"
          style={{ animationDelay: "2.3s" }}
        />
        {/* Liver */}
        <path
          d="M80 170 Q78 180, 90 186 Q104 190, 118 182 Q126 176, 126 170 Q110 174, 80 170Z"
          className="anatomy-organ"
          style={{ animationDelay: "2.5s" }}
        />
        {/* Kidneys */}
        <ellipse cx="78" cy="196" rx="6" ry="10" className="anatomy-organ" style={{ animationDelay: "2.6s" }} />
        <ellipse cx="122" cy="196" rx="6" ry="10" className="anatomy-organ" style={{ animationDelay: "2.6s" }} />
      </svg>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 animate-pulse">
          {label || "Generating report…"}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          AI is structuring your findings
        </p>
      </div>

      <style jsx>{`
        .anatomy-stroke {
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          opacity: 0.6;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: draw-line ${DRAW_DURATION} ease forwards;
        }
        .anatomy-stroke-light {
          stroke: currentColor;
          stroke-width: 1;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          opacity: 0.25;
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: draw-line ${DRAW_DURATION} ease forwards;
        }
        .anatomy-organ {
          fill: currentColor;
          opacity: 0;
          animation: fade-organ 1.2s ease forwards;
        }
        .anatomy-draw {
          color: var(--anatomy-color, #8b5cf6);
        }
        :global(.dark) .anatomy-draw {
          color: var(--anatomy-color, #a78bfa);
        }
        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fade-organ {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 0.18; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
