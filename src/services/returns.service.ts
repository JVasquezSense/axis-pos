import { USE_API, request, mockRequest } from "./http";

export interface CreditNoteLine {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  restocked: boolean;
}

export interface CreditNote {
  id: string;
  code: string;
  sale?: number | null;
  total: number;
  method: string;
  reason: string;
  user?: string;
  lines: CreditNoteLine[];
  createdAt: string;
}

export interface CreateCreditNotePayload {
  total: number;
  method: string;
  reason: string;
  sale?: number | null;
  lines: { productId: number; quantity: number; unitPrice: number }[];
}

export const returnsService = {
  async getAll(): Promise<CreditNote[]> {
    if (!USE_API) return mockRequest([], 300);
    return request<CreditNote[]>("/returns/");
  },
  async create(payload: CreateCreditNotePayload): Promise<CreditNote> {
    if (!USE_API) {
      return mockRequest({
        id: `nc-${Date.now()}`,
        code: `NC-${Date.now().toString().slice(-6)}`,
        total: payload.total,
        method: payload.method,
        reason: payload.reason,
        sale: payload.sale ?? null,
        lines: [],
        createdAt: new Date().toISOString(),
      } as CreditNote, 200);
    }
    return request<CreditNote>("/returns/", { method: "POST", body: JSON.stringify(payload) });
  },
};
