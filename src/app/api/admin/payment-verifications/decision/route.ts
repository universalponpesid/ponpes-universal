import { NextResponse } from "next/server";
import { storeConfig } from "@/config/store";
import { adminDisplayName, isAdminRequest, isSameOriginRequest } from "@/infrastructure/admin/auth";
import { getOrderService } from "@/infrastructure/commerce";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import { SheetsPaymentAdminAuditRepository } from "@/infrastructure/repositories/sheets/payment-admin-audit-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DecisionBody = { orderId?: string; decision?: "approve" | "reject"; reason?: string };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as DecisionBody;
  const orderId = body.orderId?.trim() ?? "";
  const decision = body.decision;
  const reason = body.reason?.trim() ?? "";
  if (!orderId || (decision !== "approve" && decision !== "reject") || reason.length < 5 || reason.length > 500) {
    return NextResponse.json({ error: "Order, keputusan, dan alasan minimal 5 karakter wajib diisi." }, { status: 400 });
  }

  const service = getOrderService();
  const audit = new SheetsPaymentAdminAuditRepository(new GoogleSheetsDataProvider());
  let auditId: string | undefined;
  let order;
  try {
    order = await service.getOrder(storeConfig.tenantId, orderId);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (order.payment.method !== "manual_bank_transfer" && order.payment.method !== "manual_qris") {
      return NextResponse.json({ error: "Keputusan admin hanya berlaku untuk transfer manual atau QRIS manual." }, { status: 409 });
    }
    if (order.payment.status !== "verification" || order.status !== "payment_verification") {
      return NextResponse.json({ error: "Pesanan tidak lagi berada dalam antrean verifikasi. Muat ulang antrean." }, { status: 409 });
    }
    if (decision === "reject" && reason.length < 5) return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });

    auditId = await audit.append({
      tenantId: storeConfig.tenantId,
      orderId,
      action: decision,
      previousPaymentStatus: order.payment.status,
      nextPaymentStatus: decision === "approve" ? "paid" : "failed",
      adminId: adminDisplayName(),
      reason,
      amount: order.grandTotal,
      result: "started",
    });

    if (decision === "approve") {
      order = await service.markPaymentPaid({ tenantId: storeConfig.tenantId, orderId, providerReference: `manual-admin:${adminDisplayName()}`, paidAt: new Date().toISOString() });
    } else {
      order = await service.markPaymentFailed({ tenantId: storeConfig.tenantId, orderId });
    }
    await audit.finish(auditId, "succeeded");
    return NextResponse.json({ ok: true, decision, orderId, paymentStatus: order.payment.status, orderStatus: order.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Keputusan pembayaran gagal diproses.";
    if (auditId) {
      try { await audit.finish(auditId, "failed", message); } catch { /* preserve original operation error */ }
    }
    return NextResponse.json({ error: message, auditRecorded: Boolean(auditId) }, { status: 500 });
  }
}
