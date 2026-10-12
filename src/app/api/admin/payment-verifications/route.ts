import { NextResponse } from "next/server";
import { storeConfig } from "@/config/store";
import { isAdminRequest } from "@/infrastructure/admin/auth";
import { getOrderService } from "@/infrastructure/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const orders = await getOrderService().listByTenant({ tenantId: storeConfig.tenantId });
    const queue = orders
      .filter((order) => order.payment.status === "verification" && (order.payment.method === "manual_bank_transfer" || order.payment.method === "manual_qris"))
      .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      .map((order) => ({
        id: order.id,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: order.customer,
        items: order.items.map((item) => ({ name: item.productName, variant: item.variantLabel, quantity: item.quantity, subtotal: item.subtotal })),
        subtotal: order.subtotal,
        shippingCost: order.shipping.cost,
        grandTotal: order.grandTotal,
        payment: order.payment,
        shipping: { city: order.shipping.city, district: order.shipping.district, subdistrict: order.shipping.subdistrict, addressLine: order.shipping.addressLine },
      }));
    return NextResponse.json({ tenantId: storeConfig.tenantId, queue, count: queue.length, adminName: process.env.ADMIN_OPERATIONS_NAME?.trim() || "Admin Operasional" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat antrean pembayaran." }, { status: 500 });
  }
}
