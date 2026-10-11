
import type {
  Order,
  UpdatePaymentInput,
} from "./order-types";

export type OrderRepository = {
  create(order: Order): Promise<Order>;

  getById(input: {
    tenantId: string;
    orderId: string;
  }): Promise<Order | null>;

  updatePayment(
    input: UpdatePaymentInput,
  ): Promise<Order>;

  updateStatus(input: {
    tenantId: string;
    orderId: string;
    status: Order["status"];
  }): Promise<Order>;

  listByTenant(input: {
    tenantId: string;
  }): Promise<readonly Order[]>;
};