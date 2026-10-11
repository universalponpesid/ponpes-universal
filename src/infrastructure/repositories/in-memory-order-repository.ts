import type {
  Order,
  UpdatePaymentInput,
} from "@/core/commerce/order-types";
import type {
  OrderRepository,
} from "@/core/commerce/order-repository";

export class InMemoryOrderRepository
  implements OrderRepository
{
  private readonly orders = new Map<string, Order>();

  async create(order: Order): Promise<Order> {
    this.orders.set(order.id, order);

    return order;
  }

  async getById(input: {
    tenantId: string;
    orderId: string;
  }): Promise<Order | null> {
    const order = this.orders.get(input.orderId);

    if (!order) {
      return null;
    }

    if (order.tenantId !== input.tenantId) {
      return null;
    }

    return order;
  }

  async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<Order> {
    const existing = this.orders.get(input.orderId);

    if (!existing) {
      throw new Error("Order not found.");
    }

    if (existing.tenantId !== input.tenantId) {
      throw new Error("Order not found.");
    }

    const updated: Order = {
      ...existing,
      payment: {
        ...existing.payment,
        status: input.status,
        providerReference:
          input.providerReference ??
          existing.payment.providerReference,
        transactionId:
          input.transactionId ??
          existing.payment.transactionId,
        paidAt:
          input.paidAt ??
          existing.payment.paidAt,
      },
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(updated.id, updated);

    return updated;
  }

  async updateStatus(input: {
    tenantId: string;
    orderId: string;
    status: Order["status"];
  }): Promise<Order> {
    const existing = this.orders.get(input.orderId);

    if (!existing) {
      throw new Error("Order not found.");
    }

    if (existing.tenantId !== input.tenantId) {
      throw new Error("Order not found.");
    }

    const updated: Order = {
      ...existing,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(updated.id, updated);

    return updated;
  }

  async listByTenant(input: {
    tenantId: string;
  }): Promise<readonly Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.tenantId === input.tenantId,
    );
  }
}