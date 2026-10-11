import "server-only";

import { randomBytes } from "node:crypto";

import type { CartService } from "@/core/cart";
import type { InventoryService } from "@/core/inventory";
import type { OrderRepository } from "./order-repository";
import type {
  CreatePendingOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  UpdatePaymentInput,
} from "./order-types";

const MAX_RESERVATION_TTL_MINUTES = 60;
const DEFAULT_RESERVATION_TTL_MINUTES = 20;
const PAID_OR_FULFILLMENT_STATUSES = new Set<OrderStatus>([
  "paid",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "completed",
]);

export class OrderService {
  public constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createPendingOrder(input: CreatePendingOrderInput): Promise<Order> {
    this.validateCheckoutInput(input);

    const existing = (await this.orderRepository.listByTenant({
      tenantId: input.tenantId,
    })).find((order) => order.idempotencyKey === input.idempotencyKey);

    if (existing) return existing;

    const resolvedCart = await this.cartService.resolveCartWithAvailability(input.cart);

    if (resolvedCart.tenantId !== input.tenantId || resolvedCart.items.length === 0) {
      throw new Error("Keranjang kosong atau tidak valid.");
    }

    const orderItems: OrderItem[] = [];
    const reservations: { tenantId: string; reservationId: string }[] = [];
    const expiresAt = new Date(
      Date.now() +
        Math.min(
          MAX_RESERVATION_TTL_MINUTES,
          Math.max(5, input.reservationTtlMinutes ?? DEFAULT_RESERVATION_TTL_MINUTES),
        ) *
          60_000,
    ).toISOString();

    try {
      for (const item of resolvedCart.items) {
        const availability = item.availability;
        let reservationId: string | undefined;

        if (availability?.status === "available") {
          if (!item.variantId) {
            throw new Error(
              `Produk "${item.productName}" memiliki status stok terlacak, tetapi varian tidak valid.`,
            );
          }

          const reservation = await this.inventoryService.reserve({
            tenantId: input.tenantId,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            expiresAt,
            idempotencyKey: `${input.idempotencyKey}:${item.productId}:${item.variantId}`,
          });

          reservations.push({
            tenantId: input.tenantId,
            reservationId: reservation.id,
          });
          reservationId = reservation.id;
        } else if (availability?.status === "untracked") {
          // The tenant has not enabled/defined inventory tracking for this item.
          // It can be ordered without a reservation; the checkout UI warns the
          // customer and operator that stock is not automatically verified.
        } else {
          throw new Error(
            availability?.status === "insufficient"
              ? `Stok "${item.productName}" tidak mencukupi.`
              : availability?.status === "inactive"
                ? `Stok "${item.productName}" sedang tidak aktif.`
                : `Status stok "${item.productName}" belum dapat diverifikasi.`,
          );
        }

        orderItems.push({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          sku: item.sku,
          imagePublicId: item.imagePublicId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.lineTotal,
          reservationId,
        });
      }

      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const order: Order = {
        id: this.createOrderId(),
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        status: "pending_payment",
        currency: "IDR",
        customer: {
          name: input.customer.name.trim(),
          phone: input.customer.phone.trim(),
          email: input.customer.email?.trim() || undefined,
        },
        items: orderItems,
        subtotal,
        shipping: { ...input.shipping },
        grandTotal: subtotal + input.shipping.cost,
        payment: { method: input.paymentMethod, status: "pending" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const persisted = await this.orderRepository.create(order);

      // If another request won the idempotency race, undo this attempt's
      // reservations instead of leaking duplicate reserved stock.
      if (persisted.id !== order.id) {
        const persistedReservationIds = new Set(
          persisted.items
            .map((item) => item.reservationId)
            .filter((reservationId): reservationId is string => Boolean(reservationId)),
        );
        const reservationsToRelease = reservations.filter(
          (reservation) => !persistedReservationIds.has(reservation.reservationId),
        );
        const cleanup = await Promise.allSettled(
          reservationsToRelease.map((reservation) => this.inventoryService.release(reservation)),
        );
        if (cleanup.some((result) => result.status === "rejected")) {
          throw new Error(
            "Checkout idempoten ditemukan, tetapi reservasi duplikat gagal dilepas. Perlu rekonsiliasi inventory.",
          );
        }
      }

      return persisted;
    } catch (error) {
      const releaseResults = await Promise.allSettled(
        reservations.map((reservation) => this.inventoryService.release(reservation)),
      );

      const releaseFailed = releaseResults.some((result) => result.status === "rejected");
      if (releaseFailed) {
        throw new Error(
          "Checkout gagal dan sebagian reservasi stok tidak berhasil dilepas. Perlu rekonsiliasi inventory.",
        );
      }

      throw error;
    }
  }

  async getOrder(tenantId: string, orderId: string): Promise<Order | null> {
    return this.orderRepository.getById({ tenantId, orderId });
  }

  async listByTenant(input: { tenantId: string }): Promise<readonly Order[]> {
    return this.orderRepository.listByTenant(input);
  }

  async updatePayment(input: UpdatePaymentInput): Promise<Order> {
    return this.orderRepository.updatePayment(input);
  }

  async markPaymentVerification(input: {
    tenantId: string;
    orderId: string;
  }): Promise<Order> {
    const order = await this.getRequiredOrder(input.tenantId, input.orderId);

    if (order.payment.status === "paid" || PAID_OR_FULFILLMENT_STATUSES.has(order.status)) {
      return order;
    }

    if (
      order.status === "cancelled" ||
      order.status === "expired" ||
      order.status === "refunded" ||
      order.payment.status === "failed" ||
      order.payment.status === "expired" ||
      order.payment.status === "refunded"
    ) {
      throw new Error("Pesanan tidak dapat diajukan untuk verifikasi pembayaran.");
    }

    return this.orderRepository.updatePayment({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "verification",
      orderStatus: "payment_verification",
    });
  }

  /**
   * Called only after server-side payment verification.
   * Stock commits are retryable: if a webhook retries after the order was
   * marked paid, the service still attempts to finish any incomplete commits.
   */
  async markPaymentFailed(input: { tenantId: string; orderId: string; transactionId?: string }): Promise<Order> {
    const order = await this.getRequiredOrder(input.tenantId, input.orderId);
    if (order.payment.status === "paid" || PAID_OR_FULFILLMENT_STATUSES.has(order.status)) {
      throw new Error("Pembayaran yang sudah lunas tidak dapat ditandai gagal.");
    }
    if (order.payment.status === "failed" && order.status === "cancelled") return order;

    const updated = await this.orderRepository.updatePayment({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "failed",
      orderStatus: "cancelled",
      providerReference: order.payment.providerReference ?? order.id,
      transactionId: input.transactionId ?? order.payment.transactionId,
    });
    const releaseResults = await Promise.allSettled(
      updated.items.filter((item) => Boolean(item.reservationId)).map((item) =>
        this.inventoryService.release({ tenantId: input.tenantId, reservationId: item.reservationId as string }),
      ),
    );
    if (releaseResults.some((result) => result.status === "rejected")) {
      throw new Error("Pembayaran gagal, tetapi pelepasan sebagian reservasi stok gagal. Perlu rekonsiliasi inventory.");
    }
    return updated;
  }

  async markPaymentExpired(input: { tenantId: string; orderId: string; transactionId?: string }): Promise<Order> {
    const order = await this.getRequiredOrder(input.tenantId, input.orderId);
    if (order.payment.status === "paid" || PAID_OR_FULFILLMENT_STATUSES.has(order.status)) {
      throw new Error("Pembayaran yang sudah lunas tidak dapat ditandai kedaluwarsa.");
    }
    if (order.payment.status === "expired" && order.status === "expired") return order;

    const updated = await this.orderRepository.updatePayment({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "expired",
      orderStatus: "expired",
      providerReference: order.payment.providerReference ?? order.id,
      transactionId: input.transactionId ?? order.payment.transactionId,
    });
    const releaseResults = await Promise.allSettled(
      updated.items.filter((item) => Boolean(item.reservationId)).map((item) =>
        this.inventoryService.release({ tenantId: input.tenantId, reservationId: item.reservationId as string }),
      ),
    );
    if (releaseResults.some((result) => result.status === "rejected")) {
      throw new Error("Order kedaluwarsa, tetapi pelepasan sebagian reservasi stok gagal. Perlu rekonsiliasi inventory.");
    }
    return updated;
  }

  async markPaymentPaid(input: {
    tenantId: string;
    orderId: string;
    providerReference?: string;
    transactionId?: string;
    paidAt?: string;
  }): Promise<Order> {
    let order = await this.getRequiredOrder(input.tenantId, input.orderId);

    if (
      order.status === "cancelled" ||
      order.status === "expired" ||
      order.status === "refunded" ||
      order.payment.status === "expired" ||
      order.payment.status === "refunded"
    ) {
      throw new Error("Pesanan berstatus terminal dan tidak dapat ditandai lunas.");
    }

    if (order.payment.status !== "paid" && !PAID_OR_FULFILLMENT_STATUSES.has(order.status)) {
      order = await this.orderRepository.updatePayment({
        tenantId: input.tenantId,
        orderId: input.orderId,
        status: "paid",
        orderStatus: "paid",
        providerReference: input.providerReference,
        transactionId: input.transactionId,
        paidAt: input.paidAt ?? new Date().toISOString(),
      });
    }

    const commitResults = await Promise.allSettled(
      order.items
        .filter((item) => Boolean(item.reservationId))
        .map((item) =>
          this.inventoryService.commit({
            tenantId: input.tenantId,
            reservationId: item.reservationId as string,
          }),
        ),
    );

    if (commitResults.some((result) => result.status === "rejected")) {
      throw new Error(
        "Pembayaran terverifikasi, tetapi commit inventory belum seluruhnya selesai. Webhook perlu dicoba ulang dan inventory direkonsiliasi.",
      );
    }

    return order;
  }

  private validateCheckoutInput(input: CreatePendingOrderInput): void {
    if (!input.tenantId.trim()) throw new Error("tenantId wajib diisi.");
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 160) {
      throw new Error("idempotencyKey wajib diisi dan maksimal 160 karakter.");
    }
    if (input.cart.tenantId !== input.tenantId) {
      throw new Error("Tenant keranjang tidak sesuai.");
    }
    if (!input.customer.name.trim() || !input.customer.phone.trim()) {
      throw new Error("Nama dan nomor telepon wajib diisi.");
    }
    if (
      input.customer.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer.email)
    ) {
      throw new Error("Format email tidak valid.");
    }
    if (!input.shipping.destinationPostalCode.trim() || !input.shipping.rateId.trim()) {
      throw new Error("Alamat tujuan dan layanan pengiriman wajib dipilih.");
    }
    if (!Number.isSafeInteger(input.shipping.cost) || input.shipping.cost < 0) {
      throw new Error("Biaya pengiriman tidak valid.");
    }
  }

  private async getRequiredOrder(tenantId: string, orderId: string): Promise<Order> {
    const order = await this.getOrder(tenantId, orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    return order;
  }

  private createOrderId(): string {
    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    return `UM-${timestamp}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }
}
