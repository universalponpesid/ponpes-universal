import { NextResponse } from "next/server";
import { isSameOriginRequest, isValidAdminToken, setAdminCookie } from "@/infrastructure/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
  if (!process.env.ADMIN_OPERATIONS_TOKEN?.trim()) {
    return NextResponse.json({ error: "Admin belum dikonfigurasi. Isi ADMIN_OPERATIONS_TOKEN di environment server." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({})) as { token?: string };
  if (!isValidAdminToken(body.token?.trim() ?? "")) {
    return NextResponse.json({ error: "Token admin tidak valid." }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  setAdminCookie(response);
  return response;
}
