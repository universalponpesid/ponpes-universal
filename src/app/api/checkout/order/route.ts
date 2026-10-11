import { NextResponse } from "next/server";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

import { storeConfig } from "@/config/store";
import type { Cart } from "@/core/cart";
import type { OrderCustomer, PaymentMethod } from "@/core/commerce/order-types";
import { getCartService } from "@/core/cart";
import { getOrderService } from "@/infrastructure/commerce";
import { getTenantShippingService } from "@/infrastructure/shipping";

type RequestBody = {
  cart?: Cart;
  customer?: OrderCustomer;
  idempotencyKey?: string;
  reservationTtlMinutes?: number;
  paymentMethod?: PaymentMethod;
  shipping?: {
    destinationPostalCode?: string;
    destinationAreaId?: string;
    province?: string;
    city?: string;
    district?: string;
    subdistrict?: string;
    addressLine?: string;
    recipientNote?: string;
    latitude?: number;
    longitude?: number;
    rateId?: string;
  };
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function stringField(record: UnknownRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function numberField(record: UnknownRecord, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    const numberValue =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;

    if (Number.isFinite(numberValue) && numberValue >= 0) return numberValue;
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    assertSingleStoreMode("order");
    const body = (await request.json()) as RequestBody;

    if (
      !body.cart ||
      !Array.isArray(body.cart.items) ||
      body.cart.tenantId !== storeConfig.tenantId
    ) {
      return NextResponse.json({ error: "Keranjang checkout tidak valid." }, { status: 400 });
    }

    if (
      !body.customer ||
      typeof body.customer.name !== "string" ||
      typeof body.customer.phone !== "string" ||
      !body.idempotencyKey ||
      typeof body.idempotencyKey !== "string"
    ) {
      return NextResponse.json(
        { error: "Data pelanggan dan idempotency key wajib diisi." },
        { status: 400 },
      );
    }

    const destinationPostalCode = body.shipping?.destinationPostalCode?.trim();
    const rateId = body.shipping?.rateId?.trim();

    const addressLine = body.shipping?.addressLine?.trim();
    const district = body.shipping?.district?.trim();
    if (!destinationPostalCode || !rateId || !addressLine || !district) {
      return NextResponse.json(
        { error: "Alamat jalan, kecamatan, kode pos, dan layanan pengiriman wajib diisi." },
        { status: 400 },
      );
    }

    // Resolve catalog prices on the server before asking the shipping provider.
    const resolvedCart = await getCartService().resolveCart(body.cart);
    if (resolvedCart.items.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada produk aktif yang dapat di-checkout." },
        { status: 409 },
      );
    }

    const trustedCart: Cart = {
      ...body.cart,
      tenantId: storeConfig.tenantId,
      currency: "IDR",
      items: resolvedCart.items.map((item) => ({
        id: item.id,
        tenantId: storeConfig.tenantId,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantLabel: item.variantLabel,
        sku: item.sku,
        imagePublicId: item.imagePublicId,
        unitPriceSnapshot: item.unitPrice,
        quantity: item.quantity,
      })),
    };

    // Requote server-side. Never accept the shipping amount from the browser.
    const shippingService = await getTenantShippingService(storeConfig.tenantId);
    const rates = await shippingService.quote({
      tenantId: storeConfig.tenantId,
      cart: trustedCart,
      destinationPostalCode,
      destinationAreaId: body.shipping?.destinationAreaId,
      courierCodes: ["jne", "jnt", "sicepat"],
    });

    const selectedRate = (rates as readonly unknown[]).find((candidate) => {
      const record = asRecord(candidate);
      return record !== null &&
        stringField(record, ["id", "rateId", "rate_id"]) === rateId;
    });

    const rateRecord = asRecord(selectedRate);
    if (!rateRecord) {
      return NextResponse.json(
        { error: "Layanan pengiriman sudah tidak tersedia. Silakan pilih ulang." },
        { status: 409 },
      );
    }

    const shippingCost = numberField(rateRecord, [
      "cost",
      "price",
      "shippingCost",
      "shipping_cost",
      "totalCost",
      "total_cost",
    ]);

    if (shippingCost === undefined || !Number.isSafeInteger(shippingCost)) {
      return NextResponse.json(
        { error: "Biaya dari layanan pengiriman tidak valid." },
        { status: 502 },
      );
    }

    const paymentMethod: PaymentMethod =
      body.paymentMethod === "manual_bank_transfer" ||
      body.paymentMethod === "manual_qris"
        ? body.paymentMethod
        : "midtrans";

    const order = await getOrderService().createPendingOrder({
      tenantId: storeConfig.tenantId,
      cart: trustedCart,
      customer: body.customer,
      idempotencyKey: body.idempotencyKey,
      reservationTtlMinutes: body.reservationTtlMinutes,
      shipping: {
        destinationPostalCode,
        destinationAreaId: body.shipping?.destinationAreaId?.trim() || undefined,
        addressLine,
        province: body.shipping?.province?.trim() || undefined,
        city: body.shipping?.city?.trim() || undefined,
        district,
        subdistrict: body.shipping?.subdistrict?.trim() || undefined,
        recipientNote: body.shipping?.recipientNote?.trim() || undefined,
        latitude: typeof body.shipping?.latitude === "number" && Number.isFinite(body.shipping.latitude) ? body.shipping.latitude : undefined,
        longitude: typeof body.shipping?.longitude === "number" && Number.isFinite(body.shipping.longitude) ? body.shipping.longitude : undefined,
        rateId,
        provider: stringField(rateRecord, ["provider", "courier", "courierName", "courier_name", "courierCode", "courier_code"]),
        serviceName: stringField(rateRecord, ["serviceName", "service_name", "service", "name"]),
        cost: shippingCost,
      },
      paymentMethod,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout gagal diproses.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
