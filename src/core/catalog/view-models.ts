import type { Product, ProductCategory, ProductVariant, ProductVariantOption } from "./types";
import type { CatalogPage } from "./query";

export interface ProductCardViewModel {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  type: Product["type"];
  price: number;
  compareAtPrice?: number;
  imagePublicId?: string;
  shortDescription?: string;
}

export interface ProductDetailViewModel {
  product: ProductCardViewModel & {
    description?: string;
    galleryPublicIds: readonly string[];
    tags: readonly string[];
    sku?: string;
    weightGrams?: number;
  };
  variants: readonly ProductVariantViewModel[];
  category: CategoryViewModel | null;
}

export interface ProductVariantViewModel {
  id: string;
  sku?: string;
  options: readonly ProductVariantOption[];
  price: number;
  compareAtPrice?: number;
  imagePublicId?: string;
}

export interface CategoryViewModel {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imagePublicId?: string;
}

export interface ProductListViewModel {
  items: readonly ProductCardViewModel[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function toProductCardViewModel(
  product: Product,
): ProductCardViewModel {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    type: product.type,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    imagePublicId: product.imagePublicId,
    shortDescription: product.shortDescription,
  };
}

export function toCategoryViewModel(
  category: ProductCategory,
): CategoryViewModel {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    imagePublicId: category.imagePublicId,
  };
}

export function toProductListViewModel(
  page: CatalogPage<Product>,
): ProductListViewModel {
  return {
    ...page,
    items: page.items.map(toProductCardViewModel),
  };
}

export function toProductDetailViewModel(input: {
  product: Product;
  variants: readonly ProductVariant[];
  category: ProductCategory | null;
}): ProductDetailViewModel {
  return {
    product: {
      ...toProductCardViewModel(input.product),
      description: input.product.description,
      galleryPublicIds: input.product.galleryPublicIds,
      tags: input.product.tags,
      sku: input.product.sku,
      weightGrams: input.product.weightGrams,
    },
    variants: input.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      options: variant.options,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      imagePublicId: variant.imagePublicId,
    })),
    category: input.category
      ? toCategoryViewModel(input.category)
      : null,
  };
}
