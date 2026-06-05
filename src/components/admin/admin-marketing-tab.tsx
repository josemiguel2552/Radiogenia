"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2, Copy, CheckCheck, Trash2, Download, Save,
  MessageSquareText, ImageIcon, FolderOpen, Sparkles,
  KeyRound, Eye, EyeOff, ChevronDown, ChevronUp,
  Palette, Mail, Target, Hash, Newspaper, Globe,
} from "lucide-react";

type SubTab = "posts" | "images" | "brand" | "library";
type PostType = "testimonial" | "tip" | "promo" | "educational" | "announcement";
type Platform = "linkedin" | "facebook" | "instagram" | "x";
type ImageStyle = "minimal" | "gradient" | "medical" | "tech";
type Aspect = "square" | "landscape" | "portrait";

interface Asset {
  id: string;
  type: "post" | "image";
  platform: string;
  title: string;
  content: string;
  image_url: string | null;
  metadata: Record<string, string>;
  created_at: string;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "in",
  facebook: "f",
  instagram: "ig",
  x: "𝕏",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  linkedin: "bg-blue-600",
  facebook: "bg-blue-500",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  x: "bg-gray-900 dark:bg-gray-700",
};

const STORAGE_KEY = "radiogenai_marketing_keys";

interface MarketingKeys {
  openaiKey: string;
  textModel: string;
  imageProvider: "together" | "replicate";
  imageApiKey: string;
  imageModel: string;
}

const DEFAULTS: MarketingKeys = {
  openaiKey: "",
  textModel: "gpt-4o-mini",
  imageProvider: "together",
  imageApiKey: "",
  imageModel: "black-forest-labs/FLUX.1-schnell",
};

function loadKeys(): MarketingKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

function saveKeys(keys: MarketingKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

interface BrandAsset {
  id: string;
  label: string;
  category: string;
  width: number;
  height: number;
  bg: "gradient" | "dark" | "white" | "transparent";
  logoVariant: "full" | "icon";
  description: string;
  tagline?: string;
}

const TAGLINE_ES = "Informes radiológicos con IA";
const TAGLINE_EN = "AI-Powered Radiology Reports";

const BRAND_ASSETS: BrandAsset[] = [
  // Profile Pictures
  { id: "profile-dark", label: "Perfil (fondo oscuro)", category: "Perfil", width: 400, height: 400, bg: "dark", logoVariant: "icon", description: "Instagram, Facebook, X, LinkedIn" },
  { id: "profile-gradient", label: "Perfil (gradiente)", category: "Perfil", width: 400, height: 400, bg: "gradient", logoVariant: "icon", description: "Versión con gradiente de marca" },
  { id: "profile-white", label: "Perfil (fondo blanco)", category: "Perfil", width: 400, height: 400, bg: "white", logoVariant: "icon", description: "Para fondos claros" },
  { id: "profile-transparent", label: "Perfil (transparente)", category: "Perfil", width: 400, height: 400, bg: "transparent", logoVariant: "icon", description: "PNG sin fondo" },
  { id: "profile-tiktok", label: "Perfil TikTok", category: "Perfil", width: 200, height: 200, bg: "gradient", logoVariant: "icon", description: "TikTok 200×200" },
  // Full Logo
  { id: "logo-dark-h", label: "Logo completo (oscuro)", category: "Logo", width: 1200, height: 400, bg: "dark", logoVariant: "full", description: "Logo horizontal fondo oscuro" },
  { id: "logo-white-h", label: "Logo completo (blanco)", category: "Logo", width: 1200, height: 400, bg: "white", logoVariant: "full", description: "Logo horizontal fondo blanco" },
  { id: "logo-gradient-h", label: "Logo completo (gradiente)", category: "Logo", width: 1200, height: 400, bg: "gradient", logoVariant: "full", description: "Logo horizontal con gradiente" },
  { id: "logo-transparent-h", label: "Logo completo (transparente)", category: "Logo", width: 1200, height: 400, bg: "transparent", logoVariant: "full", description: "Logo horizontal sin fondo" },
  { id: "logo-tagline-dark", label: "Logo + tagline (oscuro)", category: "Logo", width: 1200, height: 400, bg: "dark", logoVariant: "full", description: "Con eslogan", tagline: TAGLINE_ES },
  { id: "logo-tagline-white", label: "Logo + tagline (blanco)", category: "Logo", width: 1200, height: 400, bg: "white", logoVariant: "full", description: "Con eslogan", tagline: TAGLINE_ES },
  { id: "logo-tagline-en", label: "Logo + tagline (EN)", category: "Logo", width: 1200, height: 400, bg: "dark", logoVariant: "full", description: "English tagline", tagline: TAGLINE_EN },
  // Banners — social media
  { id: "banner-x", label: "Banner X / Twitter", category: "Banners Redes", width: 1500, height: 500, bg: "gradient", logoVariant: "full", description: "1500×500px", tagline: TAGLINE_ES },
  { id: "banner-fb", label: "Banner Facebook", category: "Banners Redes", width: 820, height: 312, bg: "gradient", logoVariant: "full", description: "820×312px", tagline: TAGLINE_ES },
  { id: "banner-linkedin", label: "Banner LinkedIn", category: "Banners Redes", width: 1584, height: 396, bg: "gradient", logoVariant: "full", description: "1584×396px", tagline: TAGLINE_ES },
  { id: "banner-yt", label: "Banner YouTube", category: "Banners Redes", width: 2560, height: 1440, bg: "gradient", logoVariant: "full", description: "2560×1440px", tagline: TAGLINE_ES },
  { id: "banner-tiktok", label: "Banner TikTok", category: "Banners Redes", width: 1150, height: 150, bg: "gradient", logoVariant: "full", description: "TikTok perfil 1150×150" },
  // Post sizes
  { id: "post-square", label: "Post cuadrado", category: "Posts", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "Instagram/Facebook 1080×1080", tagline: TAGLINE_ES },
  { id: "post-landscape", label: "Post paisaje", category: "Posts", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "Facebook/LinkedIn 1200×630", tagline: TAGLINE_ES },
  { id: "post-story", label: "Story / Reel", category: "Posts", width: 1080, height: 1920, bg: "gradient", logoVariant: "full", description: "Instagram/FB/TikTok Story 1080×1920", tagline: TAGLINE_ES },
  { id: "post-pin", label: "Pin Pinterest", category: "Posts", width: 1000, height: 1500, bg: "gradient", logoVariant: "full", description: "Pinterest 1000×1500", tagline: TAGLINE_ES },
  // Email
  { id: "email-header", label: "Cabecera email", category: "Email", width: 600, height: 120, bg: "gradient", logoVariant: "full", description: "Header para newsletters" },
  { id: "email-header-white", label: "Cabecera email (blanco)", category: "Email", width: 600, height: 120, bg: "white", logoVariant: "full", description: "Header fondo claro" },
  { id: "email-sig", label: "Firma email", category: "Email", width: 500, height: 80, bg: "transparent", logoVariant: "full", description: "Firma para correos" },
  { id: "email-footer", label: "Footer email", category: "Email", width: 600, height: 60, bg: "dark", logoVariant: "full", description: "Pie de newsletter" },
  // Web / OG
  { id: "og-image", label: "OG Image (web)", category: "Web", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "Open Graph / meta image", tagline: TAGLINE_ES },
  { id: "og-image-en", label: "OG Image (EN)", category: "Web", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "Open Graph English", tagline: TAGLINE_EN },
  { id: "watermark", label: "Marca de agua", category: "Web", width: 300, height: 80, bg: "transparent", logoVariant: "full", description: "Para superponer en imágenes" },
  { id: "powered-badge", label: "Powered by badge", category: "Web", width: 240, height: 48, bg: "dark", logoVariant: "full", description: "Badge para integrar en webs" },
  { id: "powered-badge-light", label: "Powered by badge (claro)", category: "Web", width: 240, height: 48, bg: "white", logoVariant: "full", description: "Badge fondo claro" },
  // Presentation
  { id: "slide-cover", label: "Slide portada", category: "Presentación", width: 1920, height: 1080, bg: "gradient", logoVariant: "full", description: "16:9 portada presentación", tagline: TAGLINE_ES },
  { id: "slide-header", label: "Slide cabecera", category: "Presentación", width: 1920, height: 200, bg: "gradient", logoVariant: "full", description: "Strip superior para slides" },
  // Favicons / App Icons
  { id: "icon-512", label: "App Icon 512", category: "Iconos", width: 512, height: 512, bg: "gradient", logoVariant: "icon", description: "PWA / App Store 512×512" },
  { id: "icon-192", label: "App Icon 192", category: "Iconos", width: 192, height: 192, bg: "gradient", logoVariant: "icon", description: "PWA 192×192" },
  { id: "icon-180", label: "Apple Touch Icon", category: "Iconos", width: 180, height: 180, bg: "gradient", logoVariant: "icon", description: "iOS home 180×180" },
  { id: "favicon", label: "Favicon", category: "Iconos", width: 32, height: 32, bg: "gradient", logoVariant: "icon", description: "Favicon 32×32" },
  { id: "whatsapp-icon", label: "WhatsApp Business", category: "Iconos", width: 640, height: 640, bg: "gradient", logoVariant: "icon", description: "WhatsApp Business perfil" },
  // ═══ Publicaciones elaboradas ═══
  { id: "pub-feature-square", label: "Feature Highlight", category: "Publicaciones", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Destaca una función", tagline: "feature" },
  { id: "pub-feature-landscape", label: "Feature Highlight (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "LinkedIn/FB — Destaca una función", tagline: "feature" },
  { id: "pub-stats-square", label: "Stats / Métricas", category: "Publicaciones", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Métricas de impacto", tagline: "stats" },
  { id: "pub-stats-landscape", label: "Stats / Métricas (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn/X — Métricas de impacto", tagline: "stats" },
  { id: "pub-quote-square", label: "Testimonial", category: "Publicaciones", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Cita de usuario", tagline: "quote" },
  { id: "pub-quote-landscape", label: "Testimonial (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "white", logoVariant: "full", description: "LinkedIn — Cita de usuario", tagline: "quote" },
  { id: "pub-tip-square", label: "Tip educativo", category: "Publicaciones", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Consejo radiológico", tagline: "tip" },
  { id: "pub-tip-story", label: "Tip educativo (story)", category: "Publicaciones", width: 1080, height: 1920, bg: "gradient", logoVariant: "full", description: "IG/TikTok Story — Consejo", tagline: "tip" },
  { id: "pub-launch-square", label: "Anuncio / Launch", category: "Publicaciones", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Nueva función o lanzamiento", tagline: "launch" },
  { id: "pub-launch-landscape", label: "Anuncio / Launch (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn/X — Lanzamiento", tagline: "launch" },
  { id: "pub-launch-story", label: "Anuncio / Launch (story)", category: "Publicaciones", width: 1080, height: 1920, bg: "dark", logoVariant: "full", description: "IG/TikTok Story — Lanzamiento", tagline: "launch" },
  { id: "pub-comparison-square", label: "Antes / Después", category: "Publicaciones", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Comparativa", tagline: "comparison" },
  { id: "pub-comparison-landscape", label: "Antes / Después (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "white", logoVariant: "full", description: "LinkedIn — Comparativa", tagline: "comparison" },
  { id: "pub-workflow-square", label: "Workflow / Proceso", category: "Publicaciones", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Flujo de trabajo", tagline: "workflow" },
  { id: "pub-workflow-landscape", label: "Workflow / Proceso (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "LinkedIn — Flujo de trabajo", tagline: "workflow" },
  { id: "pub-cta-square", label: "CTA / Prueba gratis", category: "Publicaciones", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Llamada a la acción", tagline: "cta" },
  { id: "pub-cta-story", label: "CTA / Prueba gratis (story)", category: "Publicaciones", width: 1080, height: 1920, bg: "gradient", logoVariant: "full", description: "IG/TikTok — Llamada a la acción", tagline: "cta" },
  { id: "pub-cta-x", label: "CTA / Prueba gratis (X)", category: "Publicaciones", width: 1600, height: 900, bg: "gradient", logoVariant: "full", description: "X/Twitter — Llamada a la acción", tagline: "cta" },
  // ═══ Publicaciones — Templates ═══
  { id: "pub-tpl-overview-sq", label: "Templates — Overview", category: "Pub. Templates", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Resumen plantillas", tagline: "tpl-overview" },
  { id: "pub-tpl-overview-ln", label: "Templates — Overview (landscape)", category: "Pub. Templates", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "LinkedIn — Resumen plantillas", tagline: "tpl-overview" },
  { id: "pub-tpl-custom-sq", label: "Templates — Personalización", category: "Pub. Templates", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Plantillas personalizables", tagline: "tpl-custom" },
  { id: "pub-tpl-custom-ln", label: "Templates — Personalización (landscape)", category: "Pub. Templates", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Plantillas personalizables", tagline: "tpl-custom" },
  { id: "pub-tpl-regions-sq", label: "Templates — Por región", category: "Pub. Templates", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Plantillas por región anatómica", tagline: "tpl-regions" },
  { id: "pub-tpl-regions-st", label: "Templates — Por región (story)", category: "Pub. Templates", width: 1080, height: 1920, bg: "gradient", logoVariant: "full", description: "IG/TikTok — Regiones anatómicas", tagline: "tpl-regions" },
  { id: "pub-tpl-normality-sq", label: "Templates — Frases normalidad", category: "Pub. Templates", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Aprendizaje de frases", tagline: "tpl-normality" },
  // ═══ Publicaciones — Recomendaciones ═══
  { id: "pub-rec-overview-sq", label: "Recomendaciones — Overview", category: "Pub. Recomendaciones", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Sistema de recomendaciones", tagline: "rec-overview" },
  { id: "pub-rec-overview-ln", label: "Recomendaciones — Overview (landscape)", category: "Pub. Recomendaciones", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Sistema de recomendaciones", tagline: "rec-overview" },
  { id: "pub-rec-evidence-sq", label: "Recomendaciones — Basadas en evidencia", category: "Pub. Recomendaciones", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Guías basadas en evidencia", tagline: "rec-evidence" },
  { id: "pub-rec-evidence-ln", label: "Recomendaciones — Basadas en evidencia (landscape)", category: "Pub. Recomendaciones", width: 1200, height: 630, bg: "white", logoVariant: "full", description: "LinkedIn — Guías basadas en evidencia", tagline: "rec-evidence" },
  { id: "pub-rec-hospital-sq", label: "Recomendaciones — Hospital", category: "Pub. Recomendaciones", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Protocolos hospitalarios", tagline: "rec-hospital" },
  { id: "pub-rec-hospital-st", label: "Recomendaciones — Hospital (story)", category: "Pub. Recomendaciones", width: 1080, height: 1920, bg: "gradient", logoVariant: "full", description: "IG/TikTok — Protocolos hospital", tagline: "rec-hospital" },
  // ═══ Publicaciones — Calculadoras ═══
  { id: "pub-calc-overview-sq", label: "Calculadoras — Overview", category: "Pub. Calculadoras", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Calculadoras integradas", tagline: "calc-overview" },
  { id: "pub-calc-overview-ln", label: "Calculadoras — Overview (landscape)", category: "Pub. Calculadoras", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "LinkedIn — Calculadoras integradas", tagline: "calc-overview" },
  { id: "pub-calc-tirads-sq", label: "Calculadoras — TI-RADS", category: "Pub. Calculadoras", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Calculadora TI-RADS", tagline: "calc-tirads" },
  { id: "pub-calc-tirads-ln", label: "Calculadoras — TI-RADS (landscape)", category: "Pub. Calculadoras", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Calculadora TI-RADS", tagline: "calc-tirads" },
  { id: "pub-calc-pirads-sq", label: "Calculadoras — PI-RADS", category: "Pub. Calculadoras", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Calculadora PI-RADS", tagline: "calc-pirads" },
  { id: "pub-calc-bosniak-sq", label: "Calculadoras — Bosniak", category: "Pub. Calculadoras", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Clasificación Bosniak", tagline: "calc-bosniak" },
  { id: "pub-calc-copy-sq", label: "Calculadoras — Copy al informe", category: "Pub. Calculadoras", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Copiar resultado al informe", tagline: "calc-copy" },
  { id: "pub-calc-copy-st", label: "Calculadoras — Copy al informe (story)", category: "Pub. Calculadoras", width: 1080, height: 1920, bg: "dark", logoVariant: "full", description: "IG/TikTok — Copiar resultado", tagline: "calc-copy" },
];

function buildLogoSvg(
  w: number, h: number,
  variant: "full" | "icon",
  bg: "gradient" | "dark" | "white" | "transparent",
  opts?: { tagline?: string; subtextSize?: number },
): string {
  const pad = w * 0.05;
  const iconSize = variant === "icon"
    ? Math.min(w, h) * 0.6
    : Math.min(h * 0.5, w * 0.1);
  const iconX = variant === "icon" ? (w - iconSize) / 2 : pad;
  const iconY = opts?.tagline
    ? h * 0.5 - iconSize * 0.65
    : (h - iconSize) / 2;
  const scale = iconSize / 32;

  const textDark = bg === "white" || bg === "transparent";
  const mainColor = textDark ? "#111827" : "#ffffff";
  const accentColor = textDark ? "#0d9488" : "#5EEAD4";
  const subColor = textDark ? "#6b7280" : "rgba(255,255,255,0.6)";

  let bgRect = "";
  if (bg === "gradient") {
    bgRect = `<defs><linearGradient id="bg-grad" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1E3A5F"/><stop offset="100%" stop-color="#0F766E"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg-grad)"/>`;
  } else if (bg === "dark") {
    bgRect = `<rect width="${w}" height="${h}" fill="#0f172a"/>`;
  } else if (bg === "white") {
    bgRect = `<rect width="${w}" height="${h}" fill="#ffffff"/>`;
  }

  const iconSvg = `<g transform="translate(${iconX},${iconY}) scale(${scale})">
    <rect width="32" height="32" rx="7" fill="url(#icon-grad)"/>
    <path d="M10 8h7a5 5 0 0 1 0 10h-3l5 6" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="2.2" fill="#5EEAD4"/>
  </g>`;

  let textSvg = "";
  if (variant === "full") {
    const textX = iconX + iconSize + iconSize * 0.35;
    const availWidth = w - textX - pad;
    const fontSize = Math.min(iconSize * 1.1, availWidth / 6.5, h * 0.4);
    const textY = opts?.tagline
      ? h * 0.5 - fontSize * 0.15
      : h / 2 + fontSize * 0.35;
    textSvg = `<text x="${textX}" y="${textY}" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="-0.02em">
      <tspan fill="${mainColor}">Radiogen</tspan><tspan fill="${accentColor}">.ai</tspan>
    </text>`;
    if (opts?.tagline) {
      const subSize = opts.subtextSize || fontSize * 0.28;
      textSvg += `<text x="${textX}" y="${textY + subSize * 1.6}" font-family="system-ui,-apple-system,sans-serif" font-weight="500" font-size="${subSize}" fill="${subColor}" letter-spacing="0.02em">${escSvg(opts.tagline)}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="icon-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1E3A5F"/><stop offset="100%" stop-color="#0F766E"/></linearGradient></defs>
    ${bgRect}
    ${iconSvg}
    ${textSvg}
  </svg>`;
}

function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPublicationSvg(w: number, h: number, bg: "gradient" | "dark" | "white" | "transparent", contentType: string): string {
  const isDark = bg === "gradient" || bg === "dark";
  const mainColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "#6b7280";
  const accentColor = "#5EEAD4";
  const brandTeal = "#0F766E";
  const brandNavy = "#1E3A5F";
  const scale = w / 1080;
  const fs = (n: number) => Math.round(n * scale);

  let bgSvg = "";
  if (bg === "gradient") {
    bgSvg = `<defs><linearGradient id="bg-g" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1E3A5F"/><stop offset="60%" stop-color="#0F766E"/><stop offset="100%" stop-color="#134e4a"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg-g)"/>`;
  } else if (bg === "dark") {
    bgSvg = `<rect width="${w}" height="${h}" fill="#0f172a"/>`;
  } else if (bg === "white") {
    bgSvg = `<rect width="${w}" height="${h}" fill="#ffffff"/>`;
  }

  const decorCircles = `<circle cx="${w * 0.85}" cy="${h * 0.15}" r="${fs(180)}" fill="${isDark ? 'rgba(94,234,212,0.06)' : 'rgba(15,118,110,0.04)'}"/><circle cx="${w * 0.1}" cy="${h * 0.85}" r="${fs(120)}" fill="${isDark ? 'rgba(94,234,212,0.04)' : 'rgba(15,118,110,0.03)'}"/>`;

  const logoSmall = `<g transform="translate(${fs(60)},${h - fs(80)}) scale(${scale * 0.7})"><rect width="24" height="24" rx="5" fill="${brandTeal}"/><path d="M7 6h5a3.5 3.5 0 0 1 0 7h-2l3.5 4.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${fs(60) + fs(28)}" y="${h - fs(58)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(18)}" fill="${mainColor}"><tspan>Radiogen</tspan><tspan fill="${accentColor}">.ai</tspan></text>`;

  let content = "";

  if (contentType === "feature") {
    const isVert = h > w;
    const titleY = isVert ? fs(280) : fs(180);
    content = `
      <rect x="${fs(60)}" y="${fs(60)}" width="${fs(56)}" height="${fs(56)}" rx="${fs(14)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <path transform="translate(${fs(74)},${fs(74)}) scale(${scale * 0.9})" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="${fs(60)}" y="${titleY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(52)}" fill="${mainColor}" letter-spacing="-0.02em">Dictado por voz con IA</text>
      <text x="${fs(60)}" y="${titleY + fs(50)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(52)}" fill="${accentColor}" letter-spacing="-0.02em">→ Informe estructurado</text>
      <text x="${fs(60)}" y="${titleY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(26)}" fill="${subColor}">Dicta tus hallazgos en cualquier idioma.</text>
      <text x="${fs(60)}" y="${titleY + fs(170)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(26)}" fill="${subColor}">La IA estructura, traduce y genera la conclusión.</text>
      <rect x="${fs(60)}" y="${titleY + fs(220)}" width="${fs(220)}" height="${fs(48)}" rx="${fs(24)}" fill="${brandTeal}"/>
      <text x="${fs(110)}" y="${titleY + fs(252)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="white">Prueba gratis →</text>`;
  } else if (contentType === "stats") {
    const colW = (w - fs(180)) / 3;
    const startY = h > w ? fs(300) : fs(160);
    const stats = [
      { num: "90%", label: "Reducción en tiempo\nde redacción" },
      { num: "40+", label: "Plantillas\nespecializadas" },
      { num: "3", label: "Idiomas\nsoportados" },
    ];
    content = stats.map((s, i) => `
      <text x="${fs(60) + i * colW}" y="${startY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(72)}" fill="${accentColor}">${s.num}</text>
      <text x="${fs(60) + i * colW}" y="${startY + fs(50)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">${escSvg(s.label.split('\n')[0])}</text>
      <text x="${fs(60) + i * colW}" y="${startY + fs(76)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">${escSvg(s.label.split('\n')[1] || '')}</text>
    `).join("") + `
      <text x="${fs(60)}" y="${startY - fs(100)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(36)}" fill="${mainColor}">Informes radiológicos</text>
      <text x="${fs(60)}" y="${startY - fs(55)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(36)}" fill="${mainColor}">en menos tiempo</text>`;
  } else if (contentType === "quote") {
    const qY = h > w ? fs(300) : fs(160);
    content = `
      <text x="${fs(60)}" y="${qY}" font-family="Georgia,serif" font-size="${fs(96)}" fill="${brandTeal}" opacity="0.3">"</text>
      <text x="${fs(60)}" y="${qY + fs(70)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(30)}" fill="${mainColor}">Pasé de 15 minutos por informe</text>
      <text x="${fs(60)}" y="${qY + fs(115)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(30)}" fill="${mainColor}">a menos de 3. Me cambió la vida</text>
      <text x="${fs(60)}" y="${qY + fs(160)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(30)}" fill="${mainColor}">profesional.</text>
      <line x1="${fs(60)}" y1="${qY + fs(200)}" x2="${fs(160)}" y2="${qY + fs(200)}" stroke="${brandTeal}" stroke-width="3"/>
      <text x="${fs(60)}" y="${qY + fs(240)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(22)}" fill="${mainColor}">Dr. María López</text>
      <text x="${fs(60)}" y="${qY + fs(270)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(18)}" fill="${subColor}">Radióloga — Hospital Universitario</text>`;
  } else if (contentType === "tip") {
    const tipY = h > w ? fs(250) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(60)}" width="${fs(140)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(90)}" y="${fs(84)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">💡 TIP</text>
      <text x="${fs(60)}" y="${tipY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">¿Sabías que puedes</text>
      <text x="${fs(60)}" y="${tipY + fs(56)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">personalizar frases</text>
      <text x="${fs(60)}" y="${tipY + fs(112)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">de normalidad?</text>
      <text x="${fs(60)}" y="${tipY + fs(190)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">La IA aprende tu estilo de redacción</text>
      <text x="${fs(60)}" y="${tipY + fs(225)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">y lo aplica automáticamente en cada informe.</text>`;
  } else if (contentType === "launch") {
    const lY = h > w ? fs(320) : fs(160);
    content = `
      <rect x="${fs(60)}" y="${fs(60)}" width="${fs(100)}" height="${fs(36)}" rx="${fs(18)}" fill="${accentColor}"/>
      <text x="${fs(78)}" y="${fs(84)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${brandNavy}">NUEVO</text>
      <text x="${fs(60)}" y="${lY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(56)}" fill="${mainColor}">Plantillas RECIST 1.1</text>
      <text x="${fs(60)}" y="${lY + fs(68)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(56)}" fill="${accentColor}">ya disponibles</text>
      <text x="${fs(60)}" y="${lY + fs(145)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(26)}" fill="${subColor}">Seguimiento oncológico automatizado con</text>
      <text x="${fs(60)}" y="${lY + fs(182)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(26)}" fill="${subColor}">mediciones diana, respuesta tumoral y tablas.</text>
      <rect x="${fs(60)}" y="${lY + fs(230)}" width="${fs(250)}" height="${fs(52)}" rx="${fs(26)}" fill="${brandTeal}"/>
      <text x="${fs(115)}" y="${lY + fs(264)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="white">Descúbrelo ahora →</text>`;
  } else if (contentType === "comparison") {
    const cY = h > w ? fs(200) : fs(100);
    const colMid = w / 2;
    content = `
      <line x1="${colMid}" y1="${cY}" x2="${colMid}" y2="${h - fs(100)}" stroke="${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}" stroke-width="2" stroke-dasharray="8 4"/>
      <rect x="${fs(60)}" y="${cY}" width="${fs(140)}" height="${fs(36)}" rx="${fs(18)}" fill="#ef4444" opacity="0.15"/>
      <text x="${fs(85)}" y="${cY + fs(24)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="#ef4444">ANTES</text>
      <rect x="${colMid + fs(20)}" y="${cY}" width="${fs(140)}" height="${fs(36)}" rx="${fs(18)}" fill="${brandTeal}" opacity="0.15"/>
      <text x="${colMid + fs(40)}" y="${cY + fs(24)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${brandTeal}">DESPUÉS</text>
      <text x="${fs(60)}" y="${cY + fs(90)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(24)}" fill="${mainColor}">15 min / informe</text>
      <text x="${fs(60)}" y="${cY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Redacción manual</text>
      <text x="${fs(60)}" y="${cY + fs(165)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Copy-paste de plantillas</text>
      <text x="${fs(60)}" y="${cY + fs(200)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Conclusiones repetitivas</text>
      <text x="${colMid + fs(20)}" y="${cY + fs(90)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(24)}" fill="${accentColor}">2 min / informe</text>
      <text x="${colMid + fs(20)}" y="${cY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Dictado por voz + IA</text>
      <text x="${colMid + fs(20)}" y="${cY + fs(165)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Estructura automática</text>
      <text x="${colMid + fs(20)}" y="${cY + fs(200)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Conclusiones inteligentes</text>`;
  } else if (contentType === "workflow") {
    const wY = h > w ? fs(220) : fs(120);
    const steps = ["🎙️ Dicta", "🤖 IA estructura", "✏️ Revisa", "📋 Firma"];
    const stepW = (w - fs(120)) / 4;
    content = `
      <text x="${fs(60)}" y="${wY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">De la voz al informe</text>
      <text x="${fs(60)}" y="${wY + fs(52)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">en 4 pasos</text>
      ${steps.map((s, i) => `
        <rect x="${fs(60) + i * stepW}" y="${wY + fs(120)}" width="${stepW - fs(15)}" height="${fs(120)}" rx="${fs(12)}" fill="${isDark ? 'rgba(94,234,212,0.08)' : 'rgba(15,118,110,0.05)'}" stroke="${isDark ? 'rgba(94,234,212,0.2)' : 'rgba(15,118,110,0.15)'}" stroke-width="1"/>
        <text x="${fs(60) + i * stepW + (stepW - fs(15)) / 2}" y="${wY + fs(175)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${mainColor}" text-anchor="middle">${escSvg(s)}</text>
        <text x="${fs(60) + i * stepW + (stepW - fs(15)) / 2}" y="${wY + fs(210)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}" text-anchor="middle">Paso ${i + 1}</text>
      `).join("")}
      <text x="${fs(60)}" y="${wY + fs(310)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Sin instalar nada. Funciona en tu navegador.</text>`;
  } else if (contentType === "cta") {
    const ctaY = h > w ? fs(340) : fs(180);
    content = `
      <text x="${w / 2}" y="${ctaY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(52)}" fill="${mainColor}" text-anchor="middle">Empieza hoy.</text>
      <text x="${w / 2}" y="${ctaY + fs(60)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(52)}" fill="${accentColor}" text-anchor="middle">Gratis.</text>
      <text x="${w / 2}" y="${ctaY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(26)}" fill="${subColor}" text-anchor="middle">Informes radiológicos con IA en menos de 2 minutos.</text>
      <text x="${w / 2}" y="${ctaY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(26)}" fill="${subColor}" text-anchor="middle">Sin tarjeta de crédito. Sin instalación.</text>
      <rect x="${w / 2 - fs(140)}" y="${ctaY + fs(210)}" width="${fs(280)}" height="${fs(56)}" rx="${fs(28)}" fill="${brandTeal}"/>
      <text x="${w / 2}" y="${ctaY + fs(245)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(22)}" fill="white" text-anchor="middle">Crear cuenta gratis</text>`;
  } else if (contentType === "tpl-overview") {
    const tY = h > w ? fs(200) : fs(120);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(180)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(95)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">TEMPLATES</text>
      <text x="${fs(60)}" y="${tY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${mainColor}">+190 plantillas</text>
      <text x="${fs(60)}" y="${tY + fs(56)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${accentColor}">listas para dictar</text>
      <text x="${fs(60)}" y="${tY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">TC, RM, Ecografía, Rx, Mamografía, Intervencionismo</text>
      <text x="${fs(60)}" y="${tY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">y RECIST 1.1. Cada plantilla con secciones anatómicas</text>
      <text x="${fs(60)}" y="${tY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">predefinidas, campos de hallazgos y conclusión automática.</text>
      <text x="${fs(60)}" y="${tY + fs(270)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Tórax · Abdomen · Cabeza y cuello · Columna</text>
      <text x="${fs(60)}" y="${tY + fs(304)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Extremidades superiores e inferiores</text>`;
  } else if (contentType === "tpl-custom") {
    const tY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(260)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">PERSONALIZACIÓN</text>
      <text x="${fs(60)}" y="${tY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Tus plantillas,</text>
      <text x="${fs(60)}" y="${tY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">tu estilo</text>
      <text x="${fs(60)}" y="${tY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Crea plantillas personalizadas con tus propias</text>
      <text x="${fs(60)}" y="${tY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">secciones anatómicas. Añade, elimina o renombra</text>
      <text x="${fs(60)}" y="${tY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">campos según tu flujo de trabajo.</text>
      <text x="${fs(60)}" y="${tY + fs(268)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Tu hospital también puede compartir plantillas</text>
      <text x="${fs(60)}" y="${tY + fs(306)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">estandarizadas para todo el departamento.</text>`;
  } else if (contentType === "tpl-regions") {
    const tY = h > w ? fs(200) : fs(110);
    const regions = [
      { icon: "🧠", name: "Cabeza y cuello", count: "32" },
      { icon: "🫁", name: "Tórax", count: "45" },
      { icon: "🫄", name: "Abdomen y pelvis", count: "52" },
      { icon: "🦴", name: "Columna", count: "18" },
      { icon: "💪", name: "Extremidades sup.", count: "22" },
      { icon: "🦵", name: "Extremidades inf.", count: "21" },
    ];
    const rowH = h > w ? fs(75) : fs(58);
    content = `
      <text x="${fs(60)}" y="${tY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Una plantilla para</text>
      <text x="${fs(60)}" y="${tY + fs(50)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${accentColor}">cada estudio</text>
      ${regions.map((r, i) => `
        <rect x="${fs(60)}" y="${tY + fs(100) + i * rowH}" width="${w - fs(120)}" height="${rowH - fs(8)}" rx="${fs(10)}" fill="${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}"/>
        <text x="${fs(80)}" y="${tY + fs(100) + i * rowH + rowH * 0.6}" font-family="system-ui,sans-serif" font-size="${fs(20)}">${r.icon}</text>
        <text x="${fs(120)}" y="${tY + fs(100) + i * rowH + rowH * 0.6}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(20)}" fill="${mainColor}">${escSvg(r.name)}</text>
        <text x="${w - fs(100)}" y="${tY + fs(100) + i * rowH + rowH * 0.6}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(18)}" fill="${accentColor}" text-anchor="end">${r.count}</text>
      `).join("")}`;
  } else if (contentType === "tpl-normality") {
    const tY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(280)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">ESTILO INTELIGENTE</text>
      <text x="${fs(60)}" y="${tY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">La IA aprende</text>
      <text x="${fs(60)}" y="${tY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">cómo redactas</text>
      <text x="${fs(60)}" y="${tY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Cada vez que corriges un informe, el sistema</text>
      <text x="${fs(60)}" y="${tY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">memoriza tus frases de normalidad preferidas.</text>
      <text x="${fs(60)}" y="${tY + fs(232)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">En el siguiente informe, las aplica automáticamente.</text>
      <text x="${fs(60)}" y="${tY + fs(270)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Tu estilo, tu vocabulario, tu nivel de detalle.</text>
      <text x="${fs(60)}" y="${tY + fs(330)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(22)}" fill="${accentColor}">→ Cuanto más usas Radiogen.ai, mejor te conoce.</text>`;
  } else if (contentType === "rec-overview") {
    const rY = h > w ? fs(200) : fs(120);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(280)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(80)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">RECOMENDACIONES</text>
      <text x="${fs(60)}" y="${rY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Nunca olvides una</text>
      <text x="${fs(60)}" y="${rY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">recomendación</text>
      <text x="${fs(60)}" y="${rY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Biblioteca de recomendaciones basadas en evidencia</text>
      <text x="${fs(60)}" y="${rY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">para cada hallazgo incidental. Filtradas por</text>
      <text x="${fs(60)}" y="${rY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">modalidad, región anatómica y categoría.</text>
      <text x="${fs(60)}" y="${rY + fs(270)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Nódulo pulmonar → seguimiento Fleischner.</text>
      <text x="${fs(60)}" y="${rY + fs(308)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Lesión adrenal → protocolo washout.</text>
      <text x="${fs(60)}" y="${rY + fs(346)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Quiste ovárico → guía ACR.</text>`;
  } else if (contentType === "rec-evidence") {
    const rY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(340)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">BASADAS EN EVIDENCIA</text>
      <text x="${fs(60)}" y="${rY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Guías ACR, Fleischner</text>
      <text x="${fs(60)}" y="${rY + fs(52)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">y sociedades de referencia</text>
      <text x="${fs(60)}" y="${rY + fs(128)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Cada recomendación incluye la fuente y el nivel</text>
      <text x="${fs(60)}" y="${rY + fs(166)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">de evidencia. Actualizadas según las últimas guías.</text>
      <text x="${fs(60)}" y="${rY + fs(230)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Cubre hallazgos incidentales en TC, RM y ecografía:</text>
      <text x="${fs(60)}" y="${rY + fs(268)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">• Nódulos pulmonares, tiroideos, adrenales y hepáticos</text>
      <text x="${fs(60)}" y="${rY + fs(302)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">• Quistes renales, ováricos y pancreáticos</text>
      <text x="${fs(60)}" y="${rY + fs(336)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">• Dilataciones vasculares y aneurismas</text>`;
  } else if (contentType === "rec-hospital") {
    const rY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(320)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">HOSPITAL / EQUIPO</text>
      <text x="${fs(60)}" y="${rY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Protocolos de tu</text>
      <text x="${fs(60)}" y="${rY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">departamento</text>
      <text x="${fs(60)}" y="${rY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">El jefe de sección puede crear recomendaciones</text>
      <text x="${fs(60)}" y="${rY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">específicas del hospital que aparecen automáticamente</text>
      <text x="${fs(60)}" y="${rY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">a todos los radiólogos de la sección.</text>
      <text x="${fs(60)}" y="${rY + fs(270)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Estandariza criterios de seguimiento y asegura</text>
      <text x="${fs(60)}" y="${rY + fs(308)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">que ningún hallazgo incidental quede sin manejo.</text>`;
  } else if (contentType === "calc-overview") {
    const cY = h > w ? fs(200) : fs(120);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(260)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">CALCULADORAS</text>
      <text x="${fs(60)}" y="${cY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">7 calculadoras</text>
      <text x="${fs(60)}" y="${cY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">integradas en tu informe</text>
      <text x="${fs(60)}" y="${cY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Clasifica hallazgos sin salir de la aplicación.</text>
      <text x="${fs(60)}" y="${cY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Calcula y copia el resultado al informe con un clic.</text>
      <text x="${fs(60)}" y="${cY + fs(232)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">TI-RADS · PI-RADS · Bosniak · ASPECTS</text>
      <text x="${fs(60)}" y="${cY + fs(268)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Volumen prostático · Densidad PSA · Adrenal</text>
      <text x="${fs(60)}" y="${cY + fs(330)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Cada calculadora genera texto listo para pegar</text>
      <text x="${fs(60)}" y="${cY + fs(368)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">en los hallazgos o la conclusión del informe.</text>`;
  } else if (contentType === "calc-tirads") {
    const cY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(160)}" height="${fs(36)}" rx="${fs(18)}" fill="${accentColor}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${brandNavy}">TI-RADS</text>
      <text x="${fs(60)}" y="${cY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Clasificación tiroidea</text>
      <text x="${fs(60)}" y="${cY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">ACR TI-RADS</text>
      <text x="${fs(60)}" y="${cY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Selecciona composición, ecogenicidad, forma,</text>
      <text x="${fs(60)}" y="${cY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">márgenes y focos ecogénicos. El sistema calcula</text>
      <text x="${fs(60)}" y="${cY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">los puntos y determina la categoría TI-RADS (1-5).</text>
      <text x="${fs(60)}" y="${cY + fs(270)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Genera texto descriptivo listo para copiar:</text>
      <rect x="${fs(60)}" y="${cY + fs(295)}" width="${w - fs(120)}" height="${fs(80)}" rx="${fs(10)}" fill="${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}"/>
      <text x="${fs(80)}" y="${cY + fs(330)}" font-family="system-ui,sans-serif" font-style="italic" font-size="${fs(18)}" fill="${subColor}">"Nódulo tiroideo ACR TI-RADS 4 (6 pts).</text>
      <text x="${fs(80)}" y="${cY + fs(358)}" font-family="system-ui,sans-serif" font-style="italic" font-size="${fs(18)}" fill="${subColor}">Se recomienda PAAF si ≥ 15 mm."</text>`;
  } else if (contentType === "calc-pirads") {
    const cY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(160)}" height="${fs(36)}" rx="${fs(18)}" fill="${accentColor}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${brandNavy}">PI-RADS</text>
      <text x="${fs(60)}" y="${cY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Evaluación prostática</text>
      <text x="${fs(60)}" y="${cY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">PI-RADS v2.1</text>
      <text x="${fs(60)}" y="${cY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Clasifica lesiones prostáticas según zona (periférica</text>
      <text x="${fs(60)}" y="${cY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">o transicional), señal en T2, restricción en difusión</text>
      <text x="${fs(60)}" y="${cY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">y realce dinámico. Incluye volumen prostático</text>
      <text x="${fs(60)}" y="${cY + fs(244)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">y densidad de PSA en la misma herramienta.</text>
      <text x="${fs(60)}" y="${cY + fs(310)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(22)}" fill="${accentColor}">→ PI-RADS 1 a 5 con texto copiable al informe.</text>`;
  } else if (contentType === "calc-bosniak") {
    const cY = h > w ? fs(220) : fs(130);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(180)}" height="${fs(36)}" rx="${fs(18)}" fill="${accentColor}"/>
      <text x="${fs(80)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${brandNavy}">BOSNIAK</text>
      <text x="${fs(60)}" y="${cY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Clasificación de</text>
      <text x="${fs(60)}" y="${cY + fs(54)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">quistes renales</text>
      <text x="${fs(60)}" y="${cY + fs(130)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Clasifica lesiones quísticas renales según Bosniak</text>
      <text x="${fs(60)}" y="${cY + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">2019 (I, II, IIF, III, IV). Evalúa tabiques, paredes,</text>
      <text x="${fs(60)}" y="${cY + fs(206)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">realce y componente sólido. El resultado se copia</text>
      <text x="${fs(60)}" y="${cY + fs(244)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">directamente a tus hallazgos como texto descriptivo.</text>
      <text x="${fs(60)}" y="${cY + fs(310)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Sin tablas, sin apps externas. Todo integrado.</text>`;
  } else if (contentType === "calc-copy") {
    const cY = h > w ? fs(250) : fs(140);
    content = `
      <rect x="${fs(60)}" y="${fs(55)}" width="${fs(280)}" height="${fs(36)}" rx="${fs(18)}" fill="${isDark ? 'rgba(94,234,212,0.15)' : 'rgba(15,118,110,0.1)'}"/>
      <text x="${fs(85)}" y="${fs(79)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${accentColor}">UN CLIC</text>
      <text x="${fs(60)}" y="${cY}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${mainColor}">Calcula.</text>
      <text x="${fs(60)}" y="${cY + fs(58)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${mainColor}">Copia.</text>
      <text x="${fs(60)}" y="${cY + fs(116)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${accentColor}">Pega en tu informe.</text>
      <text x="${fs(60)}" y="${cY + fs(195)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Cada calculadora genera un párrafo listo para pegar</text>
      <text x="${fs(60)}" y="${cY + fs(233)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">en tus hallazgos. Sin escribir ni reformatear.</text>
      <text x="${fs(60)}" y="${cY + fs(295)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Ejemplo: "Volumen prostático de 45 cc (4.2 × 3.8</text>
      <text x="${fs(60)}" y="${cY + fs(333)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">× 3.5 cm). Densidad de PSA: 0.18 ng/ml/cc."</text>`;
  } else {
    content = `<text x="${w/2}" y="${h/2}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(32)}" fill="${mainColor}" text-anchor="middle">Radiogen.ai</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${bgSvg}
    ${decorCircles}
    ${content}
    ${logoSmall}
  </svg>`;
}

const PUB_TYPES = new Set(["feature","stats","quote","tip","launch","comparison","workflow","cta","tpl-overview","tpl-custom","tpl-regions","tpl-normality","rec-overview","rec-evidence","rec-hospital","calc-overview","calc-tirads","calc-pirads","calc-bosniak","calc-copy"]);

function buildAssetSvg(asset: BrandAsset): string {
  if (asset.tagline && PUB_TYPES.has(asset.tagline)) {
    return buildPublicationSvg(asset.width, asset.height, asset.bg, asset.tagline);
  }
  return buildLogoSvg(asset.width, asset.height, asset.logoVariant, asset.bg, asset.tagline && !PUB_TYPES.has(asset.tagline) ? { tagline: asset.tagline } : undefined);
}

function renderAndDownload(asset: BrandAsset) {
  const svg = buildAssetSvg(asset);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = asset.width;
    canvas.height = asset.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, asset.width, asset.height);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `radiogenai-${asset.id}-${asset.width}x${asset.height}.png`;
    a.click();
  };
  img.src = url;
}

function getPreviewDataUrl(asset: BrandAsset): string {
  const previewW = 200;
  const previewH = Math.round((asset.height / asset.width) * previewW);
  let svg: string;
  if (asset.tagline && PUB_TYPES.has(asset.tagline)) {
    svg = buildPublicationSvg(previewW, previewH, asset.bg, asset.tagline);
  } else {
    svg = buildLogoSvg(previewW, previewH, asset.logoVariant, asset.bg, asset.tagline && !PUB_TYPES.has(asset.tagline) ? { tagline: asset.tagline } : undefined);
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const BRAND_COLORS = [
  { name: "Azul marino", hex: "#1E3A5F", usage: "Fondo principal, headers" },
  { name: "Teal", hex: "#0F766E", usage: "Acento primario, CTAs" },
  { name: "Teal claro", hex: "#5EEAD4", usage: "Acento '.ai', highlights" },
  { name: "Slate oscuro", hex: "#0f172a", usage: "Fondos dark mode" },
  { name: "Blanco", hex: "#FFFFFF", usage: "Texto sobre oscuro, fondos claros" },
  { name: "Gris 400", hex: "#9ca3af", usage: "Texto secundario" },
];

type BrandTab = "identidad" | "mensajeria" | "copy" | "emails" | "social" | "seo" | "prensa" | "assets";

const BRAND_TABS: { key: BrandTab; label: string; icon: React.ReactNode }[] = [
  { key: "identidad", label: "Identidad", icon: <Palette className="h-3 w-3" /> },
  { key: "mensajeria", label: "Mensajería", icon: <Target className="h-3 w-3" /> },
  { key: "copy", label: "Copy", icon: <MessageSquareText className="h-3 w-3" /> },
  { key: "emails", label: "Emails", icon: <Mail className="h-3 w-3" /> },
  { key: "social", label: "Social", icon: <Hash className="h-3 w-3" /> },
  { key: "seo", label: "SEO", icon: <Globe className="h-3 w-3" /> },
  { key: "prensa", label: "Prensa", icon: <Newspaper className="h-3 w-3" /> },
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-3 w-3" /> },
];

function CopyBlock({ label, text, copied, onCopy }: { label: string; text: string; copied: string | null; onCopy: (label: string, text: string) => void }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <Badge variant="secondary" className="text-[9px] shrink-0 mt-0.5">{label}</Badge>
      <p className="text-[11px] text-gray-700 dark:text-gray-300 flex-1 min-w-0 whitespace-pre-wrap">{text}</p>
      <button onClick={() => onCopy(label, text)} className="shrink-0 text-gray-400 hover:text-teal-500 transition-colors mt-0.5">
        {copied === label ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{children}</p>;
}

function BrandKitSection() {
  const categories = Array.from(new Set(BRAND_ASSETS.map(a => a.category)));
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [brandTab, setBrandTab] = useState<BrandTab>("identidad");

  const handleDownloadAll = () => {
    BRAND_ASSETS.forEach((asset, i) => {
      setTimeout(() => renderAndDownload(asset), i * 300);
    });
  };

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const cp = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(label);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {BRAND_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setBrandTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
              brandTab === t.key
                ? "bg-teal-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ IDENTIDAD ═══ */}
      {brandTab === "identidad" && (
        <Card><CardContent className="p-5 space-y-5">
          <SectionTitle>Paleta de colores</SectionTitle>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {BRAND_COLORS.map((c) => (
              <button key={c.hex} onClick={() => copyColor(c.hex)} className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-teal-400 transition-colors text-left">
                <div className="h-12 w-full" style={{ backgroundColor: c.hex }} />
                <div className="p-1.5">
                  <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{c.name}</p>
                  <p className="text-[9px] font-mono text-gray-400">{copiedColor === c.hex ? "Copiado!" : c.hex}</p>
                  <p className="text-[9px] text-gray-400 truncate">{c.usage}</p>
                </div>
              </button>
            ))}
          </div>
          <SectionTitle>Tipografía</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white" style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>Radiogen<span className="text-teal-400">.ai</span></p>
              <p className="text-[10px] text-gray-400 mt-1">Font: system-ui / Inter · Weight: 800</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Informes radiológicos con IA</p>
              <p className="text-[10px] text-gray-400 mt-1">Tagline · Weight: 500</p>
            </div>
          </div>
          <SectionTitle>Textos de marca</SectionTitle>
          <div className="space-y-1.5">
            {[
              { label: "Tagline ES", text: "Informes radiológicos con IA" },
              { label: "Tagline EN", text: "AI-Powered Radiology Reports" },
              { label: "Bio corta ES", text: "Radiogen.ai — Genera informes radiológicos estructurados con IA. Dictado por voz, plantillas personalizables, trazabilidad completa." },
              { label: "Bio corta EN", text: "Radiogen.ai — Generate structured radiology reports with AI. Voice dictation, custom templates, full traceability." },
              { label: "Bio larga ES", text: "Radiogen.ai es la plataforma de informes radiológicos potenciada por inteligencia artificial. Dicta tus hallazgos por voz, selecciona la plantilla y genera informes estructurados con conclusión automática en segundos. Compatible con cualquier modalidad: TC, RM, ecografía, radiografía, mamografía y procedimientos. Incluye trazabilidad de hallazgos, aprendizaje de estilo, gestión hospitalaria multiusuario y cumplimiento RGPD." },
              { label: "CTA principal", text: "Prueba Radiogen.ai gratis — 30 informes/mes sin compromiso" },
              { label: "CTA hospital", text: "Programa piloto hospitalario — Solicita una demo para tu servicio de radiología" },
              { label: "Hashtags", text: "#Radiologia #IA #RadiologyAI #InformesRadiologicos #Teleradiologia #MedTech #HealthTech #Diagnostico #ImagenMedica" },
              { label: "Web URL", text: "https://radiogen.ai" },
              { label: "Email", text: "info@radiogen.ai" },
            ].map((item) => <CopyBlock key={item.label} label={item.label} text={item.text} copied={copiedColor} onCopy={cp} />)}
          </div>
        </CardContent></Card>
      )}

      {/* ═══ MENSAJERÍA ═══ */}
      {brandTab === "mensajeria" && (
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Voz de marca</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { trait: "Experto", desc: "Conocemos la radiología desde dentro. Hablamos con propiedad clínica.", color: "border-blue-400 bg-blue-50 dark:bg-blue-950/20" },
                { trait: "Innovador", desc: "Lideramos la adopción de IA en imagen médica. Sin miedo a lo nuevo.", color: "border-teal-400 bg-teal-50 dark:bg-teal-950/20" },
                { trait: "Cercano", desc: "Hablamos de tú. Sin jerga corporativa. El radiólogo es nuestro compañero.", color: "border-amber-400 bg-amber-50 dark:bg-amber-950/20" },
                { trait: "Seguro", desc: "RGPD, trazabilidad, auditoría. La confianza clínica no se negocia.", color: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" },
              ].map((t) => (
                <div key={t.trait} className={`rounded-lg border p-3 ${t.color}`}>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t.trait}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{t.desc}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
                <p className="text-[10px] font-bold text-green-700 dark:text-green-400 mb-1.5">✓ SÍ DECIR</p>
                <ul className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>• "Reduce tu tiempo de informe un 60%"</li>
                  <li>• "Dicta, revisa y firma — en segundos"</li>
                  <li>• "Tú controlas, la IA ayuda"</li>
                  <li>• "Diseñado por radiólogos, para radiólogos"</li>
                  <li>• "Trazabilidad completa dictado→informe"</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                <p className="text-[10px] font-bold text-red-700 dark:text-red-400 mb-1.5">✗ NO DECIR</p>
                <ul className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>• "La IA reemplaza al radiólogo"</li>
                  <li>• "Informes automáticos sin supervisión"</li>
                  <li>• "Diagnóstico por IA"</li>
                  <li>• "No necesitas revisar el informe"</li>
                  <li>• "Funciona solo / sin intervención humana"</li>
                </ul>
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Value propositions por audiencia</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="Radiólogo" text="Reduce el tiempo de informe un 60% sin sacrificar calidad. Dicta tus hallazgos por voz, elige la plantilla y deja que la IA genere un informe estructurado con conclusión en segundos. Tú revisas y firmas — mantienes el control total." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Jefe de servicio" text="Visibilidad completa de la productividad del servicio con métricas en tiempo real. Controla tiempos de informe, tasas de adopción, completitud estructural y satisfacción del equipo. Estandariza la calidad de los informes en todo el servicio." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Director médico" text="Estandarización de informes y trazabilidad completa para acreditaciones. Cada informe tiene auditoría dictado→hallazgos→conclusión. Cumplimiento RGPD, datos en la UE, sin almacenamiento de datos de pacientes en servidores de IA." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="IT Hospital" text="Zero-install, cloud-native, compatible con cualquier RIS/PACS vía copiar-pegar. Sin integraciones complejas, sin VPN, sin servidores locales. HTTPS, cifrado en reposo y tránsito, SSO disponible. Despliegue en un día." copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Elevator pitches</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="15 segundos" text="Radiogen.ai convierte tu dictado de hallazgos en un informe radiológico estructurado con conclusión automática. Dictas, revisas y firmas. 60% más rápido." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="30 segundos" text="Radiogen.ai es una plataforma de informes radiológicos con IA. El radiólogo dicta sus hallazgos por voz o texto, selecciona la plantilla del estudio y la IA genera un informe estructurado completo con conclusión clínica en segundos. Funciona con cualquier modalidad — TC, RM, ecografía, radiografía. El radiólogo siempre revisa y aprueba. Reduce el tiempo de informe un 60%." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="60 segundos" text="Los radiólogos dedican entre 5 y 15 minutos a cada informe, gran parte del tiempo formateando y redactando secciones que ya saben que son normales. Radiogen.ai cambia eso. El radiólogo dicta solo lo relevante — los hallazgos — por voz o texto. Elige la plantilla del estudio y la IA genera un informe estructurado completo: rellena las secciones normales con frases de normalidad apropiadas, coloca cada hallazgo en su sección anatómica correcta y redacta una conclusión clínica priorizada. Todo con trazabilidad completa dictado-a-informe. El radiólogo revisa, ajusta si quiere y firma. Funciona con TC, RM, ecografía, radiografía, mamografía y procedimientos. Para hospitales, incluye gestión multiusuario, métricas de productividad y cumplimiento RGPD total. Plan gratuito con 30 informes/mes para que cualquier radiólogo lo pruebe sin compromiso." copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Feature taglines</SectionTitle>
            <div className="space-y-1.5">
              {[
                { label: "Dictado por voz", text: "Dicta tus hallazgos — la IA hace el resto. Whisper AI transcribe con precisión médica en 6 idiomas." },
                { label: "Plantillas", text: "Plantillas personalizables por modalidad y región anatómica. Crea las tuyas o usa las prediseñadas." },
                { label: "Conclusión IA", text: "Conclusión clínica automática con priorización jerárquica. Responde a la pregunta clínica del solicitante." },
                { label: "Trazabilidad", text: "Cada frase del informe se traza al dictado original. Auditoría completa para seguridad clínica." },
                { label: "Aprendizaje estilo", text: "La IA aprende tus frases de normalidad y tu estilo de conclusión. Cada informe se parece más a ti." },
                { label: "Multi-idioma", text: "Dicta en cualquier idioma, genera el informe en otro. ES, EN, PT, FR, DE, IT." },
                { label: "Gestión hospital", text: "Panel de administración hospitalaria: usuarios, secciones, roles, métricas de productividad y encuestas NPS." },
                { label: "Métricas piloto", text: "Mide el impacto real: tiempo por informe, tasa de edición IA, adopción del dictado, satisfacción del equipo." },
              ].map((f) => <CopyBlock key={f.label} label={f.label} text={f.text} copied={copiedColor} onCopy={cp} />)}
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ═══ COPY MARKETING ═══ */}
      {brandTab === "copy" && (
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Pain points y soluciones</SectionTitle>
            <div className="space-y-2">
              {[
                { pain: "Formateo manual repetitivo", sol: "La IA estructura el informe automáticamente a partir de un dictado libre." },
                { pain: "Secciones normales que consumen tiempo", sol: "Radiogen.ai rellena las secciones no mencionadas con frases de normalidad apropiadas para cada modalidad." },
                { pain: "Conclusiones que tardan más que el dictado", sol: "Conclusión clínica automática con priorización jerárquica. El radiólogo solo revisa." },
                { pain: "Variabilidad entre radiólogos del servicio", sol: "Plantillas compartidas y frases de normalidad estandarizadas. Misma calidad, diferente estilo." },
                { pain: "Sin visibilidad de productividad", sol: "Dashboard de métricas en tiempo real: tiempos, volumen, adopción, completitud." },
                { pain: "Integración compleja con RIS/PACS", sol: "Zero-install. El radiólogo copia el informe al RIS. Sin APIs, sin VPN, sin IT." },
              ].map((p, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300">✗ {p.pain}</div>
                  <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300">✓ {p.sol}</div>
                </div>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>CTAs por contexto</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="Landing page" text="Empieza gratis — 30 informes/mes, sin tarjeta de crédito" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Landing 2" text="Genera tu primer informe en 60 segundos →" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Email" text="Solicita tu acceso al programa piloto hospitalario — te respondemos en 24h" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Social" text="¿Aún formateas informes a mano? Prueba Radiogen.ai y recupera tu tiempo →" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Demo" text="Agenda una demo de 15 minutos — te mostramos cómo funciona con tus propias plantillas" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Upgrade" text="Sube a Pro: informes ilimitados, aprendizaje de estilo y soporte prioritario" copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Números para marketing</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {[
                { num: "60%", desc: "Reducción del tiempo por informe" },
                { num: "30", desc: "Informes gratis al mes" },
                { num: "6", desc: "Idiomas soportados" },
                { num: "<30s", desc: "Generación de informe completo" },
                { num: "100%", desc: "Trazabilidad dictado→informe" },
                { num: "0", desc: "Instalaciones necesarias" },
                { num: "RGPD", desc: "Cumplimiento total, datos en UE" },
                { num: "24h", desc: "Despliegue hospitalario" },
              ].map((s) => (
                <button key={s.num} onClick={() => cp(s.num, `${s.num} — ${s.desc}`)} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:border-teal-400 transition-colors">
                  <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{s.num}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>FAQ — preguntas frecuentes</SectionTitle>
            <div className="space-y-1.5">
              {[
                { q: "¿La IA diagnostica?", a: "No. Radiogen.ai estructura y redacta el informe a partir de tu dictado. No emite diagnósticos ni interpreta imágenes. El radiólogo siempre tiene el control total." },
                { q: "¿Es seguro para datos de pacientes?", a: "No almacenamos datos de pacientes en servidores de IA. Los datos se procesan y descartan. Cumplimiento RGPD total con datos alojados en la Unión Europea." },
                { q: "¿Funciona con mi RIS/PACS?", a: "Sí. Radiogen.ai es independiente del RIS/PACS. Generas el informe en nuestra plataforma y lo copias a tu sistema habitual. Sin integraciones técnicas." },
                { q: "¿Necesito instalar algo?", a: "No. Es una aplicación web que funciona en cualquier navegador moderno. Sin instalaciones, sin VPN, sin permisos de IT." },
                { q: "¿Cuánto cuesta?", a: "Plan gratuito con 30 informes/mes. Planes profesionales desde 49€/mes con informes ilimitados. Planes hospitalarios a medida." },
                { q: "¿Puedo crear mis propias plantillas?", a: "Sí. Puedes crear plantillas personalizadas con las secciones anatómicas que necesites, o usar las prediseñadas para cada modalidad y región." },
                { q: "¿En qué idiomas funciona?", a: "Puedes dictar en 6 idiomas (español, inglés, portugués, francés, alemán, italiano) y generar el informe en cualquiera de ellos, incluso diferente al del dictado." },
                { q: "¿Cómo funciona el programa piloto?", a: "Ofrecemos un programa piloto de 3-6 meses con métricas de impacto (tiempo, productividad, satisfacción). Sin coste durante el piloto. Incluye formación y soporte dedicado." },
                { q: "¿La IA aprende mi estilo?", a: "Sí. El sistema aprende tus frases de normalidad preferidas y tu estilo de conclusión. Cada informe se adapta más a tu forma de redactar." },
                { q: "¿Qué modalidades soporta?", a: "TC, RM (incluida cardíaca), ecografía, radiografía, mamografía, PET-TC, medicina nuclear y procedimientos intervencionistas." },
              ].map((faq) => <CopyBlock key={faq.q} label={faq.q} text={faq.a} copied={copiedColor} onCopy={cp} />)}
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ═══ EMAIL TEMPLATES ═══ */}
      {brandTab === "emails" && (
        <div className="space-y-4">
          {[
            { label: "Cold outreach", subject: "IA para informes radiológicos — programa piloto sin coste", body: `Estimado/a Dr./Dra. [nombre],

Me pongo en contacto con usted desde Radiogen.ai. Hemos desarrollado una plataforma de informes radiológicos con inteligencia artificial que permite al radiólogo dictar sus hallazgos por voz y generar un informe estructurado completo con conclusión en segundos.

Los radiólogos que ya la utilizan han reducido su tiempo de informe entre un 40% y un 60%, manteniendo el control total sobre el contenido clínico.

Actualmente estamos seleccionando servicios de radiología para nuestro programa piloto hospitalario, que incluye:
• 3-6 meses de uso gratuito para todo el servicio
• Métricas de impacto en tiempo real (productividad, calidad, satisfacción)
• Formación personalizada y soporte dedicado
• Informe de resultados al finalizar

¿Tendría 15 minutos esta semana para una demo rápida? Puedo mostrarle cómo funciona con plantillas de su propia especialidad.

Un saludo,
[nombre]
Radiogen.ai` },
            { label: "Follow-up", subject: "Re: IA para informes radiológicos — ¿le interesa una demo?", body: `Estimado/a Dr./Dra. [nombre],

Le escribí hace unos días sobre Radiogen.ai, nuestra plataforma de informes radiológicos con IA. Entiendo que su agenda es exigente, así que seré breve.

Un dato: los radiólogos de nuestro programa piloto reducen el tiempo de informe una media de 4 minutos por estudio. En un servicio que genera 50 informes diarios, eso son más de 3 horas recuperadas cada día.

Si le parece interesante, estaré encantado de hacer una demo de 15 minutos a la hora que mejor le convenga. Sin compromiso.

Un saludo,
[nombre]` },
            { label: "Invitación demo", subject: "Demo personalizada Radiogen.ai — [fecha]", body: `Hola [nombre],

Gracias por tu interés en Radiogen.ai. Te confirmo la demo para el [fecha] a las [hora].

En la sesión (15-20 min) veremos:
✅ Cómo funciona el dictado por voz con Whisper AI
✅ Generación de informe estructurado en tiempo real
✅ Conclusión automática con priorización clínica
✅ Trazabilidad completa dictado → informe
✅ Plantillas personalizables
✅ Panel de administración hospitalaria (si aplica)

No necesitas instalar nada. Te enviaré un enlace de videollamada antes de la sesión.

Si tienes alguna plantilla o tipo de estudio que te gustaría ver, envíamelo y lo preparo.

¡Nos vemos el [fecha]!

Un saludo,
[nombre]` },
            { label: "Post-demo", subject: "Resumen de la demo + próximos pasos", body: `Hola [nombre],

Gracias por tu tiempo en la demo de hoy. Fue un placer mostrarte Radiogen.ai.

Resumen de lo que vimos:
• Dictado por voz → informe estructurado en <30 segundos
• Conclusión automática con priorización jerárquica
• Trazabilidad completa de cada hallazgo
• [personalizar según lo comentado]

Próximos pasos que acordamos:
1. [ej: Te envío acceso de prueba con 30 informes gratuitos]
2. [ej: Preparamos las plantillas de TC tórax y RM cerebral]
3. [ej: Reunión con el jefe de servicio el día X]

Tu acceso gratuito está activo en radiogen.ai — puedes empezar a usarlo ahora mismo.

Cualquier duda, estoy disponible por email o WhatsApp.

Un saludo,
[nombre]` },
            { label: "Newsletter bienvenida", subject: "Bienvenido/a a Radiogen.ai 🎉", body: `¡Hola!

Bienvenido/a a Radiogen.ai. Ya tienes acceso a tu cuenta con 30 informes gratuitos al mes.

Primeros pasos:
1️⃣ Entra en radiogen.ai e inicia sesión
2️⃣ Selecciona una modalidad y plantilla
3️⃣ Dicta tus hallazgos por voz o escríbelos
4️⃣ Pulsa "Generar informe" y revisa el resultado
5️⃣ Copia el informe a tu RIS/PACS

Tips para sacar el máximo partido:
• Personaliza tus frases de normalidad en Configuración
• Prueba el modo "Solo dictado" para informes breves
• Activa el dictado por voz — funciona sorprendentemente bien
• Crea plantillas propias para tus estudios más frecuentes

¿Necesitas ayuda? Responde a este email y te atendemos personalmente.

Equipo Radiogen.ai` },
            { label: "Invitación piloto", subject: "Programa piloto Radiogen.ai — Invitación para [hospital]", body: `Estimado/a [nombre],

Le escribo para invitar formalmente al servicio de radiología de [hospital] a participar en el programa piloto de Radiogen.ai.

¿Qué incluye el programa piloto?
• Acceso gratuito a Radiogen.ai durante 3-6 meses para todo el servicio
• Formación presencial o virtual para adjuntos y residentes
• Plantillas personalizadas para sus estudios más frecuentes
• Panel de métricas en tiempo real para el jefe de servicio
• Soporte técnico dedicado durante todo el programa
• Informe de resultados con métricas de impacto al finalizar

¿Qué medimos?
• Tiempo medio por informe (antes vs. durante el piloto)
• Tasa de adopción del dictado por voz
• Tasa de edición sobre el borrador de IA (indicador de calidad)
• Completitud estructural de los informes
• Satisfacción del equipo (encuesta NPS)

El programa no tiene coste ni compromiso de contratación posterior. Nuestro objetivo es validar el impacto clínico y operativo de la herramienta en un entorno hospitalario real.

¿Podríamos agendar una reunión para presentar el programa al equipo?

Un cordial saludo,
[nombre]
Radiogen.ai` },
          ].map((email) => (
            <Card key={email.label}><CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-teal-500" />
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white">{email.label}</h3>
                </div>
                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => cp(`email-${email.label}`, `Asunto: ${email.subject}\n\n${email.body}`)}>
                  {copiedColor === `email-${email.label}` ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  Copiar todo
                </Button>
              </div>
              <CopyBlock label="Asunto" text={email.subject} copied={copiedColor} onCopy={cp} />
              <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{email.body}</p>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* ═══ SOCIAL MEDIA ═══ */}
      {brandTab === "social" && (
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Estrategia por plataforma</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { platform: "LinkedIn", color: "border-blue-400", strategy: "Thought leadership + casos de uso + artículos clínicos. Tono: profesional-cercano. 3-4 posts/semana. Target: jefes de servicio, radiólogos senior, directores médicos." },
                { platform: "Instagram", color: "border-pink-400", strategy: "Visual: infografías de productividad, tips rápidos, behind the scenes del producto. Stories: demos cortas, encuestas, antes/después. 4-5 posts/semana." },
                { platform: "X / Twitter", color: "border-gray-400", strategy: "Noticias del sector, hilos educativos sobre IA en radiología, actualizaciones de producto. Tono: directo, conciso. 1-2 tweets/día." },
                { platform: "Facebook", color: "border-blue-500", strategy: "Comunidad: posts informativos, compartir artículos, anuncios de funcionalidades. Grupos de radiología como canal de descubrimiento." },
                { platform: "TikTok", color: "border-purple-400", strategy: "Demos rápidas de 30-60s, humor de radiólogos, antes/después en productividad. Formato: pantalla grabada + voz en off." },
              ].map((p) => (
                <div key={p.platform} className={`rounded-lg border p-3 ${p.color}`}>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{p.platform}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400">{p.strategy}</p>
                </div>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Calendario semanal</SectionTitle>
            <div className="grid grid-cols-5 gap-1.5 text-[10px]">
              {[
                { day: "LUN", type: "Educativo", desc: "Artículo o dato sobre IA en radiología", color: "bg-blue-50 dark:bg-blue-950/20" },
                { day: "MAR", type: "Producto", desc: "Tip de uso, funcionalidad destacada", color: "bg-teal-50 dark:bg-teal-950/20" },
                { day: "MIÉ", type: "Industria", desc: "Noticia del sector, tendencias", color: "bg-amber-50 dark:bg-amber-950/20" },
                { day: "JUE", type: "Social proof", desc: "Testimonial, caso de uso, métrica", color: "bg-emerald-50 dark:bg-emerald-950/20" },
                { day: "VIE", type: "Casual", desc: "Behind the scenes, humor, equipo", color: "bg-purple-50 dark:bg-purple-950/20" },
              ].map((d) => (
                <div key={d.day} className={`rounded-lg p-2 ${d.color}`}>
                  <p className="font-bold text-gray-900 dark:text-white">{d.day}</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{d.type}</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">{d.desc}</p>
                </div>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Posts listos para publicar</SectionTitle>
            <div className="space-y-1.5">
              {[
                { label: "LinkedIn 1", text: "¿Cuántos minutos dedicas a formatear cada informe radiológico?\n\nLos radiólogos de nuestro programa piloto han reducido su tiempo de informe un 60%. No porque la IA haga el trabajo por ellos — sino porque elimina el tiempo muerto: formateo, secciones normales, estructura.\n\nEl radiólogo dicta lo relevante. La IA lo estructura. El radiólogo revisa y firma.\n\nEso es Radiogen.ai.\n\n#Radiologia #IA #ProductividadMedica" },
                { label: "LinkedIn 2", text: "3 horas.\n\nEso es lo que un servicio de radiología con 50 informes diarios puede recuperar cada día con Radiogen.ai.\n\n4 minutos menos por informe × 50 informes = 200 minutos = 3.3 horas.\n\nTiempo que vuelve a los radiólogos. Para formación. Para casos complejos. Para irse a casa a su hora.\n\n¿Quieres medirlo en tu servicio? Programa piloto gratuito →\n\n#HealthTech #Radiologia" },
                { label: "LinkedIn 3", text: "\"La IA en radiología no va de reemplazar al radiólogo. Va de devolverle el tiempo que la burocracia le ha robado.\"\n\nEn Radiogen.ai diseñamos herramientas que eliminan el formateo manual, no el criterio clínico.\n\nEl radiólogo dicta. Revisa. Firma. Mantiene el control total.\n\nLa IA es el copiloto, no el piloto.\n\n#InteligenciaArtificial #Radiologia" },
                { label: "Instagram 1", text: "ANTES: 8 minutos por informe 😰\nDESPUÉS: 3 minutos con Radiogen.ai ⚡\n\nDicta → Genera → Revisa → Firma\n\n¿Aún formateas tus informes a mano? Link en bio 👆\n\n#Radiologia #IA #MedTech #ProductividadMedica #InformesRadiologicos" },
                { label: "Instagram 2", text: "5 cosas que hace Radiogen.ai por ti:\n\n1️⃣ Transcribe tu dictado por voz\n2️⃣ Coloca cada hallazgo en su sección\n3️⃣ Rellena las secciones normales\n4️⃣ Genera la conclusión clínica\n5️⃣ Traza cada frase al dictado original\n\nTú solo revisas y firmas ✅\n\n#Radiologia #IA #HealthTech" },
                { label: "X / Twitter 1", text: "El radiólogo medio pasa el 40% de su tiempo formateando informes.\n\nRadiogen.ai reduce eso a cero.\n\nDicta → Genera → Revisa → Firma.\n\n30 informes gratis/mes. Sin tarjeta. radiogen.ai" },
                { label: "X / Twitter 2", text: "Pregunta seria: ¿por qué seguimos rellenando \"hígado de tamaño y ecoestructura normal\" a mano en cada informe?\n\nLa IA puede hacer eso. Tú deberías estar dictando lo que importa.\n\nradiogen.ai" },
                { label: "X / Twitter 3", text: "Lo que NO hace Radiogen.ai:\n❌ Diagnosticar\n❌ Interpretar imágenes\n❌ Sustituir al radiólogo\n\nLo que SÍ hace:\n✅ Estructurar tu dictado\n✅ Generar conclusiones\n✅ Ahorrarte 4 min/informe\n\nLa IA como copiloto, no como piloto." },
                { label: "Facebook 1", text: "🏥 ¿Eres radiólogo/a y quieres recuperar tu tiempo?\n\nRadiogen.ai genera informes radiológicos estructurados a partir de tu dictado por voz. Funciona con TC, RM, ecografía, radiografía y más.\n\n✅ 30 informes gratis al mes\n✅ Sin instalación\n✅ RGPD compliant\n\nPruébalo en radiogen.ai" },
                { label: "TikTok guión", text: "[Pantalla grabada del producto]\n\nVoz en off: \"¿Quieres ver cómo un radiólogo genera un informe de TC de tórax en 30 segundos?\"\n\n[Selecciona plantilla TC Tórax]\n\"Primero, selecciono la plantilla\"\n\n[Dicta por voz: 'consolidación en lóbulo inferior derecho con broncograma aéreo, derrame pleural bilateral de predominio izquierdo']\n\"Dicto solo lo relevante\"\n\n[Pulsa generar, aparece informe completo]\n\"Y la IA genera el informe completo con conclusión\"\n\n[Muestra la conclusión]\n\"Conclusión clínica automática, priorizada\"\n\n\"60% más rápido. Link en bio.\"\n\n#Radiologia #IA #MedTech #Doctor" },
              ].map((post) => <CopyBlock key={post.label} label={post.label} text={post.text} copied={copiedColor} onCopy={cp} />)}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Sets de hashtags</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="General" text="#Radiologia #IA #RadiologyAI #InformesRadiologicos #Teleradiologia #MedTech #HealthTech #Diagnostico #ImagenMedica #InteligenciaArtificial" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Producto" text="#RadiogenAI #InformesConIA #DictadoMedico #RadiologyReports #AIinHealthcare #MedicalAI #DigitalHealth #ProductividadMedica" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Hospital" text="#GestionHospitalaria #ServicioRadiologia #CalidadAsistencial #TransformacionDigital #HospitalDigital #InnovacionSanitaria #SaludDigital" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Evento" text="#RSNA #ECR #SERAM #CongresoRadiologia #MedTechSummit #HealthTechSpain #eHealth #DigitalHealthSummit" copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ═══ SEO & WEB ═══ */}
      {brandTab === "seo" && (
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Keywords principales</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {["informes radiológicos con IA", "software radiología", "dictado radiólogo", "informe radiológico automático", "plantillas radiología", "IA radiología", "transcripción médica IA", "conclusión radiológica automática", "herramienta radiólogo", "radiology report AI", "PACS reporting", "AI radiology software"].map((kw) => (
                <button key={kw} onClick={() => cp(`kw-${kw}`, kw)} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors">
                  {copiedColor === `kw-${kw}` ? "✓" : ""} {kw}
                </button>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Long-tail keywords</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {["cómo hacer informes radiológicos más rápido", "software dictado voz radiología", "plantilla informe TC tórax", "automatizar informes radiológicos", "IA para redactar informes médicos", "programa piloto IA hospital", "mejorar productividad servicio radiología", "informe resonancia magnética cardíaca", "conclusión automática radiología", "trazabilidad informe radiológico", "herramienta radiología sin instalación", "RGPD software médico nube", "reducir tiempo informe radiológico", "aprendizaje estilo radiólogo IA", "gestión usuarios servicio radiología"].map((kw) => (
                <button key={kw} onClick={() => cp(`lt-${kw}`, kw)} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  {kw}
                </button>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Meta titles y descriptions</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="Home title" text="Radiogen.ai — Informes Radiológicos con IA | Dictado por Voz + Conclusión Automática" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Home desc" text="Genera informes radiológicos estructurados en segundos con IA. Dictado por voz, plantillas personalizables, conclusión automática y trazabilidad completa. 30 informes gratis/mes." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Pricing title" text="Precios Radiogen.ai — Desde 0€ | Plan Gratuito, Pro y Hospital" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Pricing desc" text="Plan gratuito con 30 informes/mes. Plan Pro desde 49€/mes con informes ilimitados y aprendizaje de estilo. Planes hospitalarios a medida con métricas y gestión de usuarios." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Piloto title" text="Programa Piloto Hospitalario — Radiogen.ai | IA para tu Servicio de Radiología" copied={copiedColor} onCopy={cp} />
              <CopyBlock label="Piloto desc" text="Programa piloto gratuito de 3-6 meses para servicios de radiología. Métricas de impacto en tiempo real, formación personalizada y soporte dedicado. Sin compromiso de contratación." copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Ideas para blog</SectionTitle>
            <div className="space-y-1.5">
              {[
                "Cómo la IA está transformando los informes radiológicos en 2026",
                "5 formas de reducir el tiempo de informe en radiología sin perder calidad",
                "Guía completa: dictado por voz para radiólogos — herramientas y buenas prácticas",
                "Programa piloto hospitalario: cómo medir el impacto de la IA en radiología",
                "Trazabilidad en informes radiológicos: por qué importa y cómo implementarla",
                "RM cardíaca: cómo estandarizar informes complejos con plantillas inteligentes",
                "RGPD y software médico en la nube: guía práctica para hospitales",
                "Radiólogo + IA: copiloto, no piloto — la filosofía detrás de Radiogen.ai",
                "Métricas de productividad en radiología: qué medir y cómo interpretarlo",
                "De 8 a 3 minutos por informe: caso de estudio del programa piloto",
              ].map((title) => <CopyBlock key={title} label="Blog" text={title} copied={copiedColor} onCopy={cp} />)}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Headlines para landing page</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="H1 — A" text="Informa un 60% más rápido. Sin cambiar tu forma de trabajar." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="H1 — B" text="Dicta tus hallazgos. La IA hace el informe. Tú firmas." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="H1 — C" text="El copiloto de IA que todo radiólogo necesita." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="H1 — D" text="Informes radiológicos en segundos. Calidad clínica intacta." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="H1 — E" text="Deja de formatear. Empieza a informar." copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ═══ PRENSA ═══ */}
      {brandTab === "prensa" && (
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Boilerplate corporativo</SectionTitle>
            <div className="space-y-1.5">
              <CopyBlock label="50 palabras" text="Radiogen.ai es una plataforma de informes radiológicos potenciada por inteligencia artificial. Permite al radiólogo dictar hallazgos por voz y generar informes estructurados completos con conclusión automática en segundos. Compatible con todas las modalidades de imagen médica, con cumplimiento RGPD y despliegue cloud-native." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="100 palabras" text="Radiogen.ai es la plataforma de informes radiológicos con IA diseñada por y para radiólogos. El sistema permite al profesional dictar sus hallazgos por voz o texto, seleccionar una plantilla del estudio y generar un informe estructurado completo — con todas las secciones anatómicas, frases de normalidad apropiadas y conclusión clínica priorizada — en menos de 30 segundos. Incluye trazabilidad completa dictado-a-informe, aprendizaje del estilo del radiólogo, gestión hospitalaria multiusuario y métricas de productividad en tiempo real. Compatible con TC, RM, ecografía, radiografía, mamografía y procedimientos. Cumplimiento RGPD total con datos en la UE." copied={copiedColor} onCopy={cp} />
              <CopyBlock label="250 palabras" text={`Radiogen.ai es una plataforma SaaS de informes radiológicos potenciada por inteligencia artificial, diseñada para eliminar el trabajo repetitivo de la redacción de informes y devolver tiempo clínico al radiólogo.

El flujo de trabajo es simple: el radiólogo selecciona la plantilla del estudio (TC tórax, RM cerebral, ecografía abdominal, etc.), dicta sus hallazgos por voz o texto libre, y la IA genera un informe estructurado completo en menos de 30 segundos. El sistema distribuye cada hallazgo en su sección anatómica correcta, rellena las secciones no mencionadas con frases de normalidad apropiadas para la modalidad, y redacta una conclusión clínica con priorización jerárquica. El radiólogo siempre revisa, ajusta si lo desea y firma.

Características clave: dictado por voz con Whisper AI en 6 idiomas, plantillas personalizables, conclusión automática con respuesta a pregunta clínica, trazabilidad completa de cada frase del informe al dictado original, aprendizaje progresivo del estilo del radiólogo, y un módulo especializado de RM cardíaca con cálculos automáticos de volúmenes, fracciones y rangos normales por sexo.

Para hospitales, Radiogen.ai incluye gestión multiusuario con roles y secciones, panel de métricas de productividad en tiempo real (tiempo por informe, tasa de adopción, tasa de edición IA, satisfacción del equipo) y un programa piloto gratuito de 3-6 meses con informe de resultados.

La plataforma es cloud-native, zero-install, compatible con cualquier RIS/PACS vía copiar-pegar, y cumple íntegramente con el RGPD con datos alojados en la Unión Europea.`} copied={copiedColor} onCopy={cp} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Datos para prensa</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Sector", value: "HealthTech / MedTech / RadTech" },
                { label: "Producto", value: "SaaS B2B — informes radiológicos con IA" },
                { label: "Fundación", value: "2024, Las Palmas de Gran Canaria, España" },
                { label: "Mercado", value: "España, LATAM, Europa" },
                { label: "Modalidades", value: "TC, RM, Eco, Rx, Mamografía, PET, Nuclear, Procedimientos" },
                { label: "Idiomas", value: "ES, EN, PT, FR, DE, IT" },
                { label: "Modelo", value: "Freemium — 30 informes gratis/mes" },
                { label: "Tecnología", value: "Next.js, Supabase, GPT-4, Whisper AI, Cloud EU" },
                { label: "Cumplimiento", value: "RGPD, datos UE, sin datos paciente en IA" },
              ].map((d) => (
                <button key={d.label} onClick={() => cp(`press-${d.label}`, `${d.label}: ${d.value}`)} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:border-teal-400 transition-colors">
                  <p className="text-[10px] text-gray-500">{d.label}</p>
                  <p className="text-[11px] font-medium text-gray-900 dark:text-white mt-0.5">{d.value}</p>
                </button>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-4">
            <SectionTitle>Plantilla nota de prensa</SectionTitle>
            <CopyBlock label="Nota de prensa" text={`NOTA DE PRENSA
Para publicación inmediata

[TITULAR: máx 10 palabras, gancho noticioso]

[Ciudad], [fecha] — Radiogen.ai, la plataforma de informes radiológicos con inteligencia artificial, anuncia [el hito/novedad].

[Párrafo 1 — El qué: describir la novedad en 2-3 frases. Datos concretos.]

[Párrafo 2 — El porqué: contexto del mercado, problema que resuelve. Cifras del sector.]

[Párrafo 3 — Cita del CEO/fundador: perspectiva personal sobre el anuncio.]

"[Cita directa entre comillas]", afirmó [nombre], [cargo] de Radiogen.ai.

[Párrafo 4 — Detalles técnicos o funcionales. Qué cambia para el usuario.]

[Párrafo 5 — Próximos pasos: roadmap, disponibilidad, cómo acceder.]

Sobre Radiogen.ai
Radiogen.ai es una plataforma de informes radiológicos potenciada por inteligencia artificial. Permite al radiólogo dictar hallazgos por voz y generar informes estructurados completos con conclusión automática en segundos. Compatible con todas las modalidades de imagen médica, con cumplimiento RGPD y despliegue cloud-native.

Contacto de prensa:
[nombre] — [email] — [teléfono]
radiogen.ai`} copied={copiedColor} onCopy={cp} />
          </CardContent></Card>
        </div>
      )}

      {/* ═══ ASSETS ═══ */}
      {brandTab === "assets" && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-teal-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Assets descargables</h3>
              <Badge variant="secondary" className="text-[10px]">{BRAND_ASSETS.length} assets</Badge>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadAll}>
              <Download className="h-3 w-3" />
              Descargar todo
            </Button>
          </div>
          {categories.map(cat => (
            <div key={cat} className="space-y-2">
              <SectionTitle>{cat}</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {BRAND_ASSETS.filter(a => a.category === cat).map(asset => (
                  <div key={asset.id} className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-teal-400 dark:hover:border-teal-600 transition-colors">
                    <div className="relative flex items-center justify-center overflow-hidden" style={{
                      height: asset.width === asset.height ? 120 : asset.height > asset.width ? 160 : 80,
                      background: asset.bg === "transparent" ? "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 0 0 / 16px 16px" : "#f3f4f6",
                    }}>
                      <img src={getPreviewDataUrl(asset)} alt={asset.label} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{asset.label}</p>
                      <p className="text-[10px] text-gray-500">{asset.description}</p>
                      <p className="text-[10px] text-gray-400">{asset.width}×{asset.height}px</p>
                      <Button variant="outline" size="sm" className="w-full h-7 text-[11px] gap-1 mt-1" onClick={() => renderAndDownload(asset)}>
                        <Download className="h-3 w-3" />
                        Descargar PNG
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}

export function AdminMarketingTab() {
  const [subTab, setSubTab] = useState<SubTab>("posts");
  const [postType, setPostType] = useState<PostType>("promo");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [tone, setTone] = useState("profesional pero cercano");
  const [language, setLanguage] = useState("es");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedPost, setGeneratedPost] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("gradient");
  const [aspect, setAspect] = useState<Aspect>("square");
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [keys, setKeys] = useState<MarketingKeys>(DEFAULTS);
  const [showKey, setShowKey] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    setKeys(loadKeys());
  }, []);

  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/assets");
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch { /* ignore */ }
    setAssetsLoading(false);
  }, []);

  useEffect(() => {
    if (subTab === "library") loadAssets();
  }, [subTab, loadAssets]);

  function updateKey<K extends keyof MarketingKeys>(field: K, value: MarketingKeys[K]) {
    setKeys((prev) => {
      const next = { ...prev, [field]: value };
      saveKeys(next);
      return next;
    });
  }

  async function handleGeneratePost() {
    if (!keys.openaiKey) { setGeneratedPost("Error: Configura tu API Key de OpenAI arriba"); return; }
    setPostLoading(true);
    setGeneratedPost("");
    try {
      const res = await fetch("/api/admin/marketing/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: postType,
          platform,
          tone,
          language,
          customPrompt: customPrompt.trim() || undefined,
          openaiKey: keys.openaiKey,
          textModel: keys.textModel,
        }),
      });
      const data = await res.json();
      if (res.ok) setGeneratedPost(data.post);
      else setGeneratedPost(`Error: ${data.error}`);
    } catch {
      setGeneratedPost("Error de conexión");
    }
    setPostLoading(false);
  }

  async function handleGenerateImage() {
    if (!keys.imageApiKey) { setGeneratedImage("Error: Configura tu API Key de imágenes arriba"); return; }
    setImageLoading(true);
    setGeneratedImage("");
    try {
      const res = await fetch("/api/admin/marketing/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspect,
          imageApiKey: keys.imageApiKey,
          imageProvider: keys.imageProvider,
          imageModel: keys.imageModel,
        }),
      });
      const data = await res.json();
      if (res.ok) setGeneratedImage(data.image);
      else setGeneratedImage(`Error: ${data.error}`);
    } catch {
      setGeneratedImage("Error de conexión");
    }
    setImageLoading(false);
  }

  async function handleSaveAsset(type: "post" | "image") {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          platform: type === "post" ? platform : aspect,
          title: type === "post" ? `${postType} - ${platform}` : imagePrompt.slice(0, 60),
          content: type === "post" ? generatedPost : imagePrompt,
          image_url: type === "image" ? generatedImage : null,
          metadata: type === "post" ? { postType, tone, language } : { style: imageStyle, aspect },
        }),
      });
      if (res.ok) await loadAssets();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleDeleteAsset(id: string) {
    try {
      const res = await fetch("/api/admin/marketing/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }

  function downloadImage(dataUrl: string, name: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${name}.png`;
    a.click();
  }

  const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "posts", label: "Posts", icon: <MessageSquareText className="h-3.5 w-3.5" /> },
    { key: "images", label: "Imágenes", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: "brand", label: "Brand Kit", icon: <Palette className="h-3.5 w-3.5" /> },
    { key: "library", label: "Biblioteca", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* ── API Keys config ── */}
      <Card>
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full px-5 py-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">API Keys</span>
            {keys.openaiKey && keys.imageApiKey ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">Configuradas</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px]">
                {!keys.openaiKey && !keys.imageApiKey ? "Sin configurar" : "Incompleta"}
              </Badge>
            )}
          </div>
          {configOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {configOpen && (
          <CardContent className="pt-0 pb-5 px-5 space-y-5 border-t border-gray-100 dark:border-gray-800">
            {/* Text generation */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Texto (OpenAI)</p>
              <div className="space-y-1.5">
                <Label className="text-xs">OpenAI API Key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={keys.openaiKey}
                    onChange={(e) => updateKey("openaiKey", e.target.value)}
                    placeholder="sk-..."
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <select
                  value={keys.textModel}
                  onChange={(e) => updateKey("textModel", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2 text-gray-900 dark:text-white"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (rápido, barato)</option>
                  <option value="gpt-4o">GPT-4o (mejor calidad)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
            </div>

            {/* Image generation */}
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Imágenes</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Proveedor</Label>
                <div className="flex gap-1">
                  {([
                    { key: "together", label: "Together AI", desc: "Flux Schnell ~$0.003/img" },
                    { key: "replicate", label: "Replicate", desc: "Flux Pro ~$0.005/img" },
                  ] as const).map((p) => (
                    <button
                      key={p.key}
                      onClick={() => {
                        updateKey("imageProvider", p.key);
                        updateKey("imageModel", p.key === "together" ? "black-forest-labs/FLUX.1-schnell" : "black-forest-labs/flux-1.1-pro");
                      }}
                      className={`flex-1 h-9 rounded-md text-xs font-medium transition-colors ${
                        keys.imageProvider === p.key
                          ? "bg-purple-500 text-white"
                          : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{keys.imageProvider === "together" ? "Together AI" : "Replicate"} API Key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={keys.imageApiKey}
                    onChange={(e) => updateKey("imageApiKey", e.target.value)}
                    placeholder={keys.imageProvider === "together" ? "tog-..." : "r8_..."}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <select
                  value={keys.imageModel}
                  onChange={(e) => updateKey("imageModel", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2 text-gray-900 dark:text-white"
                >
                  {keys.imageProvider === "together" ? (
                    <>
                      <option value="black-forest-labs/FLUX.1-schnell">Flux Schnell (rápido, $0.003)</option>
                      <option value="black-forest-labs/FLUX.1.1-pro">Flux 1.1 Pro (mejor calidad, $0.05)</option>
                    </>
                  ) : (
                    <>
                      <option value="black-forest-labs/flux-1.1-pro">Flux 1.1 Pro ($0.005)</option>
                      <option value="black-forest-labs/flux-schnell">Flux Schnell ($0.003)</option>
                    </>
                  )}
                </select>
              </div>
              <p className="text-[10px] text-gray-400">Las keys se guardan solo en este navegador.</p>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              subTab === t.key
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {subTab === "posts" && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Generador de Posts</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de post</Label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as PostType)}
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2 text-gray-900 dark:text-white"
                >
                  <option value="promo">Promocional</option>
                  <option value="testimonial">Testimonial</option>
                  <option value="tip">Tip / Consejo</option>
                  <option value="educational">Educativo</option>
                  <option value="announcement">Anuncio</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Red social</Label>
                <div className="flex gap-1">
                  {(["linkedin", "facebook", "instagram", "x"] as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`flex-1 flex items-center justify-center gap-1 h-9 rounded-md text-xs font-medium transition-colors ${
                        platform === p
                          ? `${PLATFORM_COLORS[p]} text-white`
                          : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-[10px] font-bold">{PLATFORM_LABELS[p]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tono</Label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2 text-gray-900 dark:text-white"
                >
                  <option value="profesional pero cercano">Profesional cercano</option>
                  <option value="informal y entusiasta">Informal</option>
                  <option value="formal y corporativo">Formal</option>
                  <option value="humorístico y creativo">Humorístico</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Idioma</Label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2 text-gray-900 dark:text-white"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Instrucciones adicionales (opcional)</Label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ej: Enfócate en la funcionalidad de dictado por voz..."
                className="w-full h-20 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm p-2 text-gray-900 dark:text-white resize-none placeholder:text-gray-400"
              />
            </div>

            <Button
              onClick={handleGeneratePost}
              disabled={postLoading}
              className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white"
            >
              {postLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generar post
            </Button>

            {generatedPost && (
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-full ${PLATFORM_COLORS[platform]} flex items-center justify-center text-white`}>
                        {PLATFORM_LABELS[platform]}
                      </div>
                      <span className="text-xs font-medium text-gray-500 capitalize">{platform}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{generatedPost.length} chars</Badge>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">{generatedPost}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPost);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleSaveAsset("post")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={handleGeneratePost}
                    disabled={postLoading}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Regenerar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {subTab === "images" && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Generador de Imágenes</h3>
              <Badge variant="secondary" className="text-[10px]">{keys.imageProvider === "together" ? "Together AI" : "Replicate"}</Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descripción de la imagen</Label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Ej: Banner con un radiólogo usando una tablet, colores modernos..."
                className="w-full h-24 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm p-2 text-gray-900 dark:text-white resize-none placeholder:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estilo</Label>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { key: "gradient", label: "Gradiente" },
                    { key: "minimal", label: "Minimal" },
                    { key: "medical", label: "Médico" },
                    { key: "tech", label: "Tech" },
                  ] as { key: ImageStyle; label: string }[]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setImageStyle(s.key)}
                      className={`h-8 rounded-md text-xs font-medium transition-colors ${
                        imageStyle === s.key
                          ? "bg-purple-500 text-white"
                          : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Formato</Label>
                <div className="flex gap-1">
                  {([
                    { key: "square", label: "1:1" },
                    { key: "landscape", label: "16:9" },
                    { key: "portrait", label: "9:16" },
                  ] as { key: Aspect; label: string }[]).map((a) => (
                    <button
                      key={a.key}
                      onClick={() => setAspect(a.key)}
                      className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                        aspect === a.key
                          ? "bg-purple-500 text-white"
                          : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerateImage}
              disabled={imageLoading || !imagePrompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              {imageLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              {imageLoading ? "Generando (~15s)..." : "Generar imagen"}
            </Button>

            {generatedImage && !generatedImage.startsWith("Error") && (
              <div className="space-y-3 pt-2">
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                  <img src={generatedImage} alt="Generated" className="w-full" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => downloadImage(generatedImage, `radiogenai-${Date.now()}`)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleSaveAsset("image")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            {generatedImage && generatedImage.startsWith("Error") && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{generatedImage}</p>
            )}
          </CardContent>
        </Card>
      )}

      {subTab === "brand" && <BrandKitSection />}

      {subTab === "library" && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Biblioteca</h3>
                <Badge variant="secondary" className="text-[10px]">{assets.length}</Badge>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadAssets}>
                Actualizar
              </Button>
            </div>

            {assetsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : assets.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No hay assets guardados. Genera posts o imágenes y guárdalos aquí.</p>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge className={`text-[10px] shrink-0 ${asset.type === "post" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                          {asset.type === "post" ? "Post" : "Imagen"}
                        </Badge>
                        {asset.platform && (
                          <span className="text-[10px] text-gray-500 capitalize">{asset.platform}</span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(asset.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {asset.type === "post" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => navigator.clipboard.writeText(asset.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {asset.type === "image" && asset.image_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => downloadImage(asset.image_url!, `radiogenai-${asset.id.slice(0, 8)}`)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {asset.type === "post" && asset.content && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-3 whitespace-pre-wrap">{asset.content}</p>
                    )}
                    {asset.type === "image" && asset.image_url && (
                      <img src={asset.image_url} alt={asset.title || ""} className="mt-2 rounded-md max-h-40 object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
