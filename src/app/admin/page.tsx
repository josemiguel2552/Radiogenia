"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Shield,
  Plug,
  Users,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import { PROVIDERS } from "@/lib/types";

interface GlobalConfig {
  id: string;
  provider: string;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  report_count: number;
}

export default function AdminPage() {
  const router = useRouter();

  // Config state
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [provider, setProvider] = useState("deepseek");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [apiKey, setApiKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const selectedProvider = PROVIDERS.find((p) => p.value === provider);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (!res.ok) return;
      const data = await res.json();
      setConfig(data);
      setProvider(data.provider || "deepseek");
      setModelName(data.model_name || "deepseek-chat");
      setApiKey(data.api_key_encrypted || "");
      setCustomUrl(data.custom_base_url || "");
    } catch { /* ignore */ }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users || []);
    } catch { /* ignore */ }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    loadConfig();
    loadUsers();
  }, [loadConfig, loadUsers]);

  async function handleSave() {
    setSaving(true);
    setConfigError("");
    setConfigSuccess(false);
    try {
      const body: Record<string, string> = { provider, model_name: modelName };
      if (apiKey && apiKey !== "••••••••") body.api_key = apiKey;
      if (provider === "custom") body.custom_base_url = customUrl;
      else body.custom_base_url = "";

      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setConfigError(data.error || "Failed to save");
      } else {
        setConfigSuccess(true);
        const data = await res.json();
        setConfig(data);
        setApiKey(data.api_key_encrypted || "");
        setTimeout(() => setConfigSuccess(false), 3000);
      }
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model_name: modelName,
          api_key: apiKey === "••••••••" ? "" : apiKey,
          custom_base_url: provider === "custom" ? customUrl : "",
        }),
      });
      const data = await res.json();
      setTestResult(data.ok ?? false);
    } catch {
      setTestResult(false);
    }
    setTesting(false);
  }

  const totalReports = users.reduce((sum, u) => sum + u.report_count, 0);
  const radiologists = users.filter((u) => u.role === "radiologist");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          Radiogen.ai
        </Badge>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{radiologists.length}</p>
            <p className="text-xs text-gray-500">Radiologists</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalReports}</p>
            <p className="text-xs text-gray-500">Reports generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedProvider?.label?.split(" ")[0] || "—"}
            </p>
            <p className="text-xs text-gray-500">AI Provider</p>
          </CardContent>
        </Card>
      </div>

      {/* Global AI Configuration */}
      <Card>
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <Plug className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Global AI Configuration
          </h2>
        </div>
        <CardContent className="space-y-4 pt-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This API key and model are used for all radiologists on the platform.
          </p>

          {/* Provider */}
          <div className="space-y-1.5">
            <Label className="text-xs">Provider</Label>
            <Select value={provider} onValueChange={(v) => {
              setProvider(v);
              const prov = PROVIDERS.find((p) => p.value === v);
              if (prov && prov.models.length > 0) setModelName(prov.models[0]);
              setTestResult(null);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            {selectedProvider && selectedProvider.models.length > 0 ? (
              <Select value={modelName} onValueChange={(v) => { setModelName(v); setTestResult(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {selectedProvider.models.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                type="text"
                value={modelName}
                onChange={(e) => { setModelName(e.target.value); setTestResult(null); }}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                placeholder="Model name"
              />
            )}
          </div>

          {/* Custom URL */}
          {provider === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Custom Base URL</Label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                placeholder="https://your-endpoint.com/v1"
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                className="w-full px-3 py-2 pr-10 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                placeholder="Enter API key"
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !apiKey || apiKey === "••••••••"}
              className="gap-1.5"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : testResult === true ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : testResult === false ? (
                <X className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <Plug className="h-3.5 w-3.5" />
              )}
              Test connection
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-accent hover:bg-accent/90 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save configuration
            </Button>
          </div>

          {configError && (
            <p className="text-xs text-red-500">{configError}</p>
          )}
          {configSuccess && (
            <p className="text-xs text-green-600">Configuration saved successfully.</p>
          )}

          {config?.updated_at && (
            <p className="text-[11px] text-gray-400">
              Last updated: {new Date(config.updated_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Registered Users
          </h2>
          <Badge variant="secondary" className="ml-auto text-xs">
            {users.length}
          </Badge>
        </div>
        <CardContent className="pt-0">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No users registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Email</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Role</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Reports</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="py-2.5 px-2 text-gray-900 dark:text-white font-medium">
                        {u.name || "—"}
                      </td>
                      <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {u.role === "admin" ? (
                            <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> Admin</span>
                          ) : (
                            "Radiologist"
                          )}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="flex items-center justify-end gap-1 text-gray-600 dark:text-gray-400">
                          <FileText className="h-3 w-3" />
                          {u.report_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
