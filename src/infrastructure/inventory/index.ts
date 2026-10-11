import "server-only";

import { InventoryService } from "@/core/inventory";
import { SheetsInventoryRepository } from "@/infrastructure/repositories/sheets/inventory-repository";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers";

let inventoryService: InventoryService | null = null;

/**
 * Current Google Sheets development composition root.
 * Inventory remains behind the InventoryRepository seam.
 */
export function getInventoryService(): InventoryService {
  if (inventoryService) return inventoryService;

  inventoryService = new InventoryService(new SheetsInventoryRepository(new GoogleSheetsDataProvider()));
  return inventoryService;
}
