export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUnsyncedOrders, markSynced, addWhatsAppOrder, type WhatsAppOrder } from "@/lib/whatsapp-orders";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "demo-burger";
  const orders = getUnsyncedOrders(slug);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = body.slug ?? "demo-burger";

    // Mark order as synced (called by admin panel after pulling order)
    if (body.orderId) {
      markSynced(slug, body.orderId);
      return NextResponse.json({ ok: true });
    }

    // Register order (called by webhook to bridge serverless isolation)
    if (body.order) {
      const o = body.order as Omit<WhatsAppOrder, "id" | "code" | "createdAt" | "receiptReceived" | "synced">;
      const saved = addWhatsAppOrder(slug, o);
      return NextResponse.json({ ok: true, id: saved.id, code: saved.code });
    }

    return NextResponse.json({ error: "orderId or order required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
