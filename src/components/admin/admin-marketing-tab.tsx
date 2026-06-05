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
  bg: "gradient" | "dark" | "white" | "transparent" | "purple";
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
  // ═══ Variantes moradas ═══
  // Profile — purple
  { id: "profile-purple", label: "Perfil (morado)", category: "Perfil", width: 400, height: 400, bg: "purple", logoVariant: "icon", description: "Perfil con gradiente morado" },
  { id: "profile-purple-tiktok", label: "Perfil TikTok (morado)", category: "Perfil", width: 200, height: 200, bg: "purple", logoVariant: "icon", description: "TikTok 200×200 morado" },
  // Logo — purple
  { id: "logo-purple-h", label: "Logo completo (morado)", category: "Logo", width: 1200, height: 400, bg: "purple", logoVariant: "full", description: "Logo horizontal gradiente morado" },
  { id: "logo-tagline-purple", label: "Logo + tagline (morado)", category: "Logo", width: 1200, height: 400, bg: "purple", logoVariant: "full", description: "Con eslogan — morado", tagline: TAGLINE_ES },
  { id: "logo-tagline-purple-en", label: "Logo + tagline EN (morado)", category: "Logo", width: 1200, height: 400, bg: "purple", logoVariant: "full", description: "English tagline — morado", tagline: TAGLINE_EN },
  // Banners — purple
  { id: "banner-x-purple", label: "Banner X (morado)", category: "Banners Redes", width: 1500, height: 500, bg: "purple", logoVariant: "full", description: "1500×500px morado", tagline: TAGLINE_ES },
  { id: "banner-fb-purple", label: "Banner Facebook (morado)", category: "Banners Redes", width: 820, height: 312, bg: "purple", logoVariant: "full", description: "820×312px morado", tagline: TAGLINE_ES },
  { id: "banner-linkedin-purple", label: "Banner LinkedIn (morado)", category: "Banners Redes", width: 1584, height: 396, bg: "purple", logoVariant: "full", description: "1584×396px morado", tagline: TAGLINE_ES },
  { id: "banner-yt-purple", label: "Banner YouTube (morado)", category: "Banners Redes", width: 2560, height: 1440, bg: "purple", logoVariant: "full", description: "2560×1440px morado", tagline: TAGLINE_ES },
  { id: "banner-tiktok-purple", label: "Banner TikTok (morado)", category: "Banners Redes", width: 1150, height: 150, bg: "purple", logoVariant: "full", description: "TikTok 1150×150 morado" },
  // Presentation — purple
  { id: "slide-cover-purple", label: "Slide portada (morado)", category: "Presentación", width: 1920, height: 1080, bg: "purple", logoVariant: "full", description: "16:9 portada — morado", tagline: TAGLINE_ES },
  { id: "slide-header-purple", label: "Slide cabecera (morado)", category: "Presentación", width: 1920, height: 200, bg: "purple", logoVariant: "full", description: "Strip superior — morado" },
  // Icons — purple
  { id: "icon-512-purple", label: "App Icon 512 (morado)", category: "Iconos", width: 512, height: 512, bg: "purple", logoVariant: "icon", description: "PWA / App Store 512×512 morado" },
  { id: "icon-192-purple", label: "App Icon 192 (morado)", category: "Iconos", width: 192, height: 192, bg: "purple", logoVariant: "icon", description: "PWA 192×192 morado" },
  { id: "icon-180-purple", label: "Apple Touch Icon (morado)", category: "Iconos", width: 180, height: 180, bg: "purple", logoVariant: "icon", description: "iOS home 180×180 morado" },
  { id: "favicon-purple", label: "Favicon (morado)", category: "Iconos", width: 32, height: 32, bg: "purple", logoVariant: "icon", description: "Favicon 32×32 morado" },
  { id: "whatsapp-icon-purple", label: "WhatsApp Business (morado)", category: "Iconos", width: 640, height: 640, bg: "purple", logoVariant: "icon", description: "WhatsApp perfil morado" },
  // ═══ Grids completos (purple theme) ═══
  { id: "pub-calc-all-sq", label: "Todas las calculadoras", category: "Pub. Calculadoras", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Grid completo calculadoras", tagline: "calc-all" },
  { id: "pub-calc-all-ln", label: "Todas las calculadoras (landscape)", category: "Pub. Calculadoras", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Grid completo calculadoras", tagline: "calc-all" },
  { id: "pub-guides-all-sq", label: "Todas las guías clínicas", category: "Pub. Recomendaciones", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Grid completo guías", tagline: "guides-all" },
  { id: "pub-guides-all-ln", label: "Todas las guías clínicas (landscape)", category: "Pub. Recomendaciones", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Grid completo guías", tagline: "guides-all" },
  // ═══ Carruseles (portada) ═══
  { id: "pub-carousel-tirads", label: "Carrusel — TI-RADS", category: "Pub. Carruseles", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG — Portada carrusel TI-RADS", tagline: "carousel-tirads" },
  { id: "pub-carousel-incidental", label: "Carrusel — Incidentales", category: "Pub. Carruseles", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG — Portada carrusel incidentales", tagline: "carousel-incidental" },
  // ═══ Infografías ═══
  { id: "pub-infographic-sq", label: "Infografía proceso", category: "Pub. Infografías", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Blueprint del proceso", tagline: "infographic-process" },
  { id: "pub-infographic-ln", label: "Infografía proceso (landscape)", category: "Pub. Infografías", width: 1200, height: 630, bg: "gradient", logoVariant: "full", description: "LinkedIn — Blueprint del proceso", tagline: "infographic-process" },
  { id: "pub-timecomp-sq", label: "Comparativa de tiempo", category: "Pub. Infografías", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Barras de tiempo", tagline: "time-comparison" },
  // ═══ ¿Sabías que? ═══
  { id: "pub-dyk-errors", label: "¿Sabías que? — Errores", category: "Pub. Sabías que", width: 1080, height: 1080, bg: "purple", logoVariant: "full", description: "IG/FB — Stat errores informes", tagline: "dyk-errors" },
  { id: "pub-dyk-time", label: "¿Sabías que? — Tiempo", category: "Pub. Sabías que", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Stat tiempo redacción", tagline: "dyk-time" },
  { id: "pub-dyk-incidental", label: "¿Sabías que? — Incidentales", category: "Pub. Sabías que", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Stat incidentales", tagline: "dyk-incidental" },
  // ═══ Testimonial + métrica ═══
  { id: "pub-testimetric-sq", label: "Testimonial + métrica", category: "Publicaciones", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Cita + número", tagline: "testimonial-metrics" },
  { id: "pub-testimetric-ln", label: "Testimonial + métrica (landscape)", category: "Publicaciones", width: 1200, height: 630, bg: "white", logoVariant: "full", description: "LinkedIn — Cita + número", tagline: "testimonial-metrics" },
  // ═══ Antes / Después informe ═══
  { id: "pub-beforeafter-sq", label: "Antes / Después informe", category: "Publicaciones", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Informe desestructurado vs estructurado", tagline: "before-after-report" },
  // ═══ Body map ═══
  { id: "pub-bodymap-sq", label: "Mapa corporal plantillas", category: "Pub. Templates", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Regiones anatómicas visual", tagline: "bodymap" },
  // ═══ ROI ═══
  { id: "pub-roi-sq", label: "ROI / Valor hora", category: "Publicaciones", width: 1080, height: 1080, bg: "purple", logoVariant: "full", description: "IG/FB — Cálculo ROI visual", tagline: "roi-pricing" },
  // ═══ Feature spotlights ═══
  { id: "pub-spot-voice", label: "Spotlight — Dictado voz", category: "Pub. Spotlights", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Dictado por voz", tagline: "spotlight-voice" },
  { id: "pub-spot-multilang", label: "Spotlight — Multiidioma", category: "Pub. Spotlights", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — 3 idiomas", tagline: "spotlight-multilang" },
  { id: "pub-spot-darkmode", label: "Spotlight — Modo oscuro", category: "Pub. Spotlights", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Dark mode", tagline: "spotlight-darkmode" },
  { id: "pub-spot-export", label: "Spotlight — Exportar PDF", category: "Pub. Spotlights", width: 1080, height: 1080, bg: "white", logoVariant: "full", description: "IG/FB — Export PDF", tagline: "spotlight-export" },
  { id: "pub-spot-teams", label: "Spotlight — Equipos", category: "Pub. Spotlights", width: 1080, height: 1080, bg: "purple", logoVariant: "full", description: "IG/FB — Colaboración equipos", tagline: "spotlight-teams" },
  // ═══ IA aprende frases ═══
  { id: "pub-normality-learn-sq", label: "IA aprende tus frases", category: "Pub. Templates", width: 1080, height: 1080, bg: "gradient", logoVariant: "full", description: "IG/FB — Aprendizaje visual", tagline: "normality-learn" },
  // ═══ Guías clínicas — resumen visual ═══
  { id: "pub-guide-fleischner-sq", label: "Fleischner 2017", category: "Pub. Guías Clínicas", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Nódulos pulmonares", tagline: "guide-fleischner" },
  { id: "pub-guide-fleischner-ln", label: "Fleischner 2017 (landscape)", category: "Pub. Guías Clínicas", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Nódulos pulmonares", tagline: "guide-fleischner" },
  { id: "pub-guide-adrenal-sq", label: "Adrenal ACR 2017", category: "Pub. Guías Clínicas", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Incidentaloma adrenal", tagline: "guide-adrenal" },
  { id: "pub-guide-bosniak-sq", label: "Bosniak 2019", category: "Pub. Guías Clínicas", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Quistes renales", tagline: "guide-bosniak" },
  { id: "pub-guide-lirads-sq", label: "LI-RADS v2018", category: "Pub. Guías Clínicas", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Lesiones hepáticas", tagline: "guide-lirads" },
  { id: "pub-guide-aorta-sq", label: "Aorta SVS 2018", category: "Pub. Guías Clínicas", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Aneurisma aórtico", tagline: "guide-aorta" },
  { id: "pub-guide-birads-sq", label: "BI-RADS 5ª ed.", category: "Pub. Guías Clínicas", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Lesiones mamarias", tagline: "guide-birads" },
  { id: "pub-guide-birads-ln", label: "BI-RADS 5ª ed. (landscape)", category: "Pub. Guías Clínicas", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Lesiones mamarias", tagline: "guide-birads" },
  // ═══ Casos clínicos con calculadora ═══
  { id: "pub-case-tirads-sq", label: "Caso TI-RADS", category: "Pub. Casos Clínicos", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Nódulo tiroideo", tagline: "case-tirads" },
  { id: "pub-case-tirads-ln", label: "Caso TI-RADS (landscape)", category: "Pub. Casos Clínicos", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Nódulo tiroideo", tagline: "case-tirads" },
  { id: "pub-case-pirads-sq", label: "Caso PI-RADS", category: "Pub. Casos Clínicos", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Lesión prostática", tagline: "case-pirads" },
  { id: "pub-case-bosniak-sq", label: "Caso Bosniak", category: "Pub. Casos Clínicos", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Quiste renal complejo", tagline: "case-bosniak" },
  { id: "pub-case-aspects-sq", label: "Caso ASPECTS", category: "Pub. Casos Clínicos", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Ictus ACM", tagline: "case-aspects" },
  { id: "pub-case-washout-sq", label: "Caso Washout Adrenal", category: "Pub. Casos Clínicos", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Adenoma adrenal", tagline: "case-washout" },
  { id: "pub-case-washout-ln", label: "Caso Washout (landscape)", category: "Pub. Casos Clínicos", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Adenoma adrenal", tagline: "case-washout" },
  { id: "pub-case-tnm-sq", label: "Caso TNM Pulmón", category: "Pub. Casos Clínicos", width: 1080, height: 1080, bg: "dark", logoVariant: "full", description: "IG/FB — Estadificación pulmonar", tagline: "case-tnm" },
  { id: "pub-case-tnm-ln", label: "Caso TNM Pulmón (landscape)", category: "Pub. Casos Clínicos", width: 1200, height: 630, bg: "dark", logoVariant: "full", description: "LinkedIn — Estadificación pulmonar", tagline: "case-tnm" },
];

function buildLogoSvg(
  w: number, h: number,
  variant: "full" | "icon",
  bg: "gradient" | "dark" | "white" | "transparent" | "purple",
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

  const isPurple = bg === "purple";
  const textDark = bg === "white" || bg === "transparent";
  const mainColor = textDark ? "#111827" : "#ffffff";
  const accentColor = isPurple ? "#c4b5fd" : textDark ? "#7c3aed" : "#c4b5fd";
  const subColor = textDark ? "#6b7280" : "rgba(255,255,255,0.6)";
  const dotColor = "#c4b5fd";

  let bgRect = "";
  if (bg === "gradient") {
    bgRect = `<defs><linearGradient id="bg-grad" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#4c1d95"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg-grad)"/>`;
  } else if (bg === "purple") {
    bgRect = `<defs><linearGradient id="bg-grad" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg-grad)"/>`;
  } else if (bg === "dark") {
    bgRect = `<rect width="${w}" height="${h}" fill="#0f172a"/>`;
  } else if (bg === "white") {
    bgRect = `<rect width="${w}" height="${h}" fill="#ffffff"/>`;
  }

  const iconGradStops = isPurple
    ? `<stop offset="0%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#7c3aed"/>`
    : `<stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#7c3aed"/>`;

  const iconSvg = `<g transform="translate(${iconX},${iconY}) scale(${scale})">
    <rect width="32" height="32" rx="7" fill="url(#icon-grad)"/>
    <path d="M10 8h7a5 5 0 0 1 0 10h-3l5 6" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="2.2" fill="${dotColor}"/>
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
    <defs><linearGradient id="icon-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">${iconGradStops}</linearGradient></defs>
    ${bgRect}
    ${iconSvg}
    ${textSvg}
  </svg>`;
}

function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPublicationSvg(w: number, h: number, bg: "gradient" | "dark" | "white" | "transparent" | "purple", contentType: string): string {
  const isDark = bg === "gradient" || bg === "dark" || bg === "purple";
  const mainColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.55)" : "#6b7280";
  const accentColor = "#c4b5fd";
  const brandTeal = "#7c3aed";
  const brandNavy = "#1e1b4b";
  const scale = w / 1080;
  const fs = (n: number) => Math.round(n * scale);
  const px = fs(60);

  const topSafe = fs(110);
  const botSafe = h - fs(75);
  const safeH = botSafe - topSafe;
  const centerBlock = (blockH: number) => topSafe + Math.max(0, Math.round((safeH - blockH) / 2));

  let bgSvg = "";
  if (bg === "gradient") {
    bgSvg = `<defs><linearGradient id="bg-g" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="60%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg-g)"/>`;
  } else if (bg === "purple") {
    bgSvg = `<defs><linearGradient id="bg-g" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg-g)"/>`;
  } else if (bg === "dark") {
    bgSvg = `<rect width="${w}" height="${h}" fill="#0f172a"/>`;
  } else if (bg === "white") {
    bgSvg = `<rect width="${w}" height="${h}" fill="#ffffff"/>`;
  }

  const ta = isDark ? "rgba(196,181,253," : "rgba(124,58,237,";
  const decor = `
    <circle cx="${w * 0.87}" cy="${h * 0.08}" r="${fs(220)}" fill="${ta}0.05)"/>
    <circle cx="${w * 0.05}" cy="${h * 0.93}" r="${fs(160)}" fill="${ta}0.04)"/>
    <circle cx="${w * 0.5}" cy="${h * 0.52}" r="${fs(360)}" fill="${ta}0.015)"/>
    <rect x="${w - fs(5)}" y="${h * 0.25}" width="${fs(5)}" height="${h * 0.12}" rx="${fs(2.5)}" fill="${ta}0.1)"/>
    <rect x="0" y="${h * 0.6}" width="${fs(5)}" height="${h * 0.1}" rx="${fs(2.5)}" fill="${ta}0.08)"/>
    <line x1="${px}" y1="${botSafe + fs(8)}" x2="${w * 0.28}" y2="${botSafe + fs(8)}" stroke="${ta}0.12)" stroke-width="1"/>
  `;

  const logoY = h - fs(40);
  const logoSmall = `<g transform="translate(${px},${logoY - fs(10)}) scale(${scale * 0.5})"><rect width="20" height="20" rx="4" fill="${brandTeal}"/><path d="M6 5h4.5a2.8 2.8 0 0 1 0 5.6h-1.8l2.8 3.8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${px + fs(16)}" y="${logoY}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${mainColor}"><tspan>Radiogen</tspan><tspan fill="${accentColor}">.ai</tspan></text>`;

  let content = "";

  if (contentType === "feature") {
    const y0 = centerBlock(fs(320));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(56)}" height="${fs(56)}" rx="${fs(14)}" fill="${ta}0.15)"/>
      <path transform="translate(${px + fs(14)},${y0 + fs(14)}) scale(${scale * 0.9})" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="${px}" y="${y0 + fs(96)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(48)}" fill="${mainColor}" letter-spacing="-0.02em">Dicta. La IA estructura.</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(48)}" fill="${accentColor}" letter-spacing="-0.02em">Tú revisas y firmas.</text>
      <line x1="${px}" y1="${y0 + fs(172)}" x2="${px + fs(60)}" y2="${y0 + fs(172)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(210)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Dictado por voz en cualquier idioma → informe estructurado</text>
      <text x="${px}" y="${y0 + fs(244)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">con hallazgos por sección, mediciones y conclusión automática.</text>
      <rect x="${px}" y="${y0 + fs(275)}" width="${fs(230)}" height="${fs(46)}" rx="${fs(23)}" fill="${brandTeal}"/>
      <text x="${px + fs(48)}" y="${y0 + fs(305)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="white">Probar gratis →</text>`;
  } else if (contentType === "stats") {
    const y0 = centerBlock(fs(270));
    const colW = (w - px * 2 - fs(40)) / 3;
    const stats = [
      { num: "90%", label: "Menos tiempo\nde redacción" },
      { num: "190+", label: "Plantillas\nespecializadas" },
      { num: "3", label: "Idiomas\nsoportados" },
    ];
    content = `
      <text x="${px}" y="${y0}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Informes radiológicos</text>
      <text x="${px}" y="${y0 + fs(48)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${accentColor}">más rápidos que nunca</text>
      <line x1="${px}" y1="${y0 + fs(74)}" x2="${px + fs(80)}" y2="${y0 + fs(74)}" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
      ${stats.map((s, i) => `
        <text x="${px + i * colW}" y="${y0 + fs(135)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(62)}" fill="${accentColor}">${s.num}</text>
        <text x="${px + i * colW}" y="${y0 + fs(176)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(19)}" fill="${subColor}">${escSvg(s.label.split('\n')[0])}</text>
        <text x="${px + i * colW}" y="${y0 + fs(200)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(19)}" fill="${subColor}">${escSvg(s.label.split('\n')[1] || '')}</text>
      `).join("")}
      <text x="${px}" y="${y0 + fs(258)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Usado por radiólogos en hospitales de España, Latinoamérica y EE.UU.</text>`;
  } else if (contentType === "quote") {
    const y0 = centerBlock(fs(290));
    content = `
      <text x="${px}" y="${y0 + fs(10)}" font-family="Georgia,serif" font-size="${fs(100)}" fill="${brandTeal}" opacity="0.25">"</text>
      <text x="${px}" y="${y0 + fs(80)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(30)}" fill="${mainColor}">Pasé de 15 minutos por informe</text>
      <text x="${px}" y="${y0 + fs(122)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(30)}" fill="${mainColor}">a menos de 3. La IA estructura mis</text>
      <text x="${px}" y="${y0 + fs(164)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(30)}" fill="${mainColor}">hallazgos y yo solo reviso y firmo.</text>
      <line x1="${px}" y1="${y0 + fs(196)}" x2="${px + fs(90)}" y2="${y0 + fs(196)}" stroke="${brandTeal}" stroke-width="3" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(230)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(22)}" fill="${mainColor}">Dra. María López</text>
      <text x="${px}" y="${y0 + fs(260)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(18)}" fill="${subColor}">Radióloga — Hospital Universitario</text>
      <text x="${px}" y="${y0 + fs(288)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(15)}" fill="${ta}0.35)">*Testimonio representativo basado en métricas de uso.</text>`;
  } else if (contentType === "tip") {
    const y0 = centerBlock(fs(290));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(120)}" height="${fs(34)}" rx="${fs(17)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(23)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">💡 TIP</text>
      <text x="${px}" y="${y0 + fs(78)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">¿Sabías que la IA</text>
      <text x="${px}" y="${y0 + fs(128)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">aprende tus frases</text>
      <text x="${px}" y="${y0 + fs(178)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">de normalidad?</text>
      <line x1="${px}" y1="${y0 + fs(202)}" x2="${px + fs(60)}" y2="${y0 + fs(202)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(240)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(23)}" fill="${subColor}">Cada vez que corriges un informe, el sistema memoriza</text>
      <text x="${px}" y="${y0 + fs(272)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(23)}" fill="${subColor}">tu estilo. En el siguiente estudio, lo aplica solo.</text>`;
  } else if (contentType === "launch") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(105)}" height="${fs(34)}" rx="${fs(17)}" fill="${accentColor}"/>
      <text x="${px + fs(18)}" y="${y0 + fs(23)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${brandNavy}">NUEVO</text>
      <text x="${px}" y="${y0 + fs(82)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(50)}" fill="${mainColor}">Plantillas RECIST 1.1</text>
      <text x="${px}" y="${y0 + fs(138)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(50)}" fill="${accentColor}">ya disponibles</text>
      <line x1="${px}" y1="${y0 + fs(162)}" x2="${px + fs(60)}" y2="${y0 + fs(162)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(200)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">Seguimiento oncológico automatizado: mediciones diana,</text>
      <text x="${px}" y="${y0 + fs(234)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}">respuesta tumoral según criterios RECIST y tablas evolutivas.</text>
      <rect x="${px}" y="${y0 + fs(275)}" width="${fs(260)}" height="${fs(48)}" rx="${fs(24)}" fill="${brandTeal}"/>
      <text x="${px + fs(48)}" y="${y0 + fs(306)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(19)}" fill="white">Descúbrelo ahora →</text>`;
  } else if (contentType === "comparison") {
    const y0 = centerBlock(fs(280));
    const colMid = w / 2;
    content = `
      <line x1="${colMid}" y1="${y0}" x2="${colMid}" y2="${y0 + fs(240)}" stroke="${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="${px}" y="${y0}" width="${fs(110)}" height="${fs(32)}" rx="${fs(16)}" fill="rgba(239,68,68,0.12)"/>
      <text x="${px + fs(20)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#ef4444">ANTES</text>
      <rect x="${colMid + fs(20)}" y="${y0}" width="${fs(150)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${colMid + fs(34)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${brandTeal}">CON RADIOGEN</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(28)}" fill="${isDark ? '#f87171' : '#dc2626'}">15 min / informe</text>
      <text x="${px}" y="${y0 + fs(108)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Redacción manual</text>
      <text x="${px}" y="${y0 + fs(138)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Copy-paste de plantillas</text>
      <text x="${px}" y="${y0 + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Conclusiones repetitivas</text>
      <text x="${px}" y="${y0 + fs(198)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Sin recomendaciones</text>
      <text x="${colMid + fs(20)}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(28)}" fill="${accentColor}">2 min / informe</text>
      <text x="${colMid + fs(20)}" y="${y0 + fs(108)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Dictado por voz + IA</text>
      <text x="${colMid + fs(20)}" y="${y0 + fs(138)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Estructura automática</text>
      <text x="${colMid + fs(20)}" y="${y0 + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Conclusiones inteligentes</text>
      <text x="${colMid + fs(20)}" y="${y0 + fs(198)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Recomendaciones integradas</text>
      <text x="${w / 2}" y="${y0 + fs(260)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(17)}" fill="${ta}0.35)" text-anchor="middle">Basado en métricas reales de uso de Radiogen.ai</text>`;
  } else if (contentType === "workflow") {
    const y0 = centerBlock(fs(290));
    const steps = [
      { emoji: "🎙️", label: "Dicta", desc: "En tu idioma" },
      { emoji: "🤖", label: "IA estructura", desc: "Hallazgos + conclusión" },
      { emoji: "✏️", label: "Revisa", desc: "Ajusta a tu gusto" },
      { emoji: "📋", label: "Firma", desc: "Informe listo" },
    ];
    const stepW = (w - px * 2 - fs(30)) / 4;
    const boxH = fs(100);
    content = `
      <text x="${px}" y="${y0}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">De la voz al informe</text>
      <text x="${px}" y="${y0 + fs(50)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">en 4 pasos</text>
      <line x1="${px}" y1="${y0 + fs(74)}" x2="${px + fs(60)}" y2="${y0 + fs(74)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      ${steps.map((s, i) => {
        const sx = px + i * stepW;
        const sy = y0 + fs(100);
        return `
          <rect x="${sx}" y="${sy}" width="${stepW - fs(10)}" height="${boxH}" rx="${fs(12)}" fill="${ta}0.07)" stroke="${ta}0.18)" stroke-width="1"/>
          <text x="${sx + (stepW - fs(10)) / 2}" y="${sy + fs(32)}" font-family="system-ui,sans-serif" font-size="${fs(24)}" text-anchor="middle">${s.emoji}</text>
          <text x="${sx + (stepW - fs(10)) / 2}" y="${sy + fs(58)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(15)}" fill="${mainColor}" text-anchor="middle">${escSvg(s.label)}</text>
          <text x="${sx + (stepW - fs(10)) / 2}" y="${sy + fs(78)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}" text-anchor="middle">${escSvg(s.desc)}</text>
        `;
      }).join("")}
      <text x="${px}" y="${y0 + fs(248)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Sin instalar nada. 100% en tu navegador. Desde cualquier dispositivo.</text>`;
  } else if (contentType === "cta") {
    const y0 = centerBlock(fs(280));
    content = `
      <text x="${w / 2}" y="${y0}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(54)}" fill="${mainColor}" text-anchor="middle">Empieza hoy.</text>
      <text x="${w / 2}" y="${y0 + fs(62)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(54)}" fill="${accentColor}" text-anchor="middle">Es gratis.</text>
      <line x1="${w / 2 - fs(40)}" y1="${y0 + fs(88)}" x2="${w / 2 + fs(40)}" y2="${y0 + fs(88)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${w / 2}" y="${y0 + fs(128)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}" text-anchor="middle">Informes radiológicos estructurados con IA en menos de 2 minutos.</text>
      <text x="${w / 2}" y="${y0 + fs(162)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(24)}" fill="${subColor}" text-anchor="middle">Sin tarjeta de crédito. Sin instalación. Sin compromiso.</text>
      <rect x="${w / 2 - fs(150)}" y="${y0 + fs(200)}" width="${fs(300)}" height="${fs(52)}" rx="${fs(26)}" fill="${brandTeal}"/>
      <text x="${w / 2}" y="${y0 + fs(233)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(20)}" fill="white" text-anchor="middle">Crear cuenta gratis →</text>`;
  } else if (contentType === "tpl-overview") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(175)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 PLANTILLAS</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${mainColor}">+190 plantillas listas</text>
      <text x="${px}" y="${y0 + fs(128)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(46)}" fill="${accentColor}">para dictar y firmar</text>
      <line x1="${px}" y1="${y0 + fs(152)}" x2="${px + fs(60)}" y2="${y0 + fs(152)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(190)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">TC · RM · Ecografía · Rx · Mamografía · Intervencionismo · RECIST 1.1</text>
      <text x="${px}" y="${y0 + fs(222)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Cada plantilla incluye secciones anatómicas predefinidas,</text>
      <text x="${px}" y="${y0 + fs(252)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">campos de hallazgos y generación automática de conclusión.</text>
      <rect x="${px}" y="${y0 + fs(282)}" width="${w - px * 2}" height="${fs(48)}" rx="${fs(10)}" fill="${ta}0.06)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(312)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${mainColor}">Tórax · Abdomen · Cabeza y cuello · Columna · Extremidades</text>`;
  } else if (contentType === "tpl-custom") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(250)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">✏️ PERSONALIZACIÓN</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Tu plantilla, tu estilo,</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">tus secciones</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(186)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Crea plantillas con tus propias secciones anatómicas.</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Añade, elimina o renombra campos según tu flujo de trabajo.</text>
      <text x="${px}" y="${y0 + fs(256)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Para equipos: el jefe de sección comparte plantillas</text>
      <text x="${px}" y="${y0 + fs(286)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">estandarizadas con todo el departamento.</text>
      <text x="${px}" y="${y0 + fs(330)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Cada radiólogo adapta sin perder el estándar.</text>`;
  } else if (contentType === "tpl-regions") {
    const regions = [
      { icon: "🧠", name: "Cabeza y cuello", count: "32" },
      { icon: "🫁", name: "Tórax", count: "45" },
      { icon: "🫄", name: "Abdomen y pelvis", count: "52" },
      { icon: "🦴", name: "Columna", count: "18" },
      { icon: "💪", name: "Extremidades sup.", count: "22" },
      { icon: "🦵", name: "Extremidades inf.", count: "21" },
    ];
    const rowH = fs(48);
    const listH = regions.length * rowH;
    const y0 = centerBlock(fs(90) + listH);
    content = `
      <text x="${px}" y="${y0}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(38)}" fill="${mainColor}">Plantillas por región</text>
      <text x="${px}" y="${y0 + fs(44)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(38)}" fill="${accentColor}">anatómica</text>
      <line x1="${px}" y1="${y0 + fs(66)}" x2="${px + fs(60)}" y2="${y0 + fs(66)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      ${regions.map((r, i) => `
        <rect x="${px}" y="${y0 + fs(84) + i * rowH}" width="${w - px * 2}" height="${rowH - fs(5)}" rx="${fs(8)}" fill="${ta}0.05)" stroke="${ta}0.08)" stroke-width="1"/>
        <text x="${px + fs(14)}" y="${y0 + fs(84) + i * rowH + rowH * 0.62}" font-family="system-ui,sans-serif" font-size="${fs(18)}">${r.icon}</text>
        <text x="${px + fs(46)}" y="${y0 + fs(84) + i * rowH + rowH * 0.62}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${mainColor}">${escSvg(r.name)}</text>
        <text x="${w - px - fs(14)}" y="${y0 + fs(84) + i * rowH + rowH * 0.62}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(15)}" fill="${accentColor}" text-anchor="end">${r.count} plantillas</text>
      `).join("")}`;
  } else if (contentType === "tpl-normality") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(265)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧠 APRENDIZAJE ADAPTATIVO</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">La IA aprende cómo</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">redactas tú</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(188)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Cada vez que corriges un informe, el sistema memoriza</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">tus frases de normalidad, tu vocabulario y tu nivel de detalle.</text>
      <text x="${px}" y="${y0 + fs(256)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">En el siguiente estudio, las aplica automáticamente.</text>
      <text x="${px}" y="${y0 + fs(286)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Tu estilo personal en cada informe, sin esfuerzo.</text>
      <text x="${px}" y="${y0 + fs(330)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Cuanto más usas Radiogen.ai, mejor te conoce.</text>`;
  } else if (contentType === "rec-overview") {
    const y0 = centerBlock(fs(360));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(260)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🔔 RECOMENDACIONES</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Ningún hallazgo</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">sin seguimiento</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(188)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Biblioteca de recomendaciones basadas en evidencia</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">para cada hallazgo incidental. Filtradas por modalidad,</text>
      <text x="${px}" y="${y0 + fs(248)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">región anatómica y categoría clínica.</text>
      <rect x="${px}" y="${y0 + fs(278)}" width="${w - px * 2}" height="${fs(74)}" rx="${fs(10)}" fill="${ta}0.06)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(306)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${mainColor}">• Nódulo pulmonar → seguimiento Fleischner</text>
      <text x="${px + fs(16)}" y="${y0 + fs(332)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${mainColor}">• Lesión adrenal → washout  •  Quiste ovárico → guía ACR</text>`;
  } else if (contentType === "rec-evidence") {
    const y0 = centerBlock(fs(360));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(310)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📚 BASADAS EN EVIDENCIA</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Guías ACR, Fleischner</text>
      <text x="${px}" y="${y0 + fs(124)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">y sociedades de referencia</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(186)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Cada recomendación incluye la fuente y el nivel de evidencia.</text>
      <text x="${px}" y="${y0 + fs(216)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Actualizadas según las últimas guías publicadas.</text>
      <rect x="${px}" y="${y0 + fs(246)}" width="${w - px * 2}" height="${fs(100)}" rx="${fs(10)}" fill="${ta}0.06)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(274)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${mainColor}">• Nódulos pulmonares, tiroideos, adrenales y hepáticos</text>
      <text x="${px + fs(16)}" y="${y0 + fs(300)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${mainColor}">• Quistes renales, ováricos y pancreáticos</text>
      <text x="${px + fs(16)}" y="${y0 + fs(326)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${mainColor}">• Dilataciones vasculares y aneurismas incidentales</text>`;
  } else if (contentType === "rec-hospital") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(280)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🏥 PROTOCOLOS DE EQUIPO</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Estandariza tu</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">departamento</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(188)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">El jefe de sección crea recomendaciones del hospital</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">que aparecen automáticamente a todo el equipo.</text>
      <text x="${px}" y="${y0 + fs(256)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Criterios de seguimiento unificados. Ningún hallazgo</text>
      <text x="${px}" y="${y0 + fs(286)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">incidental queda sin protocolo de manejo.</text>
      <text x="${px}" y="${y0 + fs(330)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Seguridad clínica + consistencia entre radiólogos.</text>`;
  } else if (contentType === "calc-overview") {
    const y0 = centerBlock(fs(370));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(240)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🔢 CALCULADORAS</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">7 calculadoras dentro</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">de tu informe</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(188)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Clasifica hallazgos sin salir de la app. Calcula, copia</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">el resultado y pégalo en el informe con un solo clic.</text>
      <rect x="${px}" y="${y0 + fs(248)}" width="${w - px * 2}" height="${fs(52)}" rx="${fs(10)}" fill="${ta}0.06)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(281)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(17)}" fill="${mainColor}">TI-RADS · PI-RADS · Bosniak · ASPECTS · Vol. prostático · PSA · Adrenal</text>
      <text x="${px}" y="${y0 + fs(330)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Cada calculadora genera texto descriptivo listo para pegar</text>
      <text x="${px}" y="${y0 + fs(360)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">en los hallazgos o la conclusión. Sin apps externas.</text>`;
  } else if (contentType === "calc-tirads") {
    const y0 = centerBlock(fs(360));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(155)}" height="${fs(32)}" rx="${fs(16)}" fill="${accentColor}"/>
      <text x="${px + fs(18)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${brandNavy}">ACR TI-RADS</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Clasificación tiroidea</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">automatizada</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(186)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Selecciona composición, ecogenicidad, forma, márgenes</text>
      <text x="${px}" y="${y0 + fs(216)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">y focos ecogénicos. El sistema calcula puntos y categoría.</text>
      <rect x="${px}" y="${y0 + fs(246)}" width="${w - px * 2}" height="${fs(72)}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(274)}" font-family="system-ui,sans-serif" font-style="italic" font-size="${fs(17)}" fill="${subColor}">"Nódulo tiroideo ACR TI-RADS 4 (6 pts).</text>
      <text x="${px + fs(16)}" y="${y0 + fs(300)}" font-family="system-ui,sans-serif" font-style="italic" font-size="${fs(17)}" fill="${subColor}">Se recomienda PAAF si ≥ 15 mm."</text>
      <text x="${px}" y="${y0 + fs(350)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Texto copiable al informe en un clic.</text>`;
  } else if (contentType === "calc-pirads") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(165)}" height="${fs(32)}" rx="${fs(16)}" fill="${accentColor}"/>
      <text x="${px + fs(18)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${brandNavy}">PI-RADS v2.1</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Evaluación prostática</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">estandarizada</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(186)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Zona periférica o transicional, señal T2, difusión y realce.</text>
      <text x="${px}" y="${y0 + fs(216)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Incluye volumen prostático y densidad de PSA integrados.</text>
      <text x="${px}" y="${y0 + fs(254)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">Resultado: PI-RADS 1 a 5 con texto descriptivo listo</text>
      <text x="${px}" y="${y0 + fs(284)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">para copiar directamente a hallazgos o conclusión.</text>
      <text x="${px}" y="${y0 + fs(330)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Todo en una herramienta, sin salir del informe.</text>`;
  } else if (contentType === "calc-bosniak") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(185)}" height="${fs(32)}" rx="${fs(16)}" fill="${accentColor}"/>
      <text x="${px + fs(18)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${brandNavy}">BOSNIAK 2019</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Quistes renales</text>
      <text x="${px}" y="${y0 + fs(126)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">clasificados al instante</text>
      <line x1="${px}" y1="${y0 + fs(150)}" x2="${px + fs(60)}" y2="${y0 + fs(150)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(186)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Evalúa tabiques, paredes, realce y componente sólido</text>
      <text x="${px}" y="${y0 + fs(216)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">según Bosniak 2019 (I, II, IIF, III, IV).</text>
      <text x="${px}" y="${y0 + fs(254)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">El resultado se copia directamente a tus hallazgos</text>
      <text x="${px}" y="${y0 + fs(284)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(22)}" fill="${mainColor}">como texto descriptivo. Sin tablas ni apps externas.</text>
      <text x="${px}" y="${y0 + fs(330)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Clasificación + texto descriptivo en un clic.</text>`;
  } else if (contentType === "calc-copy") {
    const y0 = centerBlock(fs(350));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(200)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 UN CLIC</text>
      <text x="${px}" y="${y0 + fs(80)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(48)}" fill="${mainColor}">Calcula. Copia.</text>
      <text x="${px}" y="${y0 + fs(134)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(48)}" fill="${accentColor}">Pega en tu informe.</text>
      <line x1="${px}" y1="${y0 + fs(160)}" x2="${px + fs(60)}" y2="${y0 + fs(160)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(198)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Cada calculadora genera un párrafo listo para pegar</text>
      <text x="${px}" y="${y0 + fs(228)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">en tus hallazgos. Sin escribir ni reformatear nada.</text>
      <rect x="${px}" y="${y0 + fs(258)}" width="${w - px * 2}" height="${fs(50)}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(290)}" font-family="system-ui,sans-serif" font-style="italic" font-size="${fs(16)}" fill="${subColor}">"Vol. prostático: 45 cc (4.2×3.8×3.5 cm). Densidad PSA: 0.18 ng/ml/cc."</text>
      <text x="${px}" y="${y0 + fs(340)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Texto profesional, listo en segundos.</text>`;
  } else if (contentType === "calc-all") {
    const calcs = [
      { icon: "🦋", name: "ACR TI-RADS", desc: "Nódulos tiroideos" },
      { icon: "♂", name: "PI-RADS v2.1", desc: "Lesiones prostáticas" },
      { icon: "💧", name: "Bosniak 2019", desc: "Quistes renales" },
      { icon: "🧠", name: "ASPECTS", desc: "Ictus isquémico" },
      { icon: "⚗️", name: "Adrenal Washout", desc: "Adenoma vs metástasis" },
      { icon: "📐", name: "Vol. prostático", desc: "Volumen + densidad PSA" },
      { icon: "🫁", name: "Lung TNM 9th", desc: "Estadificación pulmonar" },
      { icon: "🗣️", name: "Laryngeal TNM", desc: "Estadificación laríngea" },
      { icon: "⏱️", name: "Doubling Time", desc: "Tiempo duplicación nódulo" },
      { icon: "❤️", name: "T1/T2 Mapping", desc: "Valores cardíacos RM" },
      { icon: "💪", name: "Shoulder Track", desc: "Inestabilidad glenohumeral" },
      { icon: "🔬", name: "Renal Multiphase", desc: "Lesión renal TC multifásica" },
      { icon: "📊", name: "Resistive Index", desc: "Ecografía renal Doppler" },
      { icon: "🌡️", name: "Thyroid Volume", desc: "Volumen tiroideo ecográfico" },
      { icon: "🧪", name: "CT Perfusion", desc: "Análisis perfusión cerebral" },
    ];
    const cols = 3;
    const rows = Math.ceil(calcs.length / cols);
    const gapX = fs(10);
    const gapY = fs(10);
    const gridW = w - px * 2;
    const cellW = (gridW - (cols - 1) * gapX) / cols;
    const titleH = fs(130);
    const footerH = fs(60);
    const gridH = safeH - titleH - footerH;
    const cellH = (gridH - (rows - 1) * gapY) / rows;
    const y0 = topSafe;
    const vt = "rgba(167,139,250,";
    content = `
      <defs><linearGradient id="p-bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#581c87"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#p-bg)"/>
      <circle cx="${w * 0.9}" cy="${h * 0.06}" r="${fs(200)}" fill="${vt}0.06)"/>
      <circle cx="${w * 0.04}" cy="${h * 0.95}" r="${fs(150)}" fill="${vt}0.05)"/>
      <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${fs(380)}" fill="${vt}0.015)"/>
      <rect x="${w - fs(5)}" y="${h * 0.3}" width="${fs(5)}" height="${h * 0.1}" rx="${fs(2.5)}" fill="${vt}0.12)"/>
      <rect x="0" y="${h * 0.55}" width="${fs(5)}" height="${h * 0.08}" rx="${fs(2.5)}" fill="${vt}0.08)"/>
      <rect x="${px}" y="${y0}" width="${fs(240)}" height="${fs(32)}" rx="${fs(16)}" fill="${vt}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#c4b5fd">🔢 CALCULADORAS</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="#ffffff">Todas las calculadoras</text>
      <text x="${px}" y="${y0 + fs(118)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="#c4b5fd">en tu informe</text>
      ${calcs.map((c, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = px + col * (cellW + gapX);
        const cy2 = y0 + titleH + row * (cellH + gapY);
        return `
          <rect x="${cx}" y="${cy2}" width="${cellW}" height="${cellH}" rx="${fs(10)}" fill="${vt}0.07)" stroke="${vt}0.16)" stroke-width="1"/>
          <text x="${cx + fs(12)}" y="${cy2 + cellH * 0.38}" font-family="system-ui,sans-serif" font-size="${fs(18)}">${c.icon}</text>
          <text x="${cx + fs(36)}" y="${cy2 + cellH * 0.38}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(15)}" fill="#ffffff">${escSvg(c.name)}</text>
          <text x="${cx + fs(12)}" y="${cy2 + cellH * 0.72}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="rgba(255,255,255,0.5)">${escSvg(c.desc)}</text>
        `;
      }).join("")}
      <text x="${px}" y="${botSafe - fs(8)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="rgba(255,255,255,0.45)">+ 48 fichas de referencia: Fleischner, LI-RADS, O-RADS, Lung-RADS, BI-RADS y más</text>
      <g transform="translate(${px},${h - fs(40) - fs(10)}) scale(${scale * 0.5})"><rect width="20" height="20" rx="4" fill="#7c3aed"/><path d="M6 5h4.5a2.8 2.8 0 0 1 0 5.6h-1.8l2.8 3.8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${px + fs(16)}" y="${h - fs(40)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#ffffff"><tspan>Radiogen</tspan><tspan fill="#c4b5fd">.ai</tspan></text>`;
  } else if (contentType === "guides-all") {
    const guides = [
      { src: "Fleischner 2017", topic: "Nódulos pulmonares solitarios" },
      { src: "BTS 2015", topic: "Nódulos pulmonares — volumetría" },
      { src: "ACR TI-RADS 2017", topic: "Nódulos tiroideos incidentales" },
      { src: "ACR Incidental 2017", topic: "Hallazgos hepáticos y adrenales" },
      { src: "LI-RADS v2018", topic: "Observaciones hepáticas en riesgo" },
      { src: "Bosniak 2019", topic: "Quistes renales complejos" },
      { src: "ACR/AGA 2015", topic: "Quistes pancreáticos incidentales" },
      { src: "ACR/SRU 2019", topic: "Hallazgos ováricos incidentales" },
      { src: "ESGAR/EAES 2017", topic: "Pólipos vesiculares" },
      { src: "EANO 2016", topic: "Meningiomas incidentales" },
      { src: "AHA/ASA 2015", topic: "Aneurismas cerebrales" },
      { src: "SVS 2018", topic: "Aneurismas aórticos" },
      { src: "ACR Appropriateness", topic: "Lesiones óseas y fracturas" },
      { src: "ACR Adrenal 2017", topic: "Nódulos adrenales incidentales" },
    ];
    const cols = 2;
    const rows = Math.ceil(guides.length / cols);
    const gapX = fs(10);
    const gapY = fs(8);
    const gridW = w - px * 2;
    const cellW = (gridW - (cols - 1) * gapX) / cols;
    const titleH = fs(130);
    const footerH = fs(40);
    const gridH = safeH - titleH - footerH;
    const cellH = (gridH - (rows - 1) * gapY) / rows;
    const y0 = topSafe;
    const vt = "rgba(167,139,250,";
    content = `
      <defs><linearGradient id="p-bg2" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="45%" stop-color="#3b0764"/><stop offset="100%" stop-color="#701a75"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#p-bg2)"/>
      <circle cx="${w * 0.88}" cy="${h * 0.07}" r="${fs(210)}" fill="rgba(232,121,249,0.05)"/>
      <circle cx="${w * 0.06}" cy="${h * 0.94}" r="${fs(140)}" fill="${vt}0.05)"/>
      <circle cx="${w * 0.45}" cy="${h * 0.48}" r="${fs(360)}" fill="rgba(232,121,249,0.012)"/>
      <rect x="${w - fs(5)}" y="${h * 0.22}" width="${fs(5)}" height="${h * 0.12}" rx="${fs(2.5)}" fill="rgba(232,121,249,0.12)"/>
      <rect x="0" y="${h * 0.62}" width="${fs(5)}" height="${h * 0.09}" rx="${fs(2.5)}" fill="${vt}0.1)"/>
      <rect x="${px}" y="${y0}" width="${fs(310)}" height="${fs(32)}" rx="${fs(16)}" fill="rgba(232,121,249,0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#f0abfc">📚 GUÍAS CLÍNICAS</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="#ffffff">14 guías basadas</text>
      <text x="${px}" y="${y0 + fs(118)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="#f0abfc">en evidencia integradas</text>
      ${guides.map((g, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const gx = px + col * (cellW + gapX);
        const gy = y0 + titleH + row * (cellH + gapY);
        return `
          <rect x="${gx}" y="${gy}" width="${cellW}" height="${cellH}" rx="${fs(10)}" fill="rgba(232,121,249,0.06)" stroke="rgba(232,121,249,0.14)" stroke-width="1"/>
          <text x="${gx + fs(12)}" y="${gy + cellH * 0.42}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(15)}" fill="#ffffff">${escSvg(g.src)}</text>
          <text x="${gx + fs(12)}" y="${gy + cellH * 0.76}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="rgba(255,255,255,0.5)">${escSvg(g.topic)}</text>
        `;
      }).join("")}
      <text x="${px}" y="${botSafe - fs(4)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="rgba(255,255,255,0.4)">Cada recomendación incluye fuente, nivel de evidencia y texto copiable</text>
      <g transform="translate(${px},${h - fs(40) - fs(10)}) scale(${scale * 0.5})"><rect width="20" height="20" rx="4" fill="#9333ea"/><path d="M6 5h4.5a2.8 2.8 0 0 1 0 5.6h-1.8l2.8 3.8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${px + fs(16)}" y="${h - fs(40)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#ffffff"><tspan>Radiogen</tspan><tspan fill="#f0abfc">.ai</tspan></text>`;
  } else if (contentType === "carousel-tirads") {
    const y0 = centerBlock(fs(400));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(200)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📚 CARRUSEL EDUCATIVO</text>
      <text x="${px}" y="${y0 + fs(90)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(52)}" fill="${mainColor}">ACR TI-RADS</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">Clasifica un nódulo</text>
      <text x="${px}" y="${y0 + fs(198)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">tiroideo en 60 segundos</text>
      <line x1="${px}" y1="${y0 + fs(224)}" x2="${px + fs(60)}" y2="${y0 + fs(224)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(268)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Composición · Ecogenicidad · Forma · Márgenes · Focos</text>
      <text x="${px}" y="${y0 + fs(300)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Aprende a puntuar y clasificar paso a paso.</text>
      ${[0,1,2,3,4,5].map((d, i) => `<circle cx="${w/2 - fs(50) + i * fs(20)}" cy="${y0 + fs(360)}" r="${fs(5)}" fill="${i === 0 ? accentColor : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}"/>`).join("")}
      <text x="${w/2}" y="${y0 + fs(400)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${accentColor}" text-anchor="middle">Desliza →</text>`;
  } else if (contentType === "carousel-incidental") {
    const y0 = centerBlock(fs(400));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(200)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📚 CARRUSEL EDUCATIVO</text>
      <text x="${px}" y="${y0 + fs(90)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(52)}" fill="${mainColor}">5 incidentales</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">que no puedes</text>
      <text x="${px}" y="${y0 + fs(198)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">ignorar en un TC</text>
      <line x1="${px}" y1="${y0 + fs(224)}" x2="${px + fs(60)}" y2="${y0 + fs(224)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(268)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Nódulo pulmonar · Adrenal · Renal · Hepático · Tiroideo</text>
      <text x="${px}" y="${y0 + fs(300)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Qué guía seguir en cada caso. Con Radiogen.ai lo tienes integrado.</text>
      ${[0,1,2,3,4,5].map((d, i) => `<circle cx="${w/2 - fs(50) + i * fs(20)}" cy="${y0 + fs(360)}" r="${fs(5)}" fill="${i === 0 ? accentColor : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}"/>`).join("")}
      <text x="${w/2}" y="${y0 + fs(400)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${accentColor}" text-anchor="middle">Desliza →</text>`;
  } else if (contentType === "infographic-process") {
    const y0 = centerBlock(fs(420));
    const steps = [
      { num: "01", title: "Dicta tus hallazgos", desc: "En español, inglés o portugués.\nPor voz o texto libre." },
      { num: "02", title: "La IA estructura", desc: "Separa por secciones anatómicas.\nAplica tu estilo y frases." },
      { num: "03", title: "Revisa y ajusta", desc: "Edita lo que quieras.\nEl sistema aprende tus cambios." },
      { num: "04", title: "Conclusión + firma", desc: "Conclusión generada automáticamente.\nExporta PDF o copia." },
    ];
    const stepH = fs(78);
    const gap = fs(12);
    content = `
      <rect x="${px}" y="${y0}" width="${fs(160)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">⚙️ CÓMO FUNCIONA</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">De la voz al informe</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${accentColor}">firmado en 4 pasos</text>
      ${steps.map((s, i) => {
        const sy = y0 + fs(155) + i * (stepH + gap);
        const lines = s.desc.split("\\n");
        return `
          <rect x="${px}" y="${sy}" width="${w - px * 2}" height="${stepH}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.12)" stroke-width="1"/>
          <rect x="${px + fs(12)}" y="${sy + fs(14)}" width="${fs(48)}" height="${fs(48)}" rx="${fs(24)}" fill="${ta}0.15)"/>
          <text x="${px + fs(36)}" y="${sy + fs(46)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(18)}" fill="${accentColor}" text-anchor="middle">${s.num}</text>
          <text x="${px + fs(76)}" y="${sy + fs(32)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(18)}" fill="${mainColor}">${escSvg(s.title)}</text>
          <text x="${px + fs(76)}" y="${sy + fs(54)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${subColor}">${escSvg(lines[0])} ${escSvg(lines[1] || "")}</text>
          ${i < 3 ? `<line x1="${px + fs(36)}" y1="${sy + stepH}" x2="${px + fs(36)}" y2="${sy + stepH + gap}" stroke="${ta}0.2)" stroke-width="2" stroke-dasharray="4 3"/>` : ""}
        `;
      }).join("")}`;
  } else if (contentType === "time-comparison") {
    const y0 = centerBlock(fs(380));
    const barW = w - px * 2;
    content = `
      <rect x="${px}" y="${y0}" width="${fs(200)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">⏱️ COMPARATIVA</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Tiempo por informe</text>
      <text x="${px}" y="${y0 + fs(130)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${subColor}">Redacción manual</text>
      <rect x="${px}" y="${y0 + fs(145)}" width="${barW}" height="${fs(44)}" rx="${fs(8)}" fill="rgba(239,68,68,0.12)"/>
      <rect x="${px}" y="${y0 + fs(145)}" width="${barW * 0.88}" height="${fs(44)}" rx="${fs(8)}" fill="rgba(239,68,68,0.35)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(174)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(20)}" fill="${isDark ? '#fca5a5' : '#dc2626'}">15 minutos</text>
      <text x="${px}" y="${y0 + fs(224)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${subColor}">Con Radiogen.ai</text>
      <rect x="${px}" y="${y0 + fs(239)}" width="${barW}" height="${fs(44)}" rx="${fs(8)}" fill="${ta}0.08)"/>
      <rect x="${px}" y="${y0 + fs(239)}" width="${barW * 0.13}" height="${fs(44)}" rx="${fs(8)}" fill="${ta}0.5)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(268)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(20)}" fill="${accentColor}">2 minutos</text>
      <line x1="${px}" y1="${y0 + fs(310)}" x2="${px + fs(60)}" y2="${y0 + fs(310)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${w / 2}" y="${y0 + fs(350)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(56)}" fill="${accentColor}" text-anchor="middle">87% menos</text>
      <text x="${w / 2}" y="${y0 + fs(380)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}" text-anchor="middle">tiempo dedicado a redactar cada informe</text>`;
  } else if (contentType === "dyk-errors") {
    const y0 = centerBlock(fs(340));
    const vt = "rgba(167,139,250,";
    content = `
      <defs><linearGradient id="p-dyk1" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#581c87"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#p-dyk1)"/>
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(200)}" fill="${vt}0.06)"/>
      <circle cx="${w * 0.5}" cy="${h * 0.55}" r="${fs(350)}" fill="${vt}0.02)"/>
      <rect x="${px}" y="${y0}" width="${fs(180)}" height="${fs(32)}" rx="${fs(16)}" fill="${vt}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#c4b5fd">❓ ¿SABÍAS QUE?</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(100)}" fill="#c4b5fd">~30%</text>
      <text x="${px}" y="${y0 + fs(178)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="#ffffff">de los informes radiológicos</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="#ffffff">contienen errores</text>
      <text x="${px}" y="${y0 + fs(256)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="#c4b5fd">de comunicación</text>
      <line x1="${px}" y1="${y0 + fs(280)}" x2="${px + fs(60)}" y2="${y0 + fs(280)}" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(315)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(18)}" fill="rgba(255,255,255,0.45)">La estructuración automática reduce omisiones y ambigüedades.</text>
      <text x="${px}" y="${y0 + fs(340)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="rgba(255,255,255,0.3)">Fuente: Khorasani et al., JACR 2019</text>
      <g transform="translate(${px},${h - fs(40) - fs(10)}) scale(${scale * 0.5})"><rect width="20" height="20" rx="4" fill="#7c3aed"/><path d="M6 5h4.5a2.8 2.8 0 0 1 0 5.6h-1.8l2.8 3.8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${px + fs(16)}" y="${h - fs(40)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#ffffff"><tspan>Radiogen</tspan><tspan fill="#c4b5fd">.ai</tspan></text>`;
  } else if (contentType === "dyk-time") {
    const y0 = centerBlock(fs(330));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(180)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">❓ ¿SABÍAS QUE?</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(100)}" fill="${accentColor}">4.2h</text>
      <text x="${px}" y="${y0 + fs(178)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="${mainColor}">al día dedicadas a redactar</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="${accentColor}">informes radiológicos</text>
      <line x1="${px}" y1="${y0 + fs(248)}" x2="${px + fs(60)}" y2="${y0 + fs(248)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(286)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Con Radiogen.ai reduces ese tiempo un 87%.</text>
      <text x="${px}" y="${y0 + fs(316)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Más tiempo para leer imágenes, menos para teclear.</text>
      <text x="${px}" y="${y0 + fs(340)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${ta}0.35)">Fuente: Schemmel et al., Current Problems in Diagnostic Radiology 2016</text>`;
  } else if (contentType === "dyk-incidental") {
    const y0 = centerBlock(fs(330));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(180)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">❓ ¿SABÍAS QUE?</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(100)}" fill="${accentColor}">35%</text>
      <text x="${px}" y="${y0 + fs(178)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="${mainColor}">de hallazgos incidentales</text>
      <text x="${px}" y="${y0 + fs(218)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(30)}" fill="${accentColor}">no reciben seguimiento</text>
      <line x1="${px}" y1="${y0 + fs(248)}" x2="${px + fs(60)}" y2="${y0 + fs(248)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(286)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">Con recomendaciones basadas en evidencia integradas,</text>
      <text x="${px}" y="${y0 + fs(316)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(20)}" fill="${subColor}">ningún hallazgo incidental queda sin protocolo de manejo.</text>
      <text x="${px}" y="${y0 + fs(340)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${ta}0.35)">Fuente: Defined Health / RSNA Reports</text>`;
  } else if (contentType === "testimonial-metrics") {
    const y0 = centerBlock(fs(360));
    const tc = isDark ? brandTeal : brandTeal;
    content = `
      <text x="${w / 2}" y="${y0 + fs(20)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(120)}" fill="${tc}" text-anchor="middle" opacity="0.15">45→70</text>
      <text x="${w / 2}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(22)}" fill="${tc}" text-anchor="middle">informes / día</text>
      <line x1="${w/2 - fs(40)}" y1="${y0 + fs(100)}" x2="${w/2 + fs(40)}" y2="${y0 + fs(100)}" stroke="${tc}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px + fs(20)}" y="${y0 + fs(150)}" font-family="Georgia,serif" font-size="${fs(80)}" fill="${tc}" opacity="0.2">"</text>
      <text x="${px + fs(20)}" y="${y0 + fs(200)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(26)}" fill="${mainColor}">Antes hacía 45 informes al día y terminaba</text>
      <text x="${px + fs(20)}" y="${y0 + fs(238)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(26)}" fill="${mainColor}">agotado. Ahora hago 70 en menos tiempo</text>
      <text x="${px + fs(20)}" y="${y0 + fs(276)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(26)}" fill="${mainColor}">y la calidad ha mejorado.</text>
      <line x1="${px + fs(20)}" y1="${y0 + fs(306)}" x2="${px + fs(100)}" y2="${y0 + fs(306)}" stroke="${tc}" stroke-width="3" stroke-linecap="round"/>
      <text x="${px + fs(20)}" y="${y0 + fs(336)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${mainColor}">Dr. Carlos Ruiz</text>
      <text x="${px + fs(20)}" y="${y0 + fs(362)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(16)}" fill="${subColor}">Radiólogo — Hospital Regional  •  *Métricas representativas</text>`;
  } else if (contentType === "before-after-report") {
    const y0 = centerBlock(fs(420));
    const colMid = w / 2;
    const panelW = (w - px * 2 - fs(16)) / 2;
    const panelH = fs(320);
    content = `
      <text x="${w / 2}" y="${y0}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(36)}" fill="${mainColor}" text-anchor="middle">Tu dictado → Informe estructurado</text>
      <line x1="${w/2 - fs(40)}" y1="${y0 + fs(20)}" x2="${w/2 + fs(40)}" y2="${y0 + fs(20)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <rect x="${px}" y="${y0 + fs(45)}" width="${panelW}" height="${panelH}" rx="${fs(12)}" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.15)" stroke-width="1"/>
      <text x="${px + fs(14)}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${isDark ? '#fca5a5' : '#dc2626'}">DICTADO LIBRE</text>
      <text x="${px + fs(14)}" y="${y0 + fs(108)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">Hígado normal, bazo normal,</text>
      <text x="${px + fs(14)}" y="${y0 + fs(128)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">riñones sin alteraciones. Hay</text>
      <text x="${px + fs(14)}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">un nódulo en adrenal derecha</text>
      <text x="${px + fs(14)}" y="${y0 + fs(168)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">de unos 18mm denso. Páncreas</text>
      <text x="${px + fs(14)}" y="${y0 + fs(188)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">ok. Aorta con placa calcificada</text>
      <text x="${px + fs(14)}" y="${y0 + fs(208)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">sin estenosis. Vesícula sin</text>
      <text x="${px + fs(14)}" y="${y0 + fs(228)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">litiasis. No líquido libre...</text>
      <rect x="${colMid + fs(8)}" y="${y0 + fs(45)}" width="${panelW}" height="${panelH}" rx="${fs(12)}" fill="${ta}0.06)" stroke="${ta}0.15)" stroke-width="1"/>
      <text x="${colMid + fs(22)}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">INFORME ESTRUCTURADO</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(104)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(12)}" fill="${accentColor}">HÍGADO</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">Sin lesiones focales. Tamaño normal.</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(144)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(12)}" fill="${accentColor}">GLÁNDULAS ADRENALES</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(160)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">Nódulo adrenal derecho de 18 mm</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(176)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">con densidad de partes blandas.</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(200)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(12)}" fill="${accentColor}">AORTA Y GRANDES VASOS</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(216)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">Placas calcificadas sin estenosis.</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(240)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(12)}" fill="${accentColor}">CONCLUSIÓN</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(256)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">1. Nódulo adrenal derecho de 18 mm</text>
      <text x="${colMid + fs(22)}" y="${y0 + fs(272)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">con densidad de partes blandas.</text>
      <text x="${w / 2}" y="${y0 + fs(408)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${subColor}" text-anchor="middle">De texto libre a informe profesional en segundos</text>`;
  } else if (contentType === "bodymap") {
    const y0 = centerBlock(fs(420));
    const regions = [
      { y: 0, icon: "🧠", name: "Cabeza y cuello", n: "32", w2: 0.45 },
      { y: 1, icon: "🫁", name: "Tórax", n: "45", w2: 0.55 },
      { y: 2, icon: "❤️", name: "Cardíaco", n: "12", w2: 0.35 },
      { y: 3, icon: "🫄", name: "Abdomen y pelvis", n: "52", w2: 0.65 },
      { y: 4, icon: "🦴", name: "Columna", n: "18", w2: 0.40 },
      { y: 5, icon: "💪", name: "Extremidad superior", n: "22", w2: 0.48 },
      { y: 6, icon: "🦵", name: "Extremidad inferior", n: "21", w2: 0.45 },
    ];
    const barH = fs(38);
    const gap2 = fs(8);
    content = `
      <rect x="${px}" y="${y0}" width="${fs(280)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🗺️ COBERTURA ANATÓMICA</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">+190 plantillas</text>
      <text x="${px}" y="${y0 + fs(114)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${accentColor}">por región corporal</text>
      ${regions.map((r) => {
        const ry = y0 + fs(145) + r.y * (barH + gap2);
        const barFull = w - px * 2 - fs(120);
        return `
          <text x="${px}" y="${ry + barH * 0.65}" font-family="system-ui,sans-serif" font-size="${fs(16)}">${r.icon}</text>
          <text x="${px + fs(26)}" y="${ry + barH * 0.65}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(14)}" fill="${mainColor}">${escSvg(r.name)}</text>
          <rect x="${px + fs(120)}" y="${ry + fs(6)}" width="${barFull}" height="${barH - fs(12)}" rx="${fs(6)}" fill="${ta}0.06)"/>
          <rect x="${px + fs(120)}" y="${ry + fs(6)}" width="${barFull * r.w2}" height="${barH - fs(12)}" rx="${fs(6)}" fill="${ta}0.25)"/>
          <text x="${px + fs(120) + barFull * r.w2 + fs(8)}" y="${ry + barH * 0.65}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">${r.n}</text>
        `;
      }).join("")}`;
  } else if (contentType === "roi-pricing") {
    const y0 = centerBlock(fs(400));
    const vt = "rgba(167,139,250,";
    content = `
      <defs><linearGradient id="p-roi" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#581c87"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#p-roi)"/>
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(200)}" fill="${vt}0.06)"/>
      <circle cx="${w * 0.5}" cy="${h * 0.55}" r="${fs(350)}" fill="${vt}0.02)"/>
      <rect x="${px}" y="${y0}" width="${fs(120)}" height="${fs(32)}" rx="${fs(16)}" fill="${vt}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#c4b5fd">💰 ROI</text>
      <text x="${px}" y="${y0 + fs(78)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(38)}" fill="#ffffff">¿Cuánto vale</text>
      <text x="${px}" y="${y0 + fs(122)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(38)}" fill="#c4b5fd">1 hora extra al día?</text>
      <line x1="${px}" y1="${y0 + fs(148)}" x2="${px + fs(60)}" y2="${y0 + fs(148)}" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/>
      <rect x="${px}" y="${y0 + fs(170)}" width="${w - px * 2}" height="${fs(48)}" rx="${fs(10)}" fill="${vt}0.08)" stroke="${vt}0.15)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(200)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="rgba(255,255,255,0.7)">1 hora/día × 22 días × 12 meses =</text>
      <text x="${w - px - fs(16)}" y="${y0 + fs(200)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="#c4b5fd" text-anchor="end">264 horas/año</text>
      <rect x="${px}" y="${y0 + fs(230)}" width="${w - px * 2}" height="${fs(48)}" rx="${fs(10)}" fill="${vt}0.08)" stroke="${vt}0.15)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(260)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="rgba(255,255,255,0.7)">264 horas = 33 jornadas laborales =</text>
      <text x="${w - px - fs(16)}" y="${y0 + fs(260)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="#c4b5fd" text-anchor="end">6.6 semanas</text>
      <rect x="${px}" y="${y0 + fs(290)}" width="${w - px * 2}" height="${fs(48)}" rx="${fs(10)}" fill="${vt}0.12)" stroke="${vt}0.2)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(320)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="rgba(255,255,255,0.7)">Coste Radiogen.ai:</text>
      <text x="${w - px - fs(16)}" y="${y0 + fs(320)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="#c4b5fd" text-anchor="end">desde 30 €/mes</text>
      <text x="${w / 2}" y="${y0 + fs(380)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(24)}" fill="#c4b5fd" text-anchor="middle">6 semanas de tu vida recuperadas cada año.</text>
      <text x="${w / 2}" y="${y0 + fs(405)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(16)}" fill="rgba(255,255,255,0.4)" text-anchor="middle">*Estimación basada en reducción media del 87% de tiempo de redacción.</text>
      <g transform="translate(${px},${h - fs(40) - fs(10)}) scale(${scale * 0.5})"><rect width="20" height="20" rx="4" fill="#7c3aed"/><path d="M6 5h4.5a2.8 2.8 0 0 1 0 5.6h-1.8l2.8 3.8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${px + fs(16)}" y="${h - fs(40)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#ffffff"><tspan>Radiogen</tspan><tspan fill="#c4b5fd">.ai</tspan></text>`;
  } else if (contentType === "spotlight-voice") {
    const y0 = centerBlock(fs(340));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(100)}" height="${fs(100)}" rx="${fs(24)}" fill="${ta}0.12)" stroke="${ta}0.2)" stroke-width="1"/>
      <text x="${px + fs(50)}" y="${y0 + fs(65)}" font-family="system-ui,sans-serif" font-size="${fs(48)}" text-anchor="middle">🎙️</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Dictado por voz</text>
      <text x="${px}" y="${y0 + fs(196)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">en tu idioma</text>
      <line x1="${px}" y1="${y0 + fs(220)}" x2="${px + fs(60)}" y2="${y0 + fs(220)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(258)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Dicta en español, inglés o portugués. La IA transcribe,</text>
      <text x="${px}" y="${y0 + fs(290)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">estructura y traduce automáticamente al idioma del informe.</text>
      <text x="${px}" y="${y0 + fs(334)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${accentColor}">→ Funciona con el micrófono de tu navegador.</text>`;
  } else if (contentType === "spotlight-multilang") {
    const y0 = centerBlock(fs(360));
    const langs = [
      { flag: "🇪🇸", name: "Español", ex: "Nódulo pulmonar de 8 mm en LID..." },
      { flag: "🇬🇧", name: "English", ex: "8 mm pulmonary nodule in the RLL..." },
      { flag: "🇧🇷", name: "Português", ex: "Nódulo pulmonar de 8 mm no LID..." },
    ];
    const rowH2 = fs(70);
    content = `
      <rect x="${px}" y="${y0}" width="${fs(100)}" height="${fs(100)}" rx="${fs(24)}" fill="${ta}0.12)" stroke="${ta}0.2)" stroke-width="1"/>
      <text x="${px + fs(50)}" y="${y0 + fs(65)}" font-family="system-ui,sans-serif" font-size="${fs(48)}" text-anchor="middle">🌍</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">3 idiomas</text>
      <text x="${px}" y="${y0 + fs(196)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">un mismo informe</text>
      <line x1="${px}" y1="${y0 + fs(220)}" x2="${px + fs(60)}" y2="${y0 + fs(220)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      ${langs.map((l2, i) => {
        const ry = y0 + fs(245) + i * rowH2;
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rowH2 - fs(6)}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
          <text x="${px + fs(14)}" y="${ry + fs(28)}" font-family="system-ui,sans-serif" font-size="${fs(22)}">${l2.flag}</text>
          <text x="${px + fs(44)}" y="${ry + fs(28)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(17)}" fill="${mainColor}">${l2.name}</text>
          <text x="${px + fs(14)}" y="${ry + fs(52)}" font-family="system-ui,sans-serif" font-style="italic" font-size="${fs(13)}" fill="${subColor}">${escSvg(l2.ex)}</text>
        `;
      }).join("")}`;
  } else if (contentType === "spotlight-darkmode") {
    const y0 = centerBlock(fs(320));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(100)}" height="${fs(100)}" rx="${fs(24)}" fill="${ta}0.12)" stroke="${ta}0.2)" stroke-width="1"/>
      <text x="${px + fs(50)}" y="${y0 + fs(65)}" font-family="system-ui,sans-serif" font-size="${fs(48)}" text-anchor="middle">🌙</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Modo oscuro</text>
      <text x="${px}" y="${y0 + fs(196)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${accentColor}">para tu jornada</text>
      <line x1="${px}" y1="${y0 + fs(220)}" x2="${px + fs(60)}" y2="${y0 + fs(220)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(258)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Interfaz diseñada para jornadas largas delante de la pantalla.</text>
      <text x="${px}" y="${y0 + fs(290)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Menos fatiga visual, mejor contraste, más concentración.</text>`;
  } else if (contentType === "spotlight-export") {
    const y0 = centerBlock(fs(320));
    content = `
      <rect x="${px}" y="${y0}" width="${fs(100)}" height="${fs(100)}" rx="${fs(24)}" fill="${isDark ? ta + '0.12)' : 'rgba(15,118,110,0.08)' }" stroke="${isDark ? ta + '0.2)' : 'rgba(15,118,110,0.15)' }" stroke-width="1"/>
      <text x="${px + fs(50)}" y="${y0 + fs(65)}" font-family="system-ui,sans-serif" font-size="${fs(48)}" text-anchor="middle">📄</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${mainColor}">Exporta en PDF</text>
      <text x="${px}" y="${y0 + fs(196)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="${isDark ? accentColor : brandTeal}">o copia al portapapeles</text>
      <line x1="${px}" y1="${y0 + fs(220)}" x2="${px + fs(60)}" y2="${y0 + fs(220)}" stroke="${isDark ? accentColor : brandTeal}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(258)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">Informe completo con cabecera del hospital, datos del paciente,</text>
      <text x="${px}" y="${y0 + fs(290)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="${subColor}">hallazgos y conclusión. Listo para pegar en tu RIS/PACS.</text>`;
  } else if (contentType === "spotlight-teams") {
    const y0 = centerBlock(fs(360));
    const vt = "rgba(167,139,250,";
    content = `
      <defs><linearGradient id="p-teams" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#581c87"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#p-teams)"/>
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(200)}" fill="${vt}0.06)"/>
      <circle cx="${w * 0.5}" cy="${h * 0.55}" r="${fs(350)}" fill="${vt}0.02)"/>
      <rect x="${px}" y="${y0}" width="${fs(100)}" height="${fs(100)}" rx="${fs(24)}" fill="${vt}0.12)" stroke="${vt}0.2)" stroke-width="1"/>
      <text x="${px + fs(50)}" y="${y0 + fs(65)}" font-family="system-ui,sans-serif" font-size="${fs(48)}" text-anchor="middle">👥</text>
      <text x="${px}" y="${y0 + fs(148)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="#ffffff">Para equipos</text>
      <text x="${px}" y="${y0 + fs(196)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(44)}" fill="#c4b5fd">y departamentos</text>
      <line x1="${px}" y1="${y0 + fs(220)}" x2="${px + fs(60)}" y2="${y0 + fs(220)}" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(258)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="rgba(255,255,255,0.55)">Organiza tu servicio: secciones, roles, plantillas</text>
      <text x="${px}" y="${y0 + fs(288)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(22)}" fill="rgba(255,255,255,0.55)">compartidas y recomendaciones del hospital.</text>
      <text x="${px}" y="${y0 + fs(326)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(20)}" fill="#ffffff">Jefe de servicio · Jefe de sección · Radiólogo</text>
      <text x="${px}" y="${y0 + fs(358)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="#c4b5fd">→ Cada rol ve lo que necesita. Nada más.</text>
      <g transform="translate(${px},${h - fs(40) - fs(10)}) scale(${scale * 0.5})"><rect width="20" height="20" rx="4" fill="#7c3aed"/><path d="M6 5h4.5a2.8 2.8 0 0 1 0 5.6h-1.8l2.8 3.8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g><text x="${px + fs(16)}" y="${h - fs(40)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="#ffffff"><tspan>Radiogen</tspan><tspan fill="#c4b5fd">.ai</tspan></text>`;
  } else if (contentType === "normality-learn") {
    const y0 = centerBlock(fs(400));
    const bx = px + fs(20);
    const bubW = w - px * 2 - fs(40);
    content = `
      <rect x="${px}" y="${y0}" width="${fs(250)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧠 APRENDIZAJE EN TIEMPO REAL</text>
      <text x="${px}" y="${y0 + fs(74)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(38)}" fill="${mainColor}">La IA aprende de cada</text>
      <text x="${px}" y="${y0 + fs(114)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(38)}" fill="${accentColor}">corrección que haces</text>
      <rect x="${bx}" y="${y0 + fs(148)}" width="${bubW}" height="${fs(52)}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
      <text x="${bx + fs(12)}" y="${y0 + fs(168)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(12)}" fill="${accentColor}">IA genera:</text>
      <text x="${bx + fs(12)}" y="${y0 + fs(188)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${subColor}">"Parénquima pulmonar sin consolidaciones ni nódulos."</text>
      <text x="${bx + fs(20)}" y="${y0 + fs(220)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${isDark ? '#f87171' : '#dc2626'}">✏️ Tú corriges →</text>
      <rect x="${bx}" y="${y0 + fs(236)}" width="${bubW}" height="${fs(52)}" rx="${fs(10)}" fill="${isDark ? 'rgba(248,113,113,0.08)' : 'rgba(220,38,38,0.06)'}" stroke="${isDark ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.1)'}" stroke-width="1"/>
      <text x="${bx + fs(12)}" y="${y0 + fs(256)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(12)}" fill="${isDark ? '#fca5a5' : '#dc2626'}">Tu versión:</text>
      <text x="${bx + fs(12)}" y="${y0 + fs(276)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${subColor}">"Campos pulmonares sin opacidades de ocupación alveolar."</text>
      <text x="${bx + fs(20)}" y="${y0 + fs(310)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${accentColor}">🧠 IA memoriza →</text>
      <rect x="${bx}" y="${y0 + fs(326)}" width="${bubW}" height="${fs(52)}" rx="${fs(10)}" fill="${ta}0.1)" stroke="${ta}0.2)" stroke-width="1"/>
      <text x="${bx + fs(12)}" y="${y0 + fs(346)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(12)}" fill="${accentColor}">Próximo informe:</text>
      <text x="${bx + fs(12)}" y="${y0 + fs(366)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(14)}" fill="${mainColor}">"Campos pulmonares sin opacidades de ocupación alveolar." ✓</text>
      <text x="${w / 2}" y="${y0 + fs(400)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="${subColor}" text-anchor="middle">Tu vocabulario, tu estilo, tu nivel de detalle — automáticamente.</text>`;


  } else if (contentType === "guide-fleischner") {
    const y0 = centerBlock(fs(460));
    const rows = [
      { size: "&lt; 6 mm", low: "Sin seguimiento", high: "TC opcional 12 m", risk: 0.1 },
      { size: "6–8 mm", low: "TC 6-12 m", high: "TC 6-12 m y 18-24 m", risk: 0.4 },
      { size: "&gt; 8 mm", low: "TC 3 m, PET-CT o biopsia", high: "TC 3 m, PET-CT o biopsia", risk: 0.8 },
    ];
    const rowH3 = fs(56);
    const colW = (w - px * 2) / 3;
    content = `
      <circle cx="${w * 0.85}" cy="${y0 - fs(30)}" r="${fs(180)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.1}" cy="${h * 0.7}" r="${fs(120)}" fill="${ta}0.03)"/>
      <rect x="${px}" y="${y0 - fs(6)}" width="${fs(5)}" height="${fs(90)}" rx="${fs(2)}" fill="${accentColor}" opacity="0.4"/>
      <rect x="${px + fs(16)}" y="${y0}" width="${fs(280)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(32)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 GUÍA CLÍNICA — FLEISCHNER 2017</text>
      <text x="${px + fs(16)}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Nódulos pulmonares</text>
      <text x="${px + fs(16)}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">sólidos incidentales</text>
      <rect x="${px}" y="${y0 + fs(148)}" width="${w - px * 2}" height="${fs(38)}" rx="${fs(6)}" fill="${ta}0.15)"/>
      <text x="${px + fs(14)}" y="${y0 + fs(174)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">TAMAÑO</text>
      <text x="${px + colW + fs(14)}" y="${y0 + fs(174)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">BAJO RIESGO</text>
      <text x="${px + colW * 2 + fs(14)}" y="${y0 + fs(174)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">ALTO RIESGO</text>
      ${rows.map((r, i) => {
        const ry = y0 + fs(196) + i * (rowH3 + fs(6));
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rowH3}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
          <rect x="${px}" y="${ry}" width="${fs(8)}" height="${rowH3}" rx="${fs(4)}" fill="${accentColor}" opacity="${0.3 + r.risk * 0.7}"/>
          <text x="${px + fs(22)}" y="${ry + fs(24)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(20)}" fill="${mainColor}">${r.size}</text>
          <rect x="${px + fs(22)}" y="${ry + fs(36)}" width="${fs(30 + r.risk * 100)}" height="${fs(8)}" rx="${fs(4)}" fill="${accentColor}" opacity="${0.2 + r.risk * 0.4}"/>
          <text x="${px + colW + fs(14)}" y="${ry + fs(28)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(15)}" fill="${subColor}">${r.low}</text>
          <text x="${px + colW * 2 + fs(14)}" y="${ry + fs(28)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(15)}" fill="${subColor}">${r.high}</text>
        `;
      }).join("")}
      <line x1="${px}" y1="${y0 + fs(396)}" x2="${px + fs(60)}" y2="${y0 + fs(396)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(422)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${subColor}">Sube tus guías a Radiogen.ai y consúltalas</text>
      <text x="${px}" y="${y0 + fs(448)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${subColor}">mientras informas, sin salir de la pantalla.</text>
      <text x="${px}" y="${y0 + fs(468)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: MacMahon et al., Radiology 2017 · Radiogen.ai no emite recomendaciones clínicas</text>`;
  } else if (contentType === "guide-adrenal") {
    const y0 = centerBlock(fs(450));
    const boxes = [
      { label: "&lt; 1 cm", action: "Sin seguimiento", color: "rgba(34,197,94,", icon: "✓" },
      { label: "1–4 cm", action: "Washout CT o RM chemical shift", color: `${ta.slice(0,-1)},`, icon: "?" },
      { label: "&gt; 4 cm", action: "Evaluación quirúrgica + analítica", color: "rgba(239,68,68,", icon: "!" },
    ];
    const boxW = (w - px * 2 - fs(24)) / 3;
    const boxH = fs(150);
    content = `
      <circle cx="${w * 0.9}" cy="${y0 - fs(20)}" r="${fs(160)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.05}" cy="${h * 0.75}" r="${fs(100)}" fill="${ta}0.03)"/>
      <line x1="${px}" y1="${y0 - fs(10)}" x2="${px + fs(200)}" y2="${y0 - fs(10)}" stroke="${accentColor}" stroke-width="3" stroke-linecap="round" opacity="0.3"/>
      <rect x="${px}" y="${y0}" width="${fs(320)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 GUÍA CLÍNICA — ACR 2017</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Incidentaloma adrenal</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">¿Qué hacer según tamaño?</text>
      ${boxes.map((b, i) => {
        const bx = px + i * (boxW + fs(12));
        const by = y0 + fs(150);
        return `
          <rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" rx="${fs(14)}" fill="${b.color}0.08)" stroke="${b.color}0.2)" stroke-width="1.5"/>
          <rect x="${bx + boxW / 2 - fs(24)}" y="${by + fs(14)}" width="${fs(48)}" height="${fs(48)}" rx="${fs(24)}" fill="${b.color}0.15)"/>
          <text x="${bx + boxW / 2}" y="${by + fs(46)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="${b.color}0.7)" text-anchor="middle">${b.icon}</text>
          <text x="${bx + boxW / 2}" y="${by + fs(86)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(26)}" fill="${b.color}0.8)" text-anchor="middle">${b.label}</text>
          <line x1="${bx + fs(16)}" y1="${by + fs(100)}" x2="${bx + boxW - fs(16)}" y2="${by + fs(100)}" stroke="${b.color}0.15)" stroke-width="1"/>
          <text x="${bx + boxW / 2}" y="${by + fs(122)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(13)}" fill="${subColor}" text-anchor="middle">${escSvg(b.action)}</text>
        `;
      }).join("")}
      ${[0,1].map(i => `<text x="${px + (i + 1) * (boxW + fs(12)) - fs(12)}" y="${y0 + fs(150) + boxH / 2 + fs(6)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(22)}" fill="${ta}0.25)" text-anchor="middle">→</text>`).join("")}
      <rect x="${px}" y="${y0 + fs(320)}" width="${w - px * 2}" height="${fs(52)}" rx="${fs(10)}" fill="${ta}0.08)" stroke="${ta}0.12)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(340)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">💡 Densidad &lt; 10 UH sin contraste = adenoma benigno</text>
      <text x="${px + fs(16)}" y="${y0 + fs(362)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">Washout absoluto ≥ 60% o relativo ≥ 40% confirma adenoma</text>
      <line x1="${px}" y1="${y0 + fs(392)}" x2="${px + fs(60)}" y2="${y0 + fs(392)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(418)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${subColor}">Tus documentos de referencia, accesibles mientras informas</text>
      <text x="${px}" y="${y0 + fs(448)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: Mayo-Smith et al., JACR 2017 · La decisión clínica es siempre del radiólogo</text>`;
  } else if (contentType === "guide-bosniak") {
    const y0 = centerBlock(fs(460));
    const cats = [
      { cat: "I", desc: "Quiste simple", risk: "&lt; 1%", bar: 0.02, c: "rgba(34,197,94," },
      { cat: "II", desc: "Mínima complejidad", risk: "&lt; 1%", bar: 0.04, c: "rgba(34,197,94," },
      { cat: "IIF", desc: "Requiere seguimiento", risk: "5–10%", bar: 0.1, c: `${ta.slice(0,-1)},` },
      { cat: "III", desc: "Indeterminado", risk: "40–60%", bar: 0.5, c: "rgba(251,191,36," },
      { cat: "IV", desc: "Componente sólido", risk: "&gt; 90%", bar: 0.95, c: "rgba(239,68,68," },
    ];
    const rowH4 = fs(48);
    const barMax = w - px * 2 - fs(340);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.12}" r="${fs(200)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.15}" cy="${h * 0.85}" r="${fs(140)}" fill="${ta}0.03)"/>
      <rect x="${w - px - fs(4)}" y="${y0}" width="${fs(4)}" height="${fs(300)}" rx="${fs(2)}" fill="${accentColor}" opacity="0.15"/>
      <rect x="${px}" y="${y0}" width="${fs(280)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 CLASIFICACIÓN — BOSNIAK 2019</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Quistes renales</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">Riesgo de malignidad</text>
      ${cats.map((r, i) => {
        const ry = y0 + fs(150) + i * (rowH4 + fs(6));
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rowH4}" rx="${fs(10)}" fill="${ta}0.05)" stroke="${ta}0.08)" stroke-width="1"/>
          <rect x="${px + fs(6)}" y="${ry + fs(6)}" width="${fs(50)}" height="${rowH4 - fs(12)}" rx="${fs(8)}" fill="${r.c}0.2)"/>
          <text x="${px + fs(31)}" y="${ry + fs(31)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(18)}" fill="${r.c}0.9)" text-anchor="middle">${r.cat}</text>
          <text x="${px + fs(68)}" y="${ry + fs(22)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${mainColor}">${escSvg(r.desc)}</text>
          <text x="${px + fs(68)}" y="${ry + fs(40)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${subColor}">Riesgo: ${r.risk}</text>
          <rect x="${w - px - barMax - fs(10)}" y="${ry + fs(16)}" width="${barMax}" height="${fs(14)}" rx="${fs(5)}" fill="${ta}0.06)"/>
          <rect x="${w - px - barMax - fs(10)}" y="${ry + fs(16)}" width="${Math.max(barMax * r.bar, fs(8))}" height="${fs(14)}" rx="${fs(5)}" fill="${r.c}0.5)"/>
        `;
      }).join("")}
      <line x1="${px}" y1="${y0 + fs(420)}" x2="${px + fs(60)}" y2="${y0 + fs(420)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(446)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${subColor}">Calculadora Bosniak disponible en Radiogen.ai</text>
      <text x="${px}" y="${y0 + fs(468)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: Silverman et al., Radiology 2019 · El radiólogo decide la recomendación final</text>`;
  } else if (contentType === "guide-lirads") {
    const y0 = centerBlock(fs(460));
    const cats2 = [
      { cat: "LR-1", desc: "Definitivamente benigno", next: "—", c: "rgba(34,197,94," },
      { cat: "LR-2", desc: "Probablemente benigno", next: "Opcional", c: "rgba(34,197,94," },
      { cat: "LR-3", desc: "Probabilidad intermedia", next: "3-6 meses", c: "rgba(251,191,36," },
      { cat: "LR-4", desc: "Probablemente CHC", next: "Multidisciplinar", c: "rgba(249,115,22," },
      { cat: "LR-5", desc: "Definitivamente CHC", next: "Tratamiento", c: "rgba(239,68,68," },
    ];
    const rowH5 = fs(50);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.1}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.08}" cy="${h * 0.8}" r="${fs(130)}" fill="${ta}0.03)"/>
      <line x1="${w - px}" y1="${y0 + fs(50)}" x2="${w - px}" y2="${y0 + fs(400)}" stroke="${accentColor}" stroke-width="2" opacity="0.1" stroke-dasharray="${fs(8)} ${fs(6)}"/>
      <rect x="${px}" y="${y0}" width="${fs(280)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 GUÍA CLÍNICA — LI-RADS v2018</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Lesiones hepáticas</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">en paciente de riesgo</text>
      ${cats2.map((r, i) => {
        const ry = y0 + fs(150) + i * (rowH5 + fs(6));
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rowH5}" rx="${fs(10)}" fill="${ta}0.05)" stroke="${ta}0.08)" stroke-width="1"/>
          <rect x="${px + fs(6)}" y="${ry + fs(6)}" width="${fs(76)}" height="${rowH5 - fs(12)}" rx="${fs(8)}" fill="${r.c}0.15)"/>
          <text x="${px + fs(44)}" y="${ry + fs(32)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(16)}" fill="${r.c}0.9)" text-anchor="middle">${r.cat}</text>
          <text x="${px + fs(94)}" y="${ry + fs(24)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${mainColor}">${escSvg(r.desc)}</text>
          <text x="${px + fs(94)}" y="${ry + fs(42)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">Siguiente paso: ${r.next}</text>
        `;
      }).join("")}
      <rect x="${px}" y="${y0 + fs(432)}" width="${w - px * 2}" height="${fs(1)}" fill="${ta}0.1)"/>
      <text x="${px}" y="${y0 + fs(452)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${subColor}">Criterios principales: Lavado arterial, cápsula, crecimiento en umbral</text>
      <text x="${px}" y="${y0 + fs(472)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: ACR CT/MRI LI-RADS v2018 · Consulta de referencia, no diagnóstico automático</text>`;
  } else if (contentType === "guide-aorta") {
    const y0 = centerBlock(fs(450));
    const ranges = [
      { range: "&lt; 3 cm", label: "Normal", c: "rgba(34,197,94,", pct: 0.25 },
      { range: "3–4 cm", label: "Ectasia · Eco anual", c: "rgba(34,197,94,", pct: 0.38 },
      { range: "4–5 cm", label: "Aneurisma · Eco/TC 6 m", c: "rgba(251,191,36,", pct: 0.55 },
      { range: "5–5.5 cm", label: "Grande · TC/Eco 3 m", c: "rgba(249,115,22,", pct: 0.72 },
      { range: "&gt; 5.5 cm", label: "Derivar cirugía vascular", c: "rgba(239,68,68,", pct: 1.0 },
    ];
    const rowH6 = fs(46);
    const barMax2 = w - px * 2 - fs(20);
    content = `
      <circle cx="${w * 0.85}" cy="${h * 0.08}" r="${fs(180)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.1}" cy="${h * 0.75}" r="${fs(120)}" fill="${ta}0.03)"/>
      <rect x="${px}" y="${y0}" width="${fs(280)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 GUÍA CLÍNICA — SVS 2018</text>
      <text x="${px}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Aneurisma aórtico</text>
      <text x="${px}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">abdominal: seguimiento</text>
      ${ranges.map((r, i) => {
        const ry = y0 + fs(150) + i * (rowH6 + fs(6));
        return `
          <rect x="${px}" y="${ry}" width="${barMax2 * r.pct}" height="${rowH6}" rx="${fs(10)}" fill="${r.c}0.12)" stroke="${r.c}0.2)" stroke-width="1"/>
          <rect x="${px}" y="${ry}" width="${fs(8)}" height="${rowH6}" rx="${fs(4)}" fill="${r.c}0.7)"/>
          <text x="${px + fs(20)}" y="${ry + fs(20)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(18)}" fill="${r.c}0.9)">${r.range}</text>
          <text x="${px + fs(20)}" y="${ry + fs(38)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(14)}" fill="${subColor}">${escSvg(r.label)}</text>
        `;
      }).join("")}
      <text x="${w - px}" y="${y0 + fs(146)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(13)}" fill="${accentColor}" text-anchor="end">Urgencia →</text>
      <line x1="${px}" y1="${y0 + fs(410)}" x2="${px + fs(60)}" y2="${y0 + fs(410)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(436)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(18)}" fill="${subColor}">Tus guías clínicas al alcance mientras redactas el informe</text>
      <text x="${px}" y="${y0 + fs(458)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: Chaikof et al., SVS Guidelines 2018 · La decisión clínica es siempre del radiólogo</text>`;
  } else if (contentType === "guide-birads") {
    const y0 = centerBlock(fs(460));
    const cats3 = [
      { cat: "0", desc: "Evaluación adicional", action: "Eco / Magnificación", c: "rgba(156,163,175," },
      { cat: "1", desc: "Negativo", action: "Screening habitual", c: "rgba(34,197,94," },
      { cat: "2", desc: "Hallazgo benigno", action: "Screening habitual", c: "rgba(34,197,94," },
      { cat: "3", desc: "Probablemente benigno", action: "Control 6 meses", c: "rgba(251,191,36," },
      { cat: "4", desc: "Sospechoso", action: "Biopsia", c: "rgba(249,115,22," },
      { cat: "5", desc: "Altamente sospechoso", action: "Biopsia urgente", c: "rgba(239,68,68," },
      { cat: "6", desc: "Malignidad confirmada", action: "Tratamiento", c: "rgba(185,28,28," },
    ];
    const rowH7 = fs(38);
    content = `
      <circle cx="${w * 0.9}" cy="${h * 0.1}" r="${fs(180)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.12}" cy="${h * 0.88}" r="${fs(100)}" fill="${ta}0.03)"/>
      <rect x="${px}" y="${y0 - fs(6)}" width="${fs(5)}" height="${fs(80)}" rx="${fs(2)}" fill="${accentColor}" opacity="0.35"/>
      <rect x="${px + fs(16)}" y="${y0}" width="${fs(260)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(32)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">📋 CLASIFICACIÓN — BI-RADS 5ª ed.</text>
      <text x="${px + fs(16)}" y="${y0 + fs(76)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${mainColor}">Lesiones mamarias</text>
      <text x="${px + fs(16)}" y="${y0 + fs(120)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(42)}" fill="${accentColor}">Categorías y manejo</text>
      ${cats3.map((r, i) => {
        const ry = y0 + fs(145) + i * (rowH7 + fs(4));
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rowH7}" rx="${fs(8)}" fill="${ta}0.05)" stroke="${ta}0.07)" stroke-width="1"/>
          <rect x="${px + fs(5)}" y="${ry + fs(5)}" width="${fs(40)}" height="${rowH7 - fs(10)}" rx="${fs(6)}" fill="${r.c}0.2)"/>
          <text x="${px + fs(25)}" y="${ry + fs(25)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(16)}" fill="${r.c}0.9)" text-anchor="middle">${r.cat}</text>
          <text x="${px + fs(56)}" y="${ry + fs(25)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(15)}" fill="${mainColor}">${escSvg(r.desc)}</text>
          <text x="${w - px - fs(12)}" y="${ry + fs(25)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(13)}" fill="${r.c}0.7)" text-anchor="end">${escSvg(r.action)}</text>
        `;
      }).join("")}
      <line x1="${px}" y1="${y0 + fs(436)}" x2="${px + fs(60)}" y2="${y0 + fs(436)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(456)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="${subColor}">Referencia rápida al lado de tu informe</text>
      <text x="${px}" y="${y0 + fs(474)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: ACR BI-RADS Atlas, 5th ed. · Radiogen.ai muestra la guía que tú subas; no emite diagnósticos</text>`;
  } else if (contentType === "case-tirads") {
    const y0 = centerBlock(fs(460));
    const params = [
      { feat: "Composición", val: "Sólido", pts: "+2" },
      { feat: "Ecogenicidad", val: "Hipoecoico", pts: "+2" },
      { feat: "Forma", val: "Más alto que ancho", pts: "+3" },
      { feat: "Márgenes", val: "Lisos", pts: "0" },
      { feat: "Focos ecogénicos", val: "Microcalcificaciones", pts: "+3" },
    ];
    const rowH8 = fs(42);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.06}" cy="${h * 0.7}" r="${fs(130)}" fill="${ta}0.03)"/>
      <text x="${w - px - fs(20)}" y="${y0 + fs(100)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(160)}" fill="${ta}0.05)" text-anchor="end">10</text>
      <rect x="${px}" y="${y0}" width="${fs(320)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧮 CASO CLÍNICO — ACR TI-RADS</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Nódulo tiroideo de 15 mm</text>
      <text x="${px}" y="${y0 + fs(104)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${subColor}">Mujer, 52 años — Ecografía tiroidea</text>
      ${params.map((p, i) => {
        const ry = y0 + fs(128) + i * (rowH8 + fs(4));
        const hasPoints = p.pts !== "0";
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rowH8}" rx="${fs(8)}" fill="${hasPoints ? ta + '0.08)' : ta + '0.04)'}" stroke="${ta}0.1)" stroke-width="1"/>
          <text x="${px + fs(14)}" y="${ry + fs(27)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(15)}" fill="${subColor}">${p.feat}</text>
          <text x="${w / 2}" y="${ry + fs(27)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${mainColor}" text-anchor="middle">${escSvg(p.val)}</text>
          <rect x="${w - px - fs(60)}" y="${ry + fs(8)}" width="${fs(46)}" height="${rowH8 - fs(16)}" rx="${fs(6)}" fill="${hasPoints ? accentColor : ta + '0.15)'}" opacity="${hasPoints ? '0.2' : '1'}"/>
          <text x="${w - px - fs(37)}" y="${ry + fs(27)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(17)}" fill="${hasPoints ? accentColor : subColor}" text-anchor="middle">${p.pts}</text>
        `;
      }).join("")}
      <rect x="${px}" y="${y0 + fs(362)}" width="${w - px * 2}" height="${fs(60)}" rx="${fs(14)}" fill="${ta}0.15)" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
      <text x="${w / 2}" y="${y0 + fs(400)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(26)}" fill="${accentColor}" text-anchor="middle">Total: 10 pts → TR5 — Altamente sospechoso</text>
      <text x="${px}" y="${y0 + fs(440)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="${subColor}">Puntúa en segundos con la calculadora de Radiogen.ai</text>
      <text x="${px}" y="${y0 + fs(464)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Caso ilustrativo · El radiólogo introduce los datos y decide la conducta</text>`;
  } else if (contentType === "case-pirads") {
    const y0 = centerBlock(fs(450));
    const steps2 = [
      { step: "Zona", val: "Periférica", icon: "📍" },
      { step: "DWI", val: "Restricción marcada — Score 5", icon: "🔬" },
      { step: "T2W", val: "Hipointensa focal — Score 4", icon: "🧲" },
      { step: "DCE", val: "Realce precoz positivo (+)", icon: "💉" },
    ];
    const sH = fs(50);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.1}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.08}" cy="${h * 0.75}" r="${fs(120)}" fill="${ta}0.03)"/>
      <text x="${w - px - fs(20)}" y="${y0 + fs(100)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(160)}" fill="${ta}0.05)" text-anchor="end">5</text>
      <rect x="${px}" y="${y0}" width="${fs(320)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧮 CASO CLÍNICO — PI-RADS v2.1</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Lesión prostática en RM</text>
      <text x="${px}" y="${y0 + fs(104)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${subColor}">Varón, 67 años — PSA 8.2 ng/mL — RM multiparamétrica</text>
      ${steps2.map((s, i) => {
        const sy = y0 + fs(130) + i * (sH + fs(5));
        return `
          <rect x="${px}" y="${sy}" width="${w - px * 2}" height="${sH}" rx="${fs(10)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
          <rect x="${px + fs(8)}" y="${sy + fs(8)}" width="${fs(36)}" height="${sH - fs(16)}" rx="${fs(8)}" fill="${ta}0.15)"/>
          <text x="${px + fs(26)}" y="${sy + fs(32)}" font-family="system-ui,sans-serif" font-size="${fs(18)}" text-anchor="middle">${s.icon}</text>
          <text x="${px + fs(56)}" y="${sy + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(15)}" fill="${accentColor}">${s.step}</text>
          <text x="${px + fs(56)}" y="${sy + fs(42)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(15)}" fill="${mainColor}">${escSvg(s.val)}</text>
        `;
      }).join("")}
      <text x="${w / 2}" y="${y0 + fs(355)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${subColor}" text-anchor="middle">Zona periférica → secuencia dominante = DWI (score 5)</text>
      <rect x="${px}" y="${y0 + fs(372)}" width="${w - px * 2}" height="${fs(60)}" rx="${fs(14)}" fill="${ta}0.15)" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
      <text x="${w / 2}" y="${y0 + fs(410)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(26)}" fill="${accentColor}" text-anchor="middle">PI-RADS 5 — Muy alta probabilidad</text>
      <text x="${px}" y="${y0 + fs(442)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="${subColor}">El radiólogo puntúa, la calculadora agiliza el cálculo</text>
      <text x="${px}" y="${y0 + fs(462)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Caso ilustrativo · Radiogen.ai no emite diagnósticos; el resultado lo valida el profesional</text>`;
  } else if (contentType === "case-bosniak") {
    const y0 = centerBlock(fs(440));
    const feats = [
      { feat: "Paredes", val: "Engrosamiento irregular (&gt; 3 mm)" },
      { feat: "Septos", val: "Múltiples, gruesos, con realce" },
      { feat: "Calcificación", val: "Gruesa e irregular" },
      { feat: "Contenido", val: "Densidad heterogénea" },
      { feat: "Realce", val: "Componente sólido con realce" },
    ];
    const fH = fs(42);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.06}" cy="${h * 0.72}" r="${fs(120)}" fill="${ta}0.03)"/>
      <text x="${w - px - fs(10)}" y="${y0 + fs(80)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(140)}" fill="rgba(239,68,68,0.06)" text-anchor="end">IV</text>
      <rect x="${px}" y="${y0}" width="${fs(340)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧮 CASO CLÍNICO — BOSNIAK 2019</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Lesión quística renal 4 cm</text>
      <text x="${px}" y="${y0 + fs(106)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${subColor}">Mujer, 61 años — TC abdomen con contraste</text>
      ${feats.map((f, i) => {
        const fy = y0 + fs(130) + i * (fH + fs(4));
        return `
          <rect x="${px}" y="${fy}" width="${w - px * 2}" height="${fH}" rx="${fs(8)}" fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.1)" stroke-width="1"/>
          <rect x="${px + fs(6)}" y="${fy + fs(10)}" width="${fs(10)}" height="${fH - fs(20)}" rx="${fs(3)}" fill="rgba(239,68,68,0.3)"/>
          <text x="${px + fs(24)}" y="${fy + fs(18)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${accentColor}">${f.feat}</text>
          <text x="${px + fs(24)}" y="${fy + fs(36)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(14)}" fill="${subColor}">${f.val}</text>
        `;
      }).join("")}
      <rect x="${px}" y="${y0 + fs(360)}" width="${w - px * 2}" height="${fs(56)}" rx="${fs(14)}" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.2)" stroke-width="1.5"/>
      <text x="${w / 2}" y="${y0 + fs(394)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(24)}" fill="${isDark ? '#fca5a5' : '#dc2626'}" text-anchor="middle">Bosniak IV — Riesgo &gt; 90%</text>
      <text x="${px}" y="${y0 + fs(430)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="${subColor}">El radiólogo evalúa y la calculadora estructura el análisis</text>
      <text x="${px}" y="${y0 + fs(452)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Caso ilustrativo · Radiogen.ai asiste en el cálculo; la conducta clínica la decide el profesional</text>`;
  } else if (contentType === "case-aspects") {
    const y0 = centerBlock(fs(460));
    const regions2 = [
      { name: "C — Caudado", ok: false },
      { name: "L — Lenticular", ok: false },
      { name: "IC — Cápsula interna", ok: true },
      { name: "I — Ínsula", ok: false },
      { name: "M1 — Corteza anterior", ok: true },
      { name: "M2 — Corteza lateral", ok: true },
      { name: "M3 — Corteza posterior", ok: true },
      { name: "M4 — Anterior superior", ok: true },
      { name: "M5 — Lateral superior", ok: true },
      { name: "M6 — Posterior superior", ok: true },
    ];
    const rH = fs(33);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.06}" cy="${h * 0.72}" r="${fs(120)}" fill="${ta}0.03)"/>
      <text x="${w - px - fs(20)}" y="${y0 + fs(90)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(140)}" fill="${ta}0.06)" text-anchor="end">7</text>
      <rect x="${px}" y="${y0}" width="${fs(320)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧮 CASO CLÍNICO — ASPECTS</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Ictus ACM derecha</text>
      <text x="${px}" y="${y0 + fs(104)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${subColor}">Varón, 72 años — TC urgente sin contraste — 3h evolución</text>
      ${regions2.map((r, i) => {
        const ry = y0 + fs(122) + i * (rH + fs(2));
        const bad = !r.ok;
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${rH}" rx="${fs(5)}" fill="${bad ? 'rgba(239,68,68,0.06)' : ta + '0.03)'}" stroke="${bad ? 'rgba(239,68,68,0.12)' : ta + '0.06)'}" stroke-width="1"/>
          <rect x="${px + fs(5)}" y="${ry + fs(6)}" width="${fs(24)}" height="${rH - fs(12)}" rx="${fs(4)}" fill="${bad ? 'rgba(239,68,68,0.15)' : ta + '0.1)'}"/>
          <text x="${px + fs(17)}" y="${ry + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${bad ? (isDark ? '#fca5a5' : '#dc2626') : accentColor}" text-anchor="middle">${r.ok ? '✓' : '✗'}</text>
          <text x="${px + fs(38)}" y="${ry + fs(22)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(14)}" fill="${bad ? mainColor : subColor}">${escSvg(r.name)}</text>
          <text x="${w - px - fs(12)}" y="${ry + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(14)}" fill="${bad ? (isDark ? '#fca5a5' : '#dc2626') : accentColor}" text-anchor="end">${r.ok ? '1' : '0'}</text>
        `;
      }).join("")}
      <rect x="${px}" y="${y0 + fs(478) - fs(60)}" width="${w - px * 2}" height="${fs(54)}" rx="${fs(12)}" fill="${ta}0.15)" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
      <text x="${w / 2}" y="${y0 + fs(478) - fs(26)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(24)}" fill="${accentColor}" text-anchor="middle">ASPECTS = 7/10</text>
      <text x="${px}" y="${y0 + fs(466)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Caso ilustrativo · El radiólogo marca las regiones; Radiogen.ai suma la puntuación</text>`;
  } else if (contentType === "case-washout") {
    const y0 = centerBlock(fs(450));
    const measurements = [
      { phase: "Sin contraste", hu: "8 UH", icon: "①" },
      { phase: "Fase portal (60 s)", hu: "82 UH", icon: "②" },
      { phase: "Fase tardía (15 min)", hu: "32 UH", icon: "③" },
    ];
    const mH = fs(56);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.1}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.06}" cy="${h * 0.75}" r="${fs(120)}" fill="${ta}0.03)"/>
      <text x="${w - px - fs(10)}" y="${y0 + fs(90)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(130)}" fill="rgba(34,197,94,0.06)" text-anchor="end">67%</text>
      <rect x="${px}" y="${y0}" width="${fs(360)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧮 CASO CLÍNICO — WASHOUT ADRENAL</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Nódulo adrenal de 22 mm</text>
      <text x="${px}" y="${y0 + fs(104)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(20)}" fill="${subColor}">Varón, 58 años — TC trifásico adrenal</text>
      ${measurements.map((m, i) => {
        const my = y0 + fs(128) + i * (mH + fs(6));
        return `
          <rect x="${px}" y="${my}" width="${w - px * 2}" height="${mH}" rx="${fs(12)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
          <rect x="${px + fs(8)}" y="${my + fs(8)}" width="${fs(40)}" height="${mH - fs(16)}" rx="${fs(10)}" fill="${ta}0.15)"/>
          <text x="${px + fs(28)}" y="${my + fs(36)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(18)}" fill="${accentColor}" text-anchor="middle">${m.icon}</text>
          <text x="${px + fs(62)}" y="${my + fs(26)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(17)}" fill="${mainColor}">${m.phase}</text>
          <text x="${w - px - fs(14)}" y="${my + fs(26)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="${accentColor}" text-anchor="end">${m.hu}</text>
          <text x="${px + fs(62)}" y="${my + fs(46)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(13)}" fill="${subColor}">Medición en región de interés del nódulo</text>
        `;
      }).join("")}
      <rect x="${px}" y="${y0 + fs(320)}" width="${w - px * 2}" height="${fs(68)}" rx="${fs(12)}" fill="${ta}0.1)" stroke="${ta}0.15)" stroke-width="1"/>
      <text x="${px + fs(16)}" y="${y0 + fs(348)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${subColor}">APW = (82 − 32) / (82 − 8) × 100 = <tspan font-weight="800" fill="${accentColor}">67.6%</tspan></text>
      <text x="${px + fs(16)}" y="${y0 + fs(374)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(16)}" fill="${subColor}">RPW = (82 − 32) / 82 × 100 = <tspan font-weight="800" fill="${accentColor}">61.0%</tspan></text>
      <rect x="${px}" y="${y0 + fs(400)}" width="${w - px * 2}" height="${fs(54)}" rx="${fs(14)}" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.2)" stroke-width="1.5"/>
      <text x="${w / 2}" y="${y0 + fs(434)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="${isDark ? '#86efac' : '#16a34a'}" text-anchor="middle">✓ APW ≥ 60% → Compatible con adenoma</text>
      <text x="${px}" y="${y0 + fs(462)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Caso ilustrativo · Tú introduces las UH, la calculadora hace la fórmula</text>`;
  } else if (contentType === "case-tnm") {
    const y0 = centerBlock(fs(460));
    const tnmRows = [
      { label: "Tumor", detail: "3.2 cm, invade pleura visceral", result: "T2a", c: "rgba(251,191,36," },
      { label: "Ganglios", detail: "Sin adenopatías patológicas", result: "N0", c: "rgba(34,197,94," },
      { label: "Metástasis", detail: "Sin lesiones a distancia", result: "M0", c: "rgba(34,197,94," },
    ];
    const tnmH = fs(68);
    content = `
      <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${fs(190)}" fill="${ta}0.04)"/>
      <circle cx="${w * 0.06}" cy="${h * 0.75}" r="${fs(120)}" fill="${ta}0.03)"/>
      <text x="${w - px - fs(10)}" y="${y0 + fs(80)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(120)}" fill="${ta}0.06)" text-anchor="end">IB</text>
      <rect x="${px}" y="${y0}" width="${fs(320)}" height="${fs(32)}" rx="${fs(16)}" fill="${ta}0.15)"/>
      <text x="${px + fs(16)}" y="${y0 + fs(22)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(13)}" fill="${accentColor}">🧮 CASO CLÍNICO — TNM PULMÓN 9ª ed.</text>
      <text x="${px}" y="${y0 + fs(72)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(40)}" fill="${mainColor}">Masa pulmonar en LSD</text>
      <text x="${px}" y="${y0 + fs(106)}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(18)}" fill="${subColor}">Varón, 68 años — TC tórax con contraste — Fumador</text>
      ${tnmRows.map((r, i) => {
        const ry = y0 + fs(130) + i * (tnmH + fs(6));
        return `
          <rect x="${px}" y="${ry}" width="${w - px * 2}" height="${tnmH}" rx="${fs(12)}" fill="${ta}0.06)" stroke="${ta}0.1)" stroke-width="1"/>
          <rect x="${px + fs(8)}" y="${ry + fs(8)}" width="${fs(4)}" height="${tnmH - fs(16)}" rx="${fs(2)}" fill="${r.c}0.6)"/>
          <text x="${px + fs(22)}" y="${ry + fs(28)}" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs(16)}" fill="${accentColor}">${r.label}</text>
          <text x="${px + fs(22)}" y="${ry + fs(52)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(15)}" fill="${subColor}">${escSvg(r.detail)}</text>
          <rect x="${w - px - fs(84)}" y="${ry + fs(14)}" width="${fs(70)}" height="${tnmH - fs(28)}" rx="${fs(10)}" fill="${r.c}0.15)" stroke="${r.c}0.25)" stroke-width="1"/>
          <text x="${w - px - fs(49)}" y="${ry + fs(44)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(22)}" fill="${r.c}0.9)" text-anchor="middle">${r.result}</text>
        `;
      }).join("")}
      <rect x="${px}" y="${y0 + fs(360)}" width="${w - px * 2}" height="${fs(60)}" rx="${fs(14)}" fill="${ta}0.15)" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
      <text x="${px + fs(16)}" y="${y0 + fs(380)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(14)}" fill="${subColor}">T2a N0 M0 →</text>
      <text x="${px + fs(16)}" y="${y0 + fs(406)}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs(26)}" fill="${accentColor}">Estadio IB — Supervivencia a 5 años: 68%</text>
      <line x1="${px}" y1="${y0 + fs(430)}" x2="${px + fs(60)}" y2="${y0 + fs(430)}" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
      <text x="${px}" y="${y0 + fs(452)}" font-family="system-ui,sans-serif" font-weight="500" font-size="${fs(17)}" fill="${subColor}">Tú describes los hallazgos, la calculadora clasifica el estadio</text>
      <text x="${px}" y="${y0 + fs(472)}" font-family="system-ui,sans-serif" font-weight="400" font-size="${fs(12)}" fill="${ta}0.3)">Fuente: IASLC TNM 9th Ed. 2024 · Caso ilustrativo; la estadificación definitiva es responsabilidad del clínico</text>`;

  } else {
    content = `<text x="${w/2}" y="${h/2}" font-family="system-ui,sans-serif" font-weight="600" font-size="${fs(32)}" fill="${mainColor}" text-anchor="middle">Radiogen.ai</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${bgSvg}
    ${decor}
    ${content}
    ${logoSmall}
  </svg>`;
}

const PUB_TYPES = new Set(["feature","stats","quote","tip","launch","comparison","workflow","cta","tpl-overview","tpl-custom","tpl-regions","tpl-normality","rec-overview","rec-evidence","rec-hospital","calc-overview","calc-tirads","calc-pirads","calc-bosniak","calc-copy","calc-all","guides-all","carousel-tirads","carousel-incidental","infographic-process","time-comparison","dyk-errors","dyk-time","dyk-incidental","testimonial-metrics","before-after-report","bodymap","roi-pricing","spotlight-voice","spotlight-multilang","spotlight-darkmode","spotlight-export","spotlight-teams","normality-learn","guide-fleischner","guide-adrenal","guide-bosniak","guide-lirads","guide-aorta","guide-birads","case-tirads","case-pirads","case-bosniak","case-aspects","case-washout","case-tnm"]);

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
  { name: "Indigo oscuro", hex: "#1e1b4b", usage: "Fondo principal, headers" },
  { name: "Violeta", hex: "#7c3aed", usage: "Acento primario, CTAs" },
  { name: "Violeta claro", hex: "#c4b5fd", usage: "Acento '.ai', highlights" },
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
      <button onClick={() => onCopy(label, text)} className="shrink-0 text-gray-400 hover:text-violet-500 transition-colors mt-0.5">
        {copied === label ? <CheckCheck className="h-3 w-3 text-violet-500" /> : <Copy className="h-3 w-3" />}
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
                ? "bg-violet-600 text-white"
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
              <button key={c.hex} onClick={() => copyColor(c.hex)} className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-violet-400 transition-colors text-left">
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
              <p className="text-lg font-extrabold text-gray-900 dark:text-white" style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>Radiogen<span className="text-violet-400">.ai</span></p>
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
                { trait: "Innovador", desc: "Lideramos la adopción de IA en imagen médica. Sin miedo a lo nuevo.", color: "border-violet-400 bg-violet-50 dark:bg-violet-950/20" },
                { trait: "Cercano", desc: "Hablamos de tú. Sin jerga corporativa. El radiólogo es nuestro compañero.", color: "border-amber-400 bg-amber-50 dark:bg-amber-950/20" },
                { trait: "Seguro", desc: "RGPD, trazabilidad, auditoría. La confianza clínica no se negocia.", color: "border-violet-400 bg-violet-50 dark:bg-violet-950/20" },
              ].map((t) => (
                <div key={t.trait} className={`rounded-lg border p-3 ${t.color}`}>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t.trait}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{t.desc}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20">
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
                  <div className="p-2 rounded-md bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 text-violet-800 dark:text-violet-300">✓ {p.sol}</div>
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
                <button key={s.num} onClick={() => cp(s.num, `${s.num} — ${s.desc}`)} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:border-violet-400 transition-colors">
                  <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{s.num}</p>
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
                  <Mail className="h-4 w-4 text-violet-500" />
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white">{email.label}</h3>
                </div>
                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => cp(`email-${email.label}`, `Asunto: ${email.subject}\n\n${email.body}`)}>
                  {copiedColor === `email-${email.label}` ? <CheckCheck className="h-3 w-3 text-violet-500" /> : <Copy className="h-3 w-3" />}
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
                { day: "MAR", type: "Producto", desc: "Tip de uso, funcionalidad destacada", color: "bg-violet-50 dark:bg-violet-950/20" },
                { day: "MIÉ", type: "Industria", desc: "Noticia del sector, tendencias", color: "bg-amber-50 dark:bg-amber-950/20" },
                { day: "JUE", type: "Social proof", desc: "Testimonial, caso de uso, métrica", color: "bg-violet-50 dark:bg-violet-950/20" },
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
                <button key={kw} onClick={() => cp(`kw-${kw}`, kw)} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors">
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
                <button key={d.label} onClick={() => cp(`press-${d.label}`, `${d.label}: ${d.value}`)} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:border-violet-400 transition-colors">
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
              <ImageIcon className="h-4 w-4 text-violet-500" />
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
                  <div key={asset.id} className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-violet-400 dark:hover:border-violet-600 transition-colors">
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
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-violet-300 text-[10px]">Configuradas</Badge>
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
              <Sparkles className="h-4 w-4 text-violet-500" />
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
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white"
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
                    {copied ? <CheckCheck className="h-3.5 w-3.5 text-violet-500" /> : <Copy className="h-3.5 w-3.5" />}
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
                        <Badge className={`text-[10px] shrink-0 ${asset.type === "post" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}`}>
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
