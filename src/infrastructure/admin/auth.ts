import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "um_admin_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function sessionSignature(issuedAt: string, secret: string): string {
  return createHmac("sha256", secret).update(`universal-mart-admin:${issuedAt}`).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isValidAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_OPERATIONS_TOKEN?.trim();
  return Boolean(expected && token && safeEqual(expected, token));
}

export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_OPERATIONS_TOKEN?.trim();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!expected || !cookie) return false;
  const value = cookie.slice(ADMIN_COOKIE.length + 1);
  try {
    const [issuedAt, signature, extra] = decodeURIComponent(value).split(".");
    if (!issuedAt || !signature || extra) return false;
    const timestamp = Number(issuedAt);
    const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
    if (!Number.isSafeInteger(timestamp) || ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return false;
    return safeEqual(sessionSignature(issuedAt, expected), signature);
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function setAdminCookie(response: NextResponse): void {
  const token = process.env.ADMIN_OPERATIONS_TOKEN?.trim();
  if (!token) throw new Error("ADMIN_OPERATIONS_TOKEN belum dikonfigurasi.");
  const issuedAt = String(Math.floor(Date.now() / 1000));
  const session = `${issuedAt}.${sessionSignature(issuedAt, token)}`;
  response.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
    maxAge: 0,
  });
}

export function adminDisplayName(): string {
  return process.env.ADMIN_OPERATIONS_NAME?.trim() || "Admin Operasional";
}
