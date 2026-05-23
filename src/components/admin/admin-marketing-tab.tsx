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
  Palette,
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

function renderAndDownload(asset: BrandAsset) {
  const svg = buildLogoSvg(asset.width, asset.height, asset.logoVariant, asset.bg, asset.tagline ? { tagline: asset.tagline } : undefined);
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
  const svg = buildLogoSvg(previewW, previewH, asset.logoVariant, asset.bg, asset.tagline ? { tagline: asset.tagline } : undefined);
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

function BrandKitSection() {
  const categories = Array.from(new Set(BRAND_ASSETS.map(a => a.category)));
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {/* Color palette + typography */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Identidad de marca</h3>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Paleta de colores</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => copyColor(c.hex)}
                  className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-teal-400 transition-colors text-left"
                >
                  <div className="h-12 w-full" style={{ backgroundColor: c.hex }} />
                  <div className="p-1.5">
                    <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{c.name}</p>
                    <p className="text-[9px] font-mono text-gray-400">{copiedColor === c.hex ? "Copiado!" : c.hex}</p>
                    <p className="text-[9px] text-gray-400 truncate">{c.usage}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tipografía</p>
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
          </div>

          {/* Taglines / Copy */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Textos de marca</p>
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
                { label: "Email contacto", text: "info@radiogen.ai" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <Badge variant="secondary" className="text-[9px] shrink-0 mt-0.5">{item.label}</Badge>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 flex-1 min-w-0">{item.text}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(item.text); setCopiedColor(item.label); setTimeout(() => setCopiedColor(null), 1500); }}
                    className="shrink-0 text-gray-400 hover:text-teal-500 transition-colors"
                  >
                    {copiedColor === item.label ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets grid */}
      <Card>
        <CardContent className="p-5 space-y-5">
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
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{cat}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {BRAND_ASSETS.filter(a => a.category === cat).map(asset => (
                  <div
                    key={asset.id}
                    className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-teal-400 dark:hover:border-teal-600 transition-colors"
                  >
                    <div
                      className="relative flex items-center justify-center overflow-hidden"
                      style={{
                        height: asset.width === asset.height ? 120 : asset.height > asset.width ? 160 : 80,
                        background: asset.bg === "transparent" ? "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 0 0 / 16px 16px" : "#f3f4f6",
                      }}
                    >
                      <img
                        src={getPreviewDataUrl(asset)}
                        alt={asset.label}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{asset.label}</p>
                      <p className="text-[10px] text-gray-500">{asset.description}</p>
                      <p className="text-[10px] text-gray-400">{asset.width}×{asset.height}px</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-[11px] gap-1 mt-1"
                        onClick={() => renderAndDownload(asset)}
                      >
                        <Download className="h-3 w-3" />
                        Descargar PNG
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
      await fetch("/api/admin/marketing/assets", {
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
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleDeleteAsset(id: string) {
    await fetch("/api/admin/marketing/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAssets((prev) => prev.filter((a) => a.id !== id));
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
