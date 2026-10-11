export type ProductType =
  | "physical"
  | "digital"
  | "service"
  | "property"
  | "vehicle";

export type ProductStatus =
  | "draft"
  | "active"
  | "archived";

export type ProductVariantStatus =
  | "active"
  | "inactive";

export type CategoryStatus =
  | "active"
  | "inactive";

export interface ProductSeo {
  title?: string;
  description?: string;
}

export interface ProductVariantOption {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  tenantId: string;

  type: ProductType;
  status: ProductStatus;

  name: string;
  slug: string;

  shortDescription?: string;
  description?: string;

  categoryId?: string;

  brand?: string;
  sku?: string;

  price: number;
  compareAtPrice?: number;

  weightGrams?: number;

  imagePublicId?: string;
  galleryPublicIds: readonly string[];

  tags: readonly string[];

  seo: ProductSeo;
}

export interface ProductVariant {
  id: string;
  tenantId: string;
  productId: string;

  sku?: string;

  options: readonly ProductVariantOption[];

  price: number;
  compareAtPrice?: number;

  weightGrams?: number;

  imagePublicId?: string;

  status: ProductVariantStatus;
}

export interface ProductCategory {
  id: string;
  tenantId: string;

  name: string;
  slug: string;

  description?: string;

  imagePublicId?: string;

  seo: ProductSeo;

  status: CategoryStatus;
}