export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUnsyncedOrders, markSynced } from "@/lib/whatsapp-orders";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "demo-burger";
  const orders = getUnsyncedOrders(slug);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  try {
    const { slug, orderId } = await req.json();
    markSynced(slug ?? "demo-burger", orderId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
