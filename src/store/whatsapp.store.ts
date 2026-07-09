import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WhatsAppConfig {
  twilioSid: string;
  twilioToken: string;
  twilioWhatsappNumber: string;
  glmApiKey: string;
  glmModel: string;
  glmBaseUrl: string;
  enabled: boolean;
  greeting: string;
  paymentInfo: string;
  businessInfo: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  body: string;
  role: "user" | "assistant";
  timestamp: number;
}

export interface WhatsAppConversation {
  phone: string;
  name: string;
  messages: ChatMessage[];
  lastActivity: number;
  orderPlaced: boolean;
}

interface WhatsAppState {
  config: WhatsAppConfig;
  conversations: WhatsAppConversation[];
  updateConfig: (data: Partial<WhatsAppConfig>) => void;
  addMessage: (phone: string, name: string, msg: ChatMessage) => void;
  markOrderPlaced: (phone: string) => void;
  clearConversation: (phone: string) => void;
  clearAll: () => void;
}

const DEFAULT_CONFIG: WhatsAppConfig = {
  twilioSid: "",
  twilioToken: "",
  twilioWhatsappNumber: "",
  glmApiKey: "",
  glmModel: "glm-4.5-flash",
  glmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
  enabled: false,
  greeting:
    "¡Hola! 👋 Bienvenido a {restaurant}. Soy tu asistente virtual.\n\n" +
    "Puedo ayudarte a:\n" +
    "📋 Ver nuestro menú\n" +
    "🛒 Tomar tu pedido\n" +
    "❓ Responder preguntas\n\n" +
    "¿Qué te gustaría hacer?",
  paymentInfo: "",
  businessInfo: "",
};

export const useWhatsAppStore = create<WhatsAppState>()(
  persist(
    (set) => ({
      config: { ...DEFAULT_CONFIG },
      conversations: [],

      updateConfig: (data) =>
        set((s) => ({ config: { ...s.config, ...data } })),

      addMessage: (phone, name, msg) =>
        set((s) => {
          const existing = s.conversations.find((c) => c.phone === phone);
          if (existing) {
            return {
              conversations: s.conversations.map((c) =>
                c.phone === phone
                  ? { ...c, messages: [...c.messages, msg], lastActivity: Date.now(), name: name || c.name }
                  : c
              ),
            };
          }
          return {
            conversations: [
              { phone, name, messages: [msg], lastActivity: Date.now(), orderPlaced: false },
              ...s.conversations,
            ].slice(0, 50),
          };
        }),

      markOrderPlaced: (phone) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.phone === phone ? { ...c, orderPlaced: true } : c
          ),
        })),

      clearConversation: (phone) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.phone !== phone),
        })),

      clearAll: () => set({ conversations: [] }),
    }),
    {
      name: "axis-whatsapp",
      partialize: (s) => ({ config: s.config, conversations: s.conversations }),
    }
  )
);
