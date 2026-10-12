import { NextResponse } from "next/server";
import { clearAdminCookie, isSameOriginRequest } from "@/infrastructure/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  clearAdminCookie(response);
  return response;
}
