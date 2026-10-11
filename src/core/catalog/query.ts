import type {
  Product,
  ProductCategory,
  ProductVariant,
} from "./types";

export type CatalogProductSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc";

export interface CatalogProductQuery {
  tenantId: string;
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  type?: Product["type"];
  sort?: CatalogProductSort;
  page?: number;
  pageSize?: number;
}

export interface CatalogPage<T> {
  items: readonly T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface CatalogProductDetail {
  product: Product;
  variants: readonly ProductVariant[];
  category: ProductCategory | null;
}
