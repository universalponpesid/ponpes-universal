import "server-only";

import { InventoryService } from "@/core/inventory";
import type { InventoryRepository } from "@/core/inventory";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import { SheetsInventoryRepository } from "@/infrastructure/repositories/sheets/inventory-repository";

let inventoryRepository: InventoryRepository | null = null;
let inventoryService: InventoryService | null = null;

function createInventoryRepository(): InventoryRepository {
  const mode = process.env.INVENTORY_REPOSITORY?.trim().toLowerCase();

  if (mode === "memory") {
    throw new Error(
      "INVENTORY_REPOSITORY=memory is not configured. Use the Sheets repository or implement an in-memory InventoryRepository.",
    );
  }

  return new SheetsInventoryRepository(new GoogleSheetsDataProvider());
}

export function getInventoryRepository(): InventoryRepository {
  if (!inventoryRepository) {
    inventoryRepository = createInventoryRepository();
  }

  return inventoryRepository;
}

export function getInventoryService(): InventoryService {
  if (!inventoryService) {
    inventoryService = new InventoryService(getInventoryRepository());
  }

  return inventoryService;
}
