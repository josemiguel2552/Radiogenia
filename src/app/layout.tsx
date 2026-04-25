import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radiogen.ai — AI Radiology Reports",
  description: "AI-powered structured radiology report generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
