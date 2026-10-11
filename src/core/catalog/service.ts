import type {
  Product,
  ProductCategory,
  ProductVariant,
} from "./types";
import type {
  CatalogPage,
  CatalogProductDetail,
  CatalogProductQuery,
} from "./query";
import type { ProductRepository } from "@/infrastructure/repositories/product-repository";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesSearch(product: Product, search?: string): boolean {
  if (!search?.trim()) {
    return true;
  }

  const needle = normalizeText(search);
  const haystack = [
    product.name,
    product.slug,
    product.brand,
    product.shortDescription,
    product.description,
    ...product.tags,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value ?? ""));

  return haystack.some((value) => value.includes(needle));
}

function sortProducts(
  products: readonly Product[],
  sort: CatalogProductQuery["sort"],
): Product[] {
  const result = [...products];

  switch (sort) {
    case "price_asc":
      return result.sort((a, b) => a.price - b.price);
    case "price_desc":
      return result.sort((a, b) => b.price - a.price);
    case "name_desc":
      return result.sort((a, b) => b.name.localeCompare(a.name));
    case "name_asc":
      return result.sort((a, b) => a.name.localeCompare(b.name));
    case "relevance":
    default:
      return result;
  }
}

export class CatalogService {
  constructor(
    private readonly repository: ProductRepository,
  ) {}

  async getProducts(
    tenantId: string,
  ): Promise<readonly Product[]> {
    return this.repository.getProducts({ tenantId });
  }

  async queryProducts(
    input: CatalogProductQuery,
  ): Promise<CatalogPage<Product>> {
    const page = Math.max(1, input.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const [products, category] = await Promise.all([
      this.repository.getProducts({ tenantId: input.tenantId }),
      input.categorySlug
        ? this.repository.getCategoryBySlug({
            tenantId: input.tenantId,
            slug: input.categorySlug,
          })
        : Promise.resolve(null),
    ]);

    if (input.categorySlug && !category) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize,
        pageCount: 1,
      };
    }

    const categoryId = input.categoryId ?? category?.id;

    const filtered = products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) {
        return false;
      }

      if (input.type && product.type !== input.type) {
        return false;
      }

      return matchesSearch(product, input.search);
    });

    const sorted = sortProducts(filtered, input.sort);
    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * pageSize;

    return {
      items: sorted.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      pageCount,
    };
  }

  async getProductById(input: {
    tenantId: string;
    productId: string;
  }): Promise<Product | null> {
    return this.repository.getProductById(input);
  }

  async getProductBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<Product | null> {
    return this.repository.getProductBySlug(input);
  }

  async getProductDetail(input: {
    tenantId: string;
    productId: string;
  }): Promise<CatalogProductDetail | null> {
    const product = await this.repository.getProductById(input);

    if (!product) {
      return null;
    }

    const [variants, categories] = await Promise.all([
      this.repository.getProductVariants(input),
      this.repository.getCategories({ tenantId: input.tenantId }),
    ]);

    return {
      product,
      variants,
      category:
        categories.find((category) => category.id === product.categoryId) ??
        null,
    };
  }

  async getProductDetailBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<CatalogProductDetail | null> {
    const product = await this.repository.getProductBySlug(input);

    if (!product) {
      return null;
    }

    return this.getProductDetail({
      tenantId: input.tenantId,
      productId: product.id,
    });
  }

  async getRelatedProducts(input: {
    tenantId: string;
    productId: string;
    limit?: number;
  }): Promise<readonly Product[]> {
    const [product, products] = await Promise.all([
      this.repository.getProductById({
        tenantId: input.tenantId,
        productId: input.productId,
      }),
      this.repository.getProducts({ tenantId: input.tenantId }),
    ]);

    if (!product) {
      return [];
    }

    const limit = Math.min(12, Math.max(1, input.limit ?? 4));
    const productTags = new Set(product.tags.map(normalizeText));

    return products
      .filter((candidate) => candidate.id !== product.id)
      .map((candidate) => ({
        candidate,
        score:
          (candidate.categoryId && candidate.categoryId === product.categoryId
            ? 3
            : 0) +
          candidate.tags.reduce(
            (score, tag) =>
              score + (productTags.has(normalizeText(tag)) ? 1 : 0),
            0,
          ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.candidate);
  }

  async getProductVariants(input: {
    tenantId: string;
    productId: string;
  }): Promise<readonly ProductVariant[]> {
    return this.repository.getProductVariants(input);
  }

  async getCategories(
    tenantId: string,
  ): Promise<readonly ProductCategory[]> {
    return this.repository.getCategories({ tenantId });
  }

  async getCategoryBySlug(input: {
    tenantId: string;
    slug: string;
  }): Promise<ProductCategory | null> {
    return this.repository.getCategoryBySlug(input);
  }
}
