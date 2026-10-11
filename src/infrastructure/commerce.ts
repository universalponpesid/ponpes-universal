
import "server-only";

import { getCartService } from "@/core/cart";
import { OrderService } from "@/core/commerce/order-service";
import type { OrderRepository } from "@/core/commerce/order-repository";
import { getInventoryService } from "@/infrastructure/inventory";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import { SheetsOrderRepository } from "@/infrastructure/repositories/sheets/order-repository";

let orderRepository: OrderRepository | null = null;

function createOrderRepository(): OrderRepository {
  const repositoryMode = process.env.ORDER_REPOSITORY
    ?.trim()
    .toLowerCase();

  if (
    repositoryMode === "memory" ||
    (repositoryMode !== undefined &&
      repositoryMode !== "" &&
      repositoryMode !== "sheets" &&
      repositoryMode !== "google-sheets")
  ) {
    throw new Error(
      'Order harus menggunakan Google Sheets. Hapus ORDER_REPOSITORY=memory dari environment, atau gunakan ORDER_REPOSITORY=google-sheets.',
    );
  }

  return new SheetsOrderRepository(
    new GoogleSheetsDataProvider(),
  );
}

export function getOrderRepository(): OrderRepository {
  if (!orderRepository) {
    orderRepository = createOrderRepository();
  }

  return orderRepository;
}

export function getOrderService(): OrderService {
  return new OrderService(
    getOrderRepository(),
    getCartService(),
    getInventoryService(),
  );
}

