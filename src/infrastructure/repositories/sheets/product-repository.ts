import "server-only";

import type { DataProvider } from "@/infrastructure/providers";

import type {
  Product,
  ProductCategory,
  ProductVariant,
  ProductVariantOption,
} from "@/core/catalog/types";

import type { ProductRepository } from "../product-repository";

import { dataConfig } from "@/config/data";

import {
  parseCsv,
  parseJson,
  parseNumber,
  parseOptionalNumber,
  rowsToObjects,
  type SheetRow,
} from "./row-utils";

type ProductRow = SheetRow & {
  id?: string;
  tenant_id?: string;
  type?: string;
  status?: string;
  name?: string;
  slug?: string;
  short_description?: string;
  description?: string;
  category_id?: string;
  brand?: string;
  sku?: string;
  price?: string;
  compare_at_price?: string;
  weight_grams?: string;
  image_public_id?: string;
  gallery_public_ids?: string;
  tags?: string;
  seo_title?: string;
  seo_description?: string;
};

type ProductVariantRow = SheetRow & {
  id?: string;
  tenant_id?: string;
  product_id?: string;
  sku?: string;
  options_json?: string;
  price?: string;
  compare_at_price?: string;
  stock?: string;
  reserved_stock?: string;
  weight_grams?: string;
  image_public_id?: string;
  status?: string;
};

type CategoryRow = SheetRow & {
  id?: string;
  tenant_id?: string;
  name?: string;
  slug?: string;
  description?: string;
  image_public_id?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
};

const PRODUCT_TYPES = [
  "physical",
  "digital",
  "service",
  "property",
  "vehicle",
] as const;

const PRODUCT_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

const VARIANT_STATUSES = [
  "active",
  "inactive",
] as const;

const CATEGORY_STATUSES = [
  "active",
  "inactive",
] as const;

function parseProductType(value: string | undefined) {
  return PRODUCT_TYPES.includes(value as (typeof PRODUCT_TYPES)[number])
    ? (value as (typeof PRODUCT_TYPES)[number])
    : "physical";
}

function parseProductStatus(value: string | undefined) {
  return PRODUCT_STATUSES.includes(value as (typeof PRODUCT_STATUSES)[number])
    ? (value as (typeof PRODUCT_STATUSES)[number])
    : "draft";
}

function parseVariantStatus(value: string | undefined) {
  return VARIANT_STATUSES.includes(value as (typeof VARIANT_STATUSES)[number])
    ? (value as (typeof VARIANT_STATUSES)[number])
    : "active";
}

function parseCategoryStatus(value: string | undefined) {
  return CATEGORY_STATUSES.includes(value as (typeof CATEGORY_STATUSES)[number])
    ? (value as (typeof CATEGORY_STATUSES)[number])
    : "active";
}

function mapProduct(row: ProductRow): Product {
  if (!row.id || !row.name || !row.slug) {
    throw new Error("Invalid product row: id, name and slug are required.");
  }

  return {
    id: row.id,
    tenantId: row.tenant_id ?? "",
    type: parseProductType(row.type),
    status: parseProductStatus(row.status),

    name: row.name,
    slug: row.slug,

    shortDescription: row.short_description || undefined,
    description: row.description || undefined,

    categoryId: row.category_id || undefined,
    brand: row.brand || undefined,
    sku: row.sku || undefined,

    price: parseNumber(row.price),
    compareAtPrice: parseOptionalNumber(row.compare_at_price),

    weightGrams: parseOptionalNumber(row.weight_grams),

    imagePublicId: row.image_public_id || undefined,

    galleryPublicIds: parseCsv(row.gallery_public_ids),
    tags: parseCsv(row.tags),

    seo: {
      title: row.seo_title || undefined,
      description: row.seo_description || undefined,
    },
  };
}

function mapVariant(row: ProductVariantRow): ProductVariant {
  if (!row.id || !row.product_id) {
    throw new Error(
      "Invalid product variant row: id and product_id are required.",
    );
  }

  return {
    id: row.id,
    tenantId: row.tenant_id ?? "",
    productId: row.product_id,

    sku: row.sku || undefined,

    options: parseJson<ProductVariantOption[]>(
      row.options_json,
      [],
    ),

    price: parseNumber(row.price),
    compareAtPrice: parseOptionalNumber(row.compare_at_price),

    weightGrams: parseOptionalNumber(row.weight_grams),

    imagePublicId: row.image_public_id || undefined,

    status: parseVariantStatus(row.status),
  };
}

function mapCategory(row: CategoryRow): ProductCategory {
  if (!row.id || !row.name || !row.slug) {
    throw new Error(
      "Invalid category row: id, name and slug are required.",
    );
  }

  return {
    id: row.id,
    tenantId: row.tenant_id ?? "",
    name: row.name,
    slug: row.slug,

    description: row.description || undefined,

    imagePublicId: row.image_public_id || undefined,

    seo: {
      title: row.seo_title || undefined,
      description: row.seo_description || undefined,
    },

    status: parseCategoryStatus(row.status),
  };
}

export class SheetsProductRepository
  implements ProductRepository
{
  constructor(
    private readonly provider: DataProvider,
  ) {}

  async getProducts(input: {
    tenantId: string;
  }): Promise<readonly Product[]> {
    const rows = await this.provider.getRows(
      dataConfig.sheets.products,
    );

    return rowsToObjects(rows)
      .map((row) => mapProduct(row as ProductRow))
      .filter(
        (product) =>
          product.tenantId === input.tenantId &&
          product.status === "active",
      );
  }

  async getProductById(input: {
    tenantId: string;
    productId: string;
  }): Promise<Product | null> {
    const products = await this.getProducts({
      tenantId: input.tenantId,
    });

    return (
      products.find(
        (product) => product.id === input.productId,
      ) ?? null
    );
  }

  async getProductBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<Product | null> {
    const products = await this.getProducts({
      tenantId: input.tenantId,
    });

    return (
      products.find(
        (product) => product.slug === input.slug,
      ) ?? null
    );
  }

  async getProductVariants(input: {
    tenantId: string;
    productId: string;
  }): Promise<readonly ProductVariant[]> {
    const rows = await this.provider.getRows(
      dataConfig.sheets.productVariants,
    );

    return rowsToObjects(rows)
      .map((row) =>
        mapVariant(row as ProductVariantRow),
      )
      .filter(
        (variant) =>
          variant.tenantId === input.tenantId &&
          variant.productId === input.productId &&
          variant.status === "active",
      );
  }

  async getCategories(input: {
    tenantId: string;
  }): Promise<readonly ProductCategory[]> {
    const rows = await this.provider.getRows(
      dataConfig.sheets.categories,
    );

    return rowsToObjects(rows)
      .map((row) => mapCategory(row as CategoryRow))
      .filter(
        (category) =>
          category.tenantId === input.tenantId &&
          category.status === "active",
      );
  }

  async getCategoryBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<ProductCategory | null> {
    const categories = await this.getCategories({
      tenantId: input.tenantId,
    });

    return (
      categories.find((category) => category.slug === input.slug) ??
      null
    );
  }
}