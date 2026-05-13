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
} from "lucide-react";

type SubTab = "posts" | "images" | "library";
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
                      <option value="black-forest-labs/FLUX.1-pro">Flux Pro (mejor, $0.028)</option>
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
