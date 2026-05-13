"use client";

import { useId } from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
  forceDark?: boolean;
  className?: string;
}

export function Logo({ size = "md", variant = "full", forceDark = false, className = "" }: LogoProps) {
  const uid = useId();
  const gradId = `logo-grad-${uid}`;
  const sizes = {
    sm: { icon: 20, text: "text-sm", gap: "gap-1.5" },
    md: { icon: 24, text: "text-lg", gap: "gap-2" },
    lg: { icon: 32, text: "text-2xl", gap: "gap-2.5" },
  };
  const s = sizes[size];

  const icon = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <rect width="32" height="32" rx="7" fill={`url(#${gradId})`} />
      <path
        d="M10 8h7a5 5 0 0 1 0 10h-3l5 6"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.2" fill="#5EEAD4" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === "icon") return <span className={className}>{icon}</span>;

  const textColor = forceDark ? "text-white" : "text-gray-900 dark:text-white";
  const accentColor = forceDark ? "text-teal-400" : "text-teal-600 dark:text-teal-400";

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      {icon}
      <span className={`${s.text} font-bold tracking-tight`}>
        <span className={textColor}>Radiogen</span>
        <span className={accentColor}>.AI</span>
      </span>
    </span>
  );
}
