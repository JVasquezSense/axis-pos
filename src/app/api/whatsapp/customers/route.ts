export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAllCustomers, upsertCustomer } from "@/lib/whatsapp-customers";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "demo-burger";
  const customers = getAllCustomers(slug);
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  try {
    const { slug, phone, ...data } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }
    const customer = upsertCustomer(slug ?? "demo-burger", phone, data);
    return NextResponse.json({ ok: true, customer });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
