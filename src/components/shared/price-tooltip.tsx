"use client";

import { useState } from "react";

const RATES: Record<string, { symbol: string; rate: number; code: string }> = {
  MXN: { symbol: "$", rate: 20, code: "MXN" },
  COP: { symbol: "$", rate: 4200, code: "COP" },
  ARS: { symbol: "$", rate: 1200, code: "ARS" },
};

function formatLocal(usd: number, r: { symbol: string; rate: number; code: string }) {
  const val = Math.round(usd * r.rate);
  const formatted = val.toLocaleString("es");
  return `${r.symbol}${formatted} ${r.code}`;
}

export function PriceTooltip({ usd }: { usd: number }) {
  const [open, setOpen] = useState(false);

  if (usd <= 0) return null;

  return (
    <span
      className="relative inline-block cursor-default"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="text-[9px] align-super text-gray-400 dark:text-gray-500 ml-0.5">*</span>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-800 border border-gray-700 px-2.5 py-1.5 shadow-lg">
          {Object.values(RATES).map((r) => (
            <span key={r.code} className="block text-[10px] text-gray-200 leading-relaxed">
              {formatLocal(usd, r)}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
