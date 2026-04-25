"use client";

import { useT } from "@/lib/i18n";

export function AnatomyLoader({ label }: { label?: string }) {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-5 select-none">
      <div className="relative">
        <svg
          viewBox="0 0 240 520"
          className="w-36 h-auto anatomy-figure"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ── Skull ── */}
          <ellipse cx="120" cy="42" rx="30" ry="34" className="a-bone" style={{ animationDelay: "0s" }} />
          <path d="M104 30 Q108 22, 120 20 Q132 22, 136 30" className="a-bone-light" style={{ animationDelay: "0.1s" }} />
          <ellipse cx="110" cy="38" rx="4" ry="5" className="a-bone-light" style={{ animationDelay: "0.15s" }} />
          <ellipse cx="130" cy="38" rx="4" ry="5" className="a-bone-light" style={{ animationDelay: "0.15s" }} />
          <path d="M112 52 Q120 56, 128 52" className="a-bone-light" style={{ animationDelay: "0.2s" }} />
          <line x1="120" y1="44" x2="120" y2="50" className="a-bone-light" style={{ animationDelay: "0.18s" }} />

          {/* ── Cervical spine ── */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={`cv${i}`} x="114" y={78 + i * 8} width="12" height="5" rx="2" className="a-bone" style={{ animationDelay: `${0.25 + i * 0.04}s` }} />
          ))}

          {/* ── Mandible ── */}
          <path d="M100 56 Q96 68, 104 76 L120 80 L136 76 Q144 68, 140 56" className="a-bone" style={{ animationDelay: "0.22s" }} />

          {/* ── Clavicles ── */}
          <path d="M104 112 Q88 108, 60 116" className="a-bone" style={{ animationDelay: "0.4s" }} />
          <path d="M136 112 Q152 108, 180 116" className="a-bone" style={{ animationDelay: "0.4s" }} />

          {/* ── Scapulae ── */}
          <path d="M54 118 Q48 130, 50 160 Q52 162, 58 158 L62 126 Q60 118, 54 118Z" className="a-bone-light" style={{ animationDelay: "0.45s" }} />
          <path d="M186 118 Q192 130, 190 160 Q188 162, 182 158 L178 126 Q180 118, 186 118Z" className="a-bone-light" style={{ animationDelay: "0.45s" }} />

          {/* ── Sternum ── */}
          <rect x="116" y="114" width="8" height="50" rx="3" className="a-bone" style={{ animationDelay: "0.5s" }} />
          <path d="M116 164 L112 174 L120 178 L128 174 L124 164" className="a-bone" style={{ animationDelay: "0.55s" }} />

          {/* ── Ribcage (12 pairs) ── */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
            const y = 118 + i * 6;
            const curve = 4 + i * 1.8;
            const w = 38 + Math.min(i, 7) * 5 - Math.max(0, i - 7) * 6;
            const d = `${0.5 + i * 0.06}s`;
            return (
              <g key={`rib${i}`}>
                <path d={`M116 ${y} Q${116 - w * 0.5} ${y + curve}, ${116 - w} ${y + curve * 1.5}`} className="a-bone-light" style={{ animationDelay: d }} />
                <path d={`M124 ${y} Q${124 + w * 0.5} ${y + curve}, ${124 + w} ${y + curve * 1.5}`} className="a-bone-light" style={{ animationDelay: d }} />
              </g>
            );
          })}

          {/* ── Thoracic & lumbar spine ── */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <rect key={`tv${i}`} x="114" y={114 + i * 7} width="12" height="4" rx="1.5" className="a-bone" style={{ animationDelay: `${0.5 + i * 0.05}s` }} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={`lv${i}`} x="113" y={196 + i * 9} width="14" height="5" rx="2" className="a-bone" style={{ animationDelay: `${1.1 + i * 0.06}s` }} />
          ))}

          {/* ── Pelvis ── */}
          <path
            d="M80 246 Q62 260, 58 286 Q56 300, 72 308 L94 298 Q102 290, 104 278"
            className="a-bone" style={{ animationDelay: "1.4s" }}
          />
          <path
            d="M160 246 Q178 260, 182 286 Q184 300, 168 308 L146 298 Q138 290, 136 278"
            className="a-bone" style={{ animationDelay: "1.4s" }}
          />
          <path d="M80 246 L104 248 L120 254 L136 248 L160 246" className="a-bone" style={{ animationDelay: "1.35s" }} />

          {/* ── Sacrum ── */}
          <path d="M113 244 L108 270 L120 280 L132 270 L127 244" className="a-bone" style={{ animationDelay: "1.42s" }} />

          {/* ── Femoral heads ── */}
          <circle cx="88" cy="304" r="10" className="a-bone" style={{ animationDelay: "1.5s" }} />
          <circle cx="152" cy="304" r="10" className="a-bone" style={{ animationDelay: "1.5s" }} />

          {/* ── Arms (humerus, radius/ulna) ── */}
          <line x1="58" y1="120" x2="44" y2="196" className="a-bone" style={{ animationDelay: "1.0s" }} />
          <line x1="182" y1="120" x2="196" y2="196" className="a-bone" style={{ animationDelay: "1.0s" }} />
          <line x1="44" y1="196" x2="36" y2="268" className="a-bone" style={{ animationDelay: "1.15s" }} />
          <line x1="44" y1="196" x2="42" y2="268" className="a-bone-light" style={{ animationDelay: "1.18s" }} />
          <line x1="196" y1="196" x2="204" y2="268" className="a-bone" style={{ animationDelay: "1.15s" }} />
          <line x1="196" y1="196" x2="198" y2="268" className="a-bone-light" style={{ animationDelay: "1.18s" }} />

          {/* ── Hands (simplified) ── */}
          <path d="M36 268 L32 280 M36 268 L36 282 M36 268 L40 280 M36 268 L28 276" className="a-bone-light" style={{ animationDelay: "1.25s" }} />
          <path d="M204 268 L208 280 M204 268 L204 282 M204 268 L200 280 M204 268 L212 276" className="a-bone-light" style={{ animationDelay: "1.25s" }} />

          {/* ── Legs (femur, patella, tibia/fibula) ── */}
          <line x1="88" y1="314" x2="82" y2="392" className="a-bone" style={{ animationDelay: "1.6s" }} />
          <line x1="152" y1="314" x2="158" y2="392" className="a-bone" style={{ animationDelay: "1.6s" }} />
          <ellipse cx="82" cy="394" rx="6" ry="5" className="a-bone" style={{ animationDelay: "1.72s" }} />
          <ellipse cx="158" cy="394" rx="6" ry="5" className="a-bone" style={{ animationDelay: "1.72s" }} />
          <line x1="82" y1="400" x2="80" y2="468" className="a-bone" style={{ animationDelay: "1.8s" }} />
          <line x1="82" y1="400" x2="86" y2="466" className="a-bone-light" style={{ animationDelay: "1.82s" }} />
          <line x1="158" y1="400" x2="160" y2="468" className="a-bone" style={{ animationDelay: "1.8s" }} />
          <line x1="158" y1="400" x2="154" y2="466" className="a-bone-light" style={{ animationDelay: "1.82s" }} />

          {/* ── Feet ── */}
          <path d="M80 468 Q72 476, 66 478 L80 480 L90 474 Q86 468, 80 468" className="a-bone" style={{ animationDelay: "1.9s" }} />
          <path d="M160 468 Q168 476, 174 478 L160 480 L150 474 Q154 468, 160 468" className="a-bone" style={{ animationDelay: "1.9s" }} />

          {/* ══════ Organs (fade in after skeleton) ══════ */}

          {/* Brain */}
          <path d="M106 26 Q104 18, 112 14 Q120 10, 128 14 Q136 18, 134 26" className="a-organ-accent" style={{ animationDelay: "2.2s" }} />
          <path d="M106 26 Q110 34, 120 34 Q130 34, 134 26" className="a-organ-accent" style={{ animationDelay: "2.25s" }} />

          {/* Heart */}
          <path
            d="M110 140 Q104 132, 110 126 Q116 120, 120 130 Q124 120, 130 126 Q136 132, 130 140 L120 156 Z"
            className="a-organ-heart" style={{ animationDelay: "2.4s" }}
          />

          {/* Lungs */}
          <path
            d="M78 122 Q70 128, 68 148 Q66 168, 70 178 Q76 184, 84 176 L90 142 Q88 126, 78 122Z"
            className="a-organ" style={{ animationDelay: "2.5s" }}
          />
          <path
            d="M162 122 Q170 128, 172 148 Q174 168, 170 178 Q164 184, 156 176 L150 142 Q152 126, 162 122Z"
            className="a-organ" style={{ animationDelay: "2.5s" }}
          />

          {/* Diaphragm line */}
          <path d="M68 182 Q94 194, 120 190 Q146 194, 172 182" className="a-organ-line" style={{ animationDelay: "2.6s" }} />

          {/* Liver */}
          <path
            d="M86 192 Q82 200, 92 210 Q108 218, 130 210 Q144 204, 146 196 Q138 192, 86 192Z"
            className="a-organ" style={{ animationDelay: "2.7s" }}
          />

          {/* Stomach */}
          <path
            d="M100 196 Q92 204, 94 218 Q96 228, 108 230 Q116 228, 118 218 Q118 206, 112 196"
            className="a-organ" style={{ animationDelay: "2.75s" }}
          />

          {/* Spleen */}
          <ellipse cx="152" cy="208" rx="10" ry="14" className="a-organ" style={{ animationDelay: "2.8s" }} />

          {/* Kidneys */}
          <path d="M82 214 Q78 222, 80 232 Q82 238, 88 236 Q92 228, 90 220 Q88 214, 82 214Z" className="a-organ-accent" style={{ animationDelay: "2.85s" }} />
          <path d="M158 214 Q162 222, 160 232 Q158 238, 152 236 Q148 228, 150 220 Q152 214, 158 214Z" className="a-organ-accent" style={{ animationDelay: "2.85s" }} />

          {/* Bladder */}
          <ellipse cx="120" cy="270" rx="12" ry="10" className="a-organ" style={{ animationDelay: "2.95s" }} />

          {/* ══════ CT Scan line ══════ */}
          <line x1="30" y1="0" x2="210" y2="0" className="a-scanline" />
        </svg>

        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-accent/5 rounded-2xl pointer-events-none" />
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 animate-pulse">
          {label || t("dash.generating")}
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0s" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.15s" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>

      <style jsx>{`
        /* ── Skeleton bones ── */
        .a-bone {
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          opacity: 0;
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          animation: draw-bone 2.4s ease forwards;
        }
        .a-bone-light {
          stroke: currentColor;
          stroke-width: 0.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          opacity: 0;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: draw-bone-light 2.4s ease forwards;
        }

        /* ── Organs ── */
        .a-organ {
          fill: currentColor;
          opacity: 0;
          animation: fade-organ 1s ease forwards;
        }
        .a-organ-accent {
          fill: var(--organ-accent, #8b5cf6);
          opacity: 0;
          animation: fade-organ 1s ease forwards;
        }
        .a-organ-heart {
          fill: var(--organ-heart, #ef4444);
          opacity: 0;
          animation: fade-organ-heart 1s ease forwards;
        }
        .a-organ-line {
          stroke: currentColor;
          stroke-width: 0.8;
          stroke-dasharray: 4 3;
          fill: none;
          opacity: 0;
          animation: fade-organ 0.8s ease forwards;
        }

        /* ── CT scan sweep ── */
        .a-scanline {
          stroke: var(--scan-color, #8b5cf6);
          stroke-width: 2;
          opacity: 0.4;
          filter: drop-shadow(0 0 6px var(--scan-color, #8b5cf6));
          animation: ct-scan 3.2s ease-in-out infinite;
        }

        /* ── Figure colors ── */
        .anatomy-figure {
          color: var(--bone-color, #94a3b8);
          --organ-accent: #8b5cf6;
          --organ-heart: #ef4444;
          --scan-color: #8b5cf6;
        }
        :global(.dark) .anatomy-figure {
          color: var(--bone-color, #cbd5e1);
          --organ-accent: #a78bfa;
          --organ-heart: #f87171;
          --scan-color: #a78bfa;
        }

        /* ── Keyframes ── */
        @keyframes draw-bone {
          0% { opacity: 0; stroke-dashoffset: 800; }
          20% { opacity: 0.7; }
          100% { opacity: 0.7; stroke-dashoffset: 0; }
        }
        @keyframes draw-bone-light {
          0% { opacity: 0; stroke-dashoffset: 600; }
          20% { opacity: 0.3; }
          100% { opacity: 0.3; stroke-dashoffset: 0; }
        }
        @keyframes fade-organ {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 0.15; transform: scale(1); }
        }
        @keyframes fade-organ-heart {
          0% { opacity: 0; transform: scale(0.85); }
          50% { opacity: 0.25; transform: scale(1.04); }
          100% { opacity: 0.22; transform: scale(1); }
        }
        @keyframes ct-scan {
          0% { transform: translateY(0px); opacity: 0; }
          5% { opacity: 0.5; }
          50% { transform: translateY(520px); opacity: 0.3; }
          55% { opacity: 0; }
          100% { transform: translateY(0px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
