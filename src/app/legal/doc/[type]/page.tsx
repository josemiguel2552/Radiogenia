"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useUIPrefs, type UILanguage } from "@/lib/ui-prefs";
import { LEGAL_DOCS, type LegalDocType, LEGAL_DOC_TYPES } from "@/lib/legal-docs";

export default function LegalDocPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const { prefs } = useUIPrefs();
  const lang: UILanguage = prefs.uiLanguage || "es";

  const docType = type as LegalDocType;
  if (!LEGAL_DOC_TYPES.includes(docType)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Document not found.</p>
      </div>
    );
  }

  const doc = LEGAL_DOCS[lang]?.[docType] || LEGAL_DOCS["es"][docType];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo size="md" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{doc.title}</h1>
        <p className="text-sm text-gray-400 mb-10">{doc.updated}</p>

        <div className="space-y-8 leading-relaxed text-sm">
          {doc.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{section.title}</h2>
              <div className="space-y-2">
                {section.content.map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Radiogen.AI
        </div>
      </div>
    </div>
  );
}
