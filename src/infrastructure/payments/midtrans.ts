
import "server-only";

import type { Order } from "@/core/commerce";

type MidtransSnapResponse = {
  token?: string;
  error_messages?: string[];
};

type MidtransItemDetail = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

export class MidtransProvider {
  constructor(
    private readonly serverKey: string,
    private readonly environment: "sandbox" | "production",
  ) {}

  async createSnapToken(order: Order): Promise<string> {
    if (!this.serverKey.trim()) {
      throw new Error("Midtrans Server Key belum dikonfigurasi.");
    }

    if (!Number.isSafeInteger(order.grandTotal) || order.grandTotal <= 0) {
      throw new Error("Total order tidak valid untuk pembayaran Midtrans.");
    }

    const itemDetails: MidtransItemDetail[] = order.items.map((item) => {
      if (
        !Number.isSafeInteger(item.unitPrice) ||
        item.unitPrice < 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error(
          `Harga atau kuantitas produk "${item.productName}" tidak valid.`,
        );
      }

      return {
        id: item.variantId ?? item.productId,
        price: item.unitPrice,
        quantity: item.quantity,
        name: item.productName.slice(0, 50),
      };
    });

    if (order.shipping.cost > 0) {
      if (
        !Number.isSafeInteger(order.shipping.cost) ||
        order.shipping.cost < 0
      ) {
        throw new Error("Biaya pengiriman tidak valid.");
      }

      itemDetails.push({
        id: "shipping",
        price: order.shipping.cost,
        quantity: 1,
        name: "Ongkos kirim",
      });
    }

    const itemDetailsTotal = itemDetails.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    if (itemDetailsTotal !== order.grandTotal) {
      throw new Error(
        [
          "Total transaksi Midtrans tidak cocok.",
          `Grand total order: Rp${order.grandTotal}.`,
          `Total item dan ongkir: Rp${itemDetailsTotal}.`,
          "Periksa subtotal, harga item, kuantitas, dan ongkir pada order.",
        ].join(" "),
      );
    }

    const baseUrl =
      this.environment === "production"
        ? "https://app.midtrans.com"
        : "https://app.sandbox.midtrans.com";

    const authorization = Buffer.from(`${this.serverKey}:`).toString(
      "base64",
    );

    const response = await fetch(
      `${baseUrl}/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${authorization}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: order.id,
            gross_amount: order.grandTotal,
          },
          item_details: itemDetails,
          customer_details: {
            first_name: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
          },
        }),
        cache: "no-store",
      },
    );

    const body = (await response.json()) as MidtransSnapResponse;

    if (!response.ok || !body.token) {
      throw new Error(
        body.error_messages?.join(", ") ??
          "Midtrans gagal membuat Snap token.",
      );
    }

    return body.token;
  }
}
