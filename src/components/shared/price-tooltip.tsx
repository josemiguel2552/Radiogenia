"use client";

const RATES: Record<string, { symbol: string; rate: number; code: string }> = {
  MXN: { symbol: "$", rate: 20, code: "MXN" },
  COP: { symbol: "$", rate: 4200, code: "COP" },
  CLP: { symbol: "$", rate: 950, code: "CLP" },
  ARS: { symbol: "$", rate: 1200, code: "ARS" },
};

function formatLocal(usd: number, r: { symbol: string; rate: number; code: string }) {
  const val = Math.round(usd * r.rate);
  const formatted = val.toLocaleString("es");
  return `~${r.symbol}${formatted} ${r.code}`;
}

export function PriceTooltip({ usd, inline = false }: { usd: number; inline?: boolean }) {
  if (usd <= 0) return null;

  if (inline) {
    return (
      <span className="flex flex-wrap gap-1 mt-1.5">
        {Object.values(RATES).map((r) => (
          <span
            key={r.code}
            className="inline-block text-[9px] leading-none px-1.5 py-0.5 rounded bg-white/5 dark:bg-white/5 text-gray-400 dark:text-gray-500 border border-white/5 dark:border-white/5"
          >
            {formatLocal(usd, r)}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="relative inline-block group cursor-default">
      <span className="text-[9px] align-super text-gray-400 dark:text-gray-500 ml-0.5">*</span>
      <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-800 border border-gray-700 px-2.5 py-1.5 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
        {Object.values(RATES).map((r) => (
          <span key={r.code} className="block text-[10px] text-gray-200 leading-relaxed">
            {formatLocal(usd, r)}
          </span>
        ))}
      </span>
    </span>
  );
}
