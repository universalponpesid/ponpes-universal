import "server-only";

import { dataConfig } from "@/config/data";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers";
import { SheetsProductRepository } from "./sheets/product-repository";
import type { ProductRepository } from "./product-repository";

let productRepository: ProductRepository | null = null;

export function getProductRepository(): ProductRepository {
  if (productRepository) {
    return productRepository;
  }

  if (dataConfig.provider === "google-sheets") {
    productRepository = new SheetsProductRepository(
      new GoogleSheetsDataProvider(),
    );

    return productRepository;
  }

  throw new Error(
    `Unsupported data provider: ${dataConfig.provider}`,
  );
}
