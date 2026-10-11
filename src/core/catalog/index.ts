export { CatalogService } from "./service";
export { getCatalogService } from "./factory";

export type {
  CatalogPage,
  CatalogProductDetail,
  CatalogProductQuery,
  CatalogProductSort,
} from "./query";

export {
  toCategoryViewModel,
  toProductCardViewModel,
  toProductDetailViewModel,
  toProductListViewModel,
} from "./view-models";

export type {
  CategoryViewModel,
  ProductCardViewModel,
  ProductDetailViewModel,
  ProductListViewModel,
  ProductVariantViewModel,
} from "./view-models";

export type {
  Product,
  ProductCategory,
  ProductVariant,
  ProductVariantOption,
  ProductType,
  ProductStatus,
  ProductVariantStatus,
  CategoryStatus,
  ProductSeo,
} from "./types";
