"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Bot, User, Loader2, RotateCcw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { useMenuStore } from "@/store/menu.store";
import { useAppStore } from "@/store/app.store";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import { useWebStore } from "@/store/web.store";

interface SimMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function WhatsAppSimulator() {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const restaurant = useAppStore((s) => s.restaurant);
  const config = useWhatsAppStore((s) => s.config);
  const products = useMenuStore((s) => s.products);
  const categories = useMenuStore((s) => s.categories);
  const submitOrder = useWebStore((s) => s.submitOrder);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const menuText = categories
    .map((cat) => {
      const items = products
        .filter((p) => p.category === cat.id && p.available)
        .map((p) => `  - ${p.name}: $${p.price.toLocaleString("es-CO")}${p.description ? ` (${p.description})` : ""}`)
        .join("\n");
      return items ? `📂 ${cat.name}\n${items}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: SimMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          phone: "+57300000DEMO",
          restaurantName: restaurant.name,
          menu: menuText,
          greeting: config.greeting.replace("{restaurant}", restaurant.name),
          glmApiKey: config.glmApiKey || undefined,
          glmBaseUrl: config.glmBaseUrl || undefined,
          glmModel: config.glmModel || undefined,
        }),
      });

      const data = await res.json();

      const botMsg: SimMessage = {
        id: `b-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);

      if (data.order && data.order.items.length > 0) {
        toast.success("Pedido detectado por el bot", {
          description: `${data.order.items.length} producto(s) — ${formatCurrency(data.order.total)}`,
          action: {
            label: "Ver pedidos",
            onClick: () => {},
          },
        });
      }
    } catch (err) {
      const errorMsg: SimMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "Error de conexión con el servidor. Verifica tu configuración.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    setMessages([]);
    toast.success("Conversación reiniciada");
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Header estilo WhatsApp */}
      <div className="flex items-center gap-3 bg-emerald-600 px-4 py-3 text-white dark:bg-emerald-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
          {restaurant.logo}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{restaurant.name}</p>
          <p className="text-xs text-white/70">Bot WhatsApp · Simulador</p>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-[#ece5dd] p-4 dark:bg-zinc-900"
        style={{ minHeight: 320, maxHeight: 420 }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Bot className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Simulador de WhatsApp Bot</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Escribe como si fueras un cliente pidiendo por WhatsApp. El bot usará GLM para responder con el menú real del restaurante.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "relative max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                msg.role === "user"
                  ? "rounded-tr-none bg-emerald-100 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50"
                  : "rounded-tl-none bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              )}
            >
              <div className="mb-1 flex items-center gap-1.5">
                {msg.role === "assistant" ? (
                  <Bot className="h-3 w-3 text-emerald-600" />
                ) : (
                  <User className="h-3 w-3 text-emerald-700" />
                )}
                <span className="text-[10px] font-medium opacity-60">
                  {msg.role === "assistant" ? "Bot" : "Tú"}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className="mt-1 text-right text-[10px] opacity-40">
                {new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg rounded-tl-none bg-white px-4 py-3 shadow-sm dark:bg-zinc-800">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-xs text-muted-foreground">Escribiendo...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border bg-background p-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Escribe un mensaje..."
          disabled={loading}
          className="flex-1"
        />
        <Button size="sm" onClick={sendMessage} disabled={!input.trim() || loading} className="h-9 w-9 p-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
