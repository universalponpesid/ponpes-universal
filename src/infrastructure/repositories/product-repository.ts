import type {
  Product,
  ProductCategory,
  ProductVariant,
} from "@/core/catalog/types";

export interface ProductRepository {
  getProducts(input: {
    tenantId: string;
  }): Promise<readonly Product[]>;

  getProductById(input: {
    tenantId: string;
    productId: string;
  }): Promise<Product | null>;

  getProductBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<Product | null>;

  getProductVariants(input: {
    tenantId: string;
    productId: string;
  }): Promise<readonly ProductVariant[]>;

  getCategories(input: {
    tenantId: string;
  }): Promise<readonly ProductCategory[]>;

  getCategoryBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<ProductCategory | null>;
}
