import "server-only";

import { getCatalogService } from "@/core/catalog";
import { getInventoryService } from "@/infrastructure/inventory";
import { CartService } from "./service";

let cartService: CartService | null = null;

export function getCartService(): CartService {
  if (cartService) return cartService;

  cartService = new CartService(getCatalogService(), getInventoryService());
  return cartService;
}
