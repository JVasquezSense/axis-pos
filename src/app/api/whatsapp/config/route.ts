/**
 * API para gestionar config de WhatsApp por tenant (server-side).
 * En demo mode guarda en memoria; en prod iría a DB.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

interface TenantConfig {
  twilioSid: string;
  twilioToken: string;
  twilioWhatsappNumber: string;
  glmApiKey: string;
  glmModel: string;
  glmBaseUrl: string;
  enabled: boolean;
  greeting: string;
}

const tenantConfigs = new Map<string, TenantConfig>();

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "demo-burger";
  const config = tenantConfigs.get(slug);
  if (!config) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    enabled: config.enabled,
    hasTwilio: !!(config.twilioSid && config.twilioToken && config.twilioWhatsappNumber),
    hasGlm: !!config.glmApiKey,
    whatsappNumber: config.twilioWhatsappNumber,
  });
}

export async function POST(req: NextRequest) {
  let body: { slug?: string } & Partial<TenantConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = body.slug ?? "demo-burger";
  const existing = tenantConfigs.get(slug) ?? {
    twilioSid: "",
    twilioToken: "",
    twilioWhatsappNumber: "",
    glmApiKey: "",
    glmModel: "glm-4.5-flash",
    glmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    enabled: false,
    greeting: "",
  };

  const updated = { ...existing, ...body };
  delete (updated as Record<string, unknown>).slug;
  tenantConfigs.set(slug, updated as TenantConfig);

  return NextResponse.json({ ok: true, slug });
}
