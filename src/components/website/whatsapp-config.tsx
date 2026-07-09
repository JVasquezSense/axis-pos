"use client";

import { useState } from "react";
import { MessageCircle, Eye, EyeOff, Save, TestTube, Webhook, Key, Phone, Bot } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import { useAppStore } from "@/store/app.store";
import { useMenuStore } from "@/store/menu.store";
import { WhatsAppSimulator } from "./whatsapp-simulator";

export function WhatsAppBotSection() {
  const config = useWhatsAppStore((s) => s.config);
  const updateConfig = useWhatsAppStore((s) => s.updateConfig);
  const restaurant = useAppStore((s) => s.restaurant);
  const products = useMenuStore((s) => s.products);
  const categories = useMenuStore((s) => s.categories);

  const [showToken, setShowToken] = useState(false);
  const [showGlmKey, setShowGlmKey] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasTwilio = !!(config.twilioSid && config.twilioToken && config.twilioWhatsappNumber);
  const hasGlm = !!(config.glmApiKey);
  const isReady = hasTwilio && hasGlm;

  const [origin, setOrigin] = useState("");
  if (typeof window !== "undefined" && !origin) {
    setOrigin(window.location.origin);
  }
  const webhookUrl = `${origin || "https://tu-dominio.com"}/api/whatsapp/webhook`;

  const buildMenuText = () =>
    categories
      .map((cat) => {
        const items = products
          .filter((p) => p.category === cat.id && p.available)
          .map((p) => `  - ${p.name}: $${p.price.toLocaleString("es-CO")}${p.description ? ` (${p.description})` : ""}`)
          .join("\n");
        return items ? `📂 ${cat.name}\n${items}` : null;
      })
      .filter(Boolean)
      .join("\n\n");

  const saveToServer = async () => {
    setSaving(true);
    try {
      const payload = JSON.stringify({
        slug: restaurant.slug,
        ...config,
        restaurantName: restaurant.name,
        menu: buildMenuText(),
      });
      const headers = { "Content-Type": "application/json" };
      await Promise.all([
        fetch("/api/whatsapp/config", { method: "POST", headers, body: payload }),
        fetch("/api/whatsapp/webhook", { method: "POST", headers, body: payload }),
      ]);
      toast.success("Configuración y menú sincronizados");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp Bot
            {config.enabled ? (
              <Badge variant="success" className="ml-auto">Activo</Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto">Inactivo</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Chatbot inteligente que toma pedidos por WhatsApp usando IA. Los pedidos entran directo al POS.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle principal */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Activar bot de WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                {isReady
                  ? "Configuración completa — listo para recibir mensajes"
                  : "Configura Twilio y GLM primero"}
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => updateConfig({ enabled: v })}
              disabled={!isReady}
            />
          </div>

          {/* Twilio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Twilio WhatsApp</p>
              {hasTwilio ? (
                <Badge variant="success" className="text-[10px]">Configurado</Badge>
              ) : (
                <Badge variant="warning" className="text-[10px]">Pendiente</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Account SID</label>
                <Input
                  value={config.twilioSid}
                  onChange={(e) => updateConfig({ twilioSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Auth Token</label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={config.twilioToken}
                    onChange={(e) => updateConfig({ twilioToken: e.target.value })}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Número WhatsApp (formato Twilio)</label>
              <Input
                value={config.twilioWhatsappNumber}
                onChange={(e) => updateConfig({ twilioWhatsappNumber: e.target.value })}
                placeholder="whatsapp:+14155238886"
                className="font-mono text-xs"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Usa el sandbox de Twilio para pruebas: whatsapp:+14155238886
              </p>
            </div>
          </div>

          {/* GLM / IA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              <p className="text-sm font-medium">Inteligencia Artificial (GLM)</p>
              {hasGlm ? (
                <Badge variant="success" className="text-[10px]">Configurado</Badge>
              ) : (
                <Badge variant="warning" className="text-[10px]">Pendiente</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">GLM API Key</label>
                <div className="relative">
                  <Input
                    type={showGlmKey ? "text" : "password"}
                    value={config.glmApiKey}
                    onChange={(e) => updateConfig({ glmApiKey: e.target.value })}
                    placeholder="xxxxxxxx.xxxxxxxxxxxx"
                    className="pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGlmKey(!showGlmKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGlmKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Modelo</label>
                <Input
                  value={config.glmModel}
                  onChange={(e) => updateConfig({ glmModel: e.target.value })}
                  placeholder="glm-4.5-flash"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">URL base de la API</label>
              <Input
                value={config.glmBaseUrl}
                onChange={(e) => updateConfig({ glmBaseUrl: e.target.value })}
                placeholder="https://open.bigmodel.cn/api/paas/v4"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Saludo personalizado */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensaje de bienvenida</label>
            <textarea
              value={config.greeting}
              onChange={(e) => updateConfig({ greeting: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
              placeholder="¡Hola! 👋 Bienvenido a {restaurant}..."
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Usa {"{restaurant}"} para insertar el nombre del restaurante automáticamente.
            </p>
          </div>

          {/* Webhook URL */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Webhook URL (configurar en Twilio)</p>
            </div>
            <code className="block break-all rounded bg-background px-2 py-1.5 text-xs text-muted-foreground">
              {webhookUrl}
            </code>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              En Twilio Console → Messaging → Settings → WhatsApp Sandbox → pega esta URL como webhook para mensajes entrantes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveToServer} disabled={saving} size="sm">
              <Save className="mr-1 h-3.5 w-3.5" />
              {saving ? "Guardando..." : "Guardar configuración"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
            >
              <TestTube className="mr-1 h-3.5 w-3.5" />
              {showSimulator ? "Ocultar simulador" : "Probar bot"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simulador */}
      {showSimulator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-4 w-4" /> Simulador de WhatsApp
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prueba el bot sin necesitar una cuenta Twilio. Usa el menú real de tu restaurante.
            </p>
          </CardHeader>
          <CardContent>
            <WhatsAppSimulator />
          </CardContent>
        </Card>
      )}
    </>
  );
}
