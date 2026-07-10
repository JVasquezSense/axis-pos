export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { setMenuPdf, getMenuPdf, deleteMenuPdf } from "@/lib/whatsapp-menu-pdf";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "demo-burger";
  const pdf = getMenuPdf(slug);
  if (!pdf) {
    return NextResponse.json({ error: "No menu PDF configured" }, { status: 404 });
  }
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="menu-${slug}.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { slug, pdf, action } = await req.json();
    const s = slug ?? "demo-burger";
    if (action === "delete") {
      deleteMenuPdf(s);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (!pdf) {
      return NextResponse.json({ error: "pdf (base64) required" }, { status: 400 });
    }
    setMenuPdf(s, pdf);
    return NextResponse.json({ ok: true, slug: s });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
