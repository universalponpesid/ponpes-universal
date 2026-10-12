import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { storeConfig } from "@/config/store";
import { getOrderService } from "@/infrastructure/commerce";
import { getInventoryService } from "@/infrastructure/inventory";
import { dataConfig } from "@/config/data";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReconcileRequest = { apply?: boolean };

async function auditInventoryBalances(tenantId: string) {
  const provider = new GoogleSheetsDataProvider();
  const [variantRows, reservationRows] = await Promise.all([
    provider.getRows(dataConfig.sheets.productVariants),
    provider.getRows(dataConfig.sheets.reservations),
  ]);
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");
  const objects = (rows: readonly (readonly string[])[]) => {
    if (!rows.length) return [] as Record<string, string>[];
    const headers = rows[0].map(normalize);
    return rows.slice(1).map((row) => {
      const value: Record<string, string> = {};
      headers.forEach((header, index) => { value[header] = row[index] ?? ""; });
      return value;
    });
  };
  const number = (value: string | undefined) => {
    const parsed = Number((value ?? "0").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const reservations = objects(reservationRows).filter((row) => row.tenant_id === tenantId);
  const variants = objects(variantRows).filter((row) => row.tenant_id === tenantId && row.id);
  const issues: Array<{ variantId: string; productId: string; onHand: number; storedReserved: number; expectedReserved: number; difference: number; expiredActiveReservations: number; reason: string }> = [];
  for (const variant of variants) {
    const matching = reservations.filter((reservation) => reservation.variant_id === variant.id && reservation.product_id === variant.product_id);
    const active = matching.filter((reservation) => reservation.status === "active");
    const expectedReserved = active.reduce((sum, reservation) => sum + number(reservation.qty), 0);
    const storedReserved = number(variant.reserved_stock);
    const onHand = number(variant.stock);
    const expiredActiveReservations = active.filter((reservation) => Date.parse(reservation.expires_at ?? "") <= Date.now()).length;
    if (storedReserved !== expectedReserved || expiredActiveReservations > 0 || storedReserved > onHand || storedReserved < 0 || onHand < 0) {
      const reasons: string[] = [];
      if (storedReserved !== expectedReserved) reasons.push("reserved_stock tidak sama dengan total reservation aktif");
      if (expiredActiveReservations > 0) reasons.push("terdapat reservation aktif yang sudah kedaluwarsa");
      if (storedReserved > onHand) reasons.push("reserved_stock melebihi stok fisik");
      if (storedReserved < 0 || onHand < 0) reasons.push("nilai stok negatif");
      issues.push({ variantId: variant.id ?? "", productId: variant.product_id ?? "", onHand, storedReserved, expectedReserved, difference: storedReserved - expectedReserved, expiredActiveReservations, reason: reasons.join("; ") });
    }
  }
  const orphanReservations = reservations.filter((reservation) => reservation.status === "active" && !variants.some((variant) => variant.id === reservation.variant_id && variant.product_id === reservation.product_id)).map((reservation) => ({ reservationId: reservation.id ?? "", variantId: reservation.variant_id ?? "", productId: reservation.product_id ?? "", quantity: number(reservation.qty), reason: "Reservation aktif tidak memiliki varian inventory yang cocok." }));
  return { variantsChecked: variants.length, reservationRowsChecked: reservations.length, issueCount: issues.length + orphanReservations.length, issues, orphanReservations, note: "Audit-only: aggregate stock counter tidak diubah otomatis karena Google Sheets tidak mendukung compare-and-set atau transaksi atomik." };
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_OPERATIONS_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  if (!expected || !authorization.startsWith("Bearer ")) return false;
  const received = authorization.slice(7).trim();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Protected, dry-run-first inventory reconciliation. Google Sheets is not a
 * transactional database; only safe active-reservation commit/release repairs
 * are automated. Missing or contradictory terminal reservations are reported.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as ReconcileRequest;
    const apply = body.apply === true;
    const [orders, inventoryService] = await Promise.all([
      getOrderService().listByTenant({ tenantId: storeConfig.tenantId }),
      Promise.resolve(getInventoryService()),
    ]);

    const issues: Array<{
      orderId: string;
      reservationId: string;
      reservationStatus: string;
      paymentStatus: string;
      expectedAction: "commit" | "release" | "manual_review";
      result: "reported" | "repaired" | "repair_failed";
      detail?: string;
    }> = [];

    for (const order of orders) {
      for (const item of order.items) {
        if (!item.reservationId) continue;
        const reservation = await inventoryService.getReservation({
          tenantId: storeConfig.tenantId,
          reservationId: item.reservationId,
        });
        if (!reservation) {
          issues.push({
            orderId: order.id,
            reservationId: item.reservationId,
            reservationStatus: "missing",
            paymentStatus: order.payment.status,
            expectedAction: "manual_review",
            result: "reported",
            detail: "Reservation tidak ditemukan; tidak ada perubahan otomatis.",
          });
          continue;
        }

        const shouldCommit = order.payment.status === "paid";
        const terminalUnpaid =
          order.payment.status === "failed" ||
          order.payment.status === "expired" ||
          order.payment.status === "refunded" ||
          order.status === "cancelled" ||
          order.status === "expired";
        const reservationExpired = Date.parse(reservation.expiresAt) <= Date.now();
        const stalePendingOrder =
          order.status === "pending_payment" &&
          order.payment.status === "pending" &&
          reservationExpired;
        const verificationNeedsReview =
          order.payment.status === "verification" && reservationExpired;
        if (verificationNeedsReview && reservation.status === "active") {
          issues.push({
            orderId: order.id,
            reservationId: reservation.id,
            reservationStatus: reservation.status,
            paymentStatus: order.payment.status,
            expectedAction: "manual_review",
            result: "reported",
            detail: "Konfirmasi manual menunggu pemeriksaan sementara reservasi telah kedaluwarsa. Verifikasi dana dan stok sebelum tindakan.",
          });
          continue;
        }
        const shouldRelease = terminalUnpaid || stalePendingOrder;
        const expectedAction: "commit" | "release" | null =
          shouldCommit ? "commit" : shouldRelease ? "release" : null;
        if (!expectedAction || reservation.status === "committed" && shouldCommit || reservation.status === "released" && shouldRelease || reservation.status !== "active") {
          if (expectedAction && ((shouldCommit && reservation.status === "released") || (shouldRelease && reservation.status === "committed"))) {
            issues.push({
              orderId: order.id,
              reservationId: reservation.id,
              reservationStatus: reservation.status,
              paymentStatus: order.payment.status,
              expectedAction: "manual_review",
              result: "reported",
              detail: "Status reservation berlawanan dengan status pembayaran; perlu audit manual.",
            });
          }
          continue;
        }

        const issue = {
          orderId: order.id,
          reservationId: reservation.id,
          reservationStatus: reservation.status,
          paymentStatus: order.payment.status,
          expectedAction,
          result: "reported" as "reported" | "repaired" | "repair_failed",
          detail: apply ? undefined : "Dry-run: belum ada perubahan. Kirim apply=true untuk memperbaiki reservasi aktif.",
        };
        if (apply) {
          try {
            if (expectedAction === "commit") {
              await inventoryService.commit({ tenantId: storeConfig.tenantId, reservationId: reservation.id });
            } else {
              await inventoryService.release({ tenantId: storeConfig.tenantId, reservationId: reservation.id });
            }
            issue.result = "repaired";
          } catch (error) {
            issue.result = "repair_failed";
            issue.detail = error instanceof Error ? error.message : "Inventory repair failed.";
          }
        }
        issues.push(issue);
      }
    }

    const stockAudit = await auditInventoryBalances(storeConfig.tenantId);

    return NextResponse.json({
      tenantId: storeConfig.tenantId,
      mode: apply ? "apply" : "dry_run",
      checkedOrders: orders.length,
      issueCount: issues.length,
      issues,
      stockAudit,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Inventory reconciliation failed.",
    }, { status: 500 });
  }
}
