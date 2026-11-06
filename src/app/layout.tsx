import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@/components/analytics";
import { CookieBanner } from "@/components/cookie-banner";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://radiogen.ai"),
  title: {
    default: "Radiogen.AI — Informes radiológicos con IA",
    template: "%s | Radiogen.AI",
  },
  description:
    "Genera informes radiológicos estructurados con inteligencia artificial. Dictado por voz, +190 plantillas, aprendizaje de estilo. Para radiólogos.",
  keywords: [
    "radiología", "informes radiológicos", "IA", "inteligencia artificial",
    "radiology", "AI", "structured reporting", "dictado por voz",
    "RECIST", "plantillas radiológicas", "radiología LATAM",
  ],
  authors: [{ name: "Radiogen.AI" }],
  creator: "Radiogen.AI",
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: ["en_US", "pt_BR"],
    siteName: "Radiogen.AI",
    title: "Radiogen.AI — Informes radiológicos con IA",
    description:
      "Genera informes radiológicos estructurados con IA. Dictado por voz, +190 plantillas, aprendizaje de estilo. Gratis para empezar.",
    url: "https://radiogen.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radiogen.AI — Informes radiológicos con IA",
    description:
      "El copiloto de IA que todo radiólogo necesita. Dictado por voz → informe estructurado en segundos.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://radiogen.ai",
  },
  applicationName: "Radiogen.AI",
  // Nicer "Add to Dock"/"Add to Home Screen" on Safari (macOS/iOS), which
  // doesn't use the web manifest for these bits.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Radiogen.AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {/* Measurement loads only with consent, and never on app pages.
            It used to sit here unconditionally, which meant it ran before
            the cookie banner had rendered and on every page of the
            signed-in product. */}
        <Analytics />
        {children}
        <CookieBanner />
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 2500,
            style: { fontSize: "13px", padding: "10px 16px" },
          }}
          expand={false}
          richColors
          closeButton={false}
          offset={16}
        />
      </body>
    </html>
  );
}
