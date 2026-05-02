"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Upload, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { ResidentVerification } from "@/lib/types";

interface Props {
  onStatusChange?: (status: string | null) => void;
}

export function ResidentVerificationForm({ onStatusChange }: Props) {
  const [verification, setVerification] = useState<ResidentVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [institutionName, setInstitutionName] = useState("");
  const [residencyStart, setResidencyStart] = useState("");
  const [residencyEnd, setResidencyEnd] = useState("");

  useEffect(() => {
    fetch("/api/resident-verification")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setVerification(data);
        onStatusChange?.(data?.status || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onStatusChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !residencyStart || !residencyEnd) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("document", file);
    formData.append("institution_name", institutionName);
    formData.append("residency_start", residencyStart);
    formData.append("residency_end", residencyEnd);

    try {
      const res = await fetch("/api/resident-verification", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar la solicitud.");
      } else {
        setVerification(data);
        setSuccess(true);
        onStatusChange?.("pending");
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
      </div>
    );
  }

  if (verification?.status === "approved") {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Verificación aprobada
              </p>
              <p className="text-xs text-gray-500">
                Tu plan de residente está activo. {verification.institution_name && `Institución: ${verification.institution_name}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verification?.status === "pending") {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Verificación en revisión
              </p>
              <p className="text-xs text-gray-500">
                Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verification?.status === "rejected") {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Verificación rechazada
              </p>
              {verification.admin_notes && (
                <p className="text-xs text-gray-500">Motivo: {verification.admin_notes}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setVerification(null)}
          >
            Enviar nueva solicitud
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Solicitud enviada
              </p>
              <p className="text-xs text-gray-500">
                Tu documento está siendo revisado. Recibirás una respuesta pronto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Verificación de residente
          </h3>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
            $4.99/mes
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Sube tu carnet de residente o carta del hospital que acredite tus fechas de residencia para acceder al plan de residente con 150 informes/mes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Documento *</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500 truncate">
                  {file ? file.name : "Carnet de residente o carta del hospital (PDF, JPG, PNG)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Institución</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="Hospital o universidad"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Inicio de residencia *</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={residencyStart}
                onChange={(e) => setResidencyStart(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Fin de residencia *</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={residencyEnd}
                onChange={(e) => setResidencyEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button
            type="submit"
            className="w-full h-9 text-xs bg-green-600 hover:bg-green-700"
            disabled={submitting || !file}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar para verificación"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
