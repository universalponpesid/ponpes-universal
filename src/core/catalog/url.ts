import type { CatalogProductQuery, CatalogProductSort } from "./query";
import type { Product } from "./types";

const VALID_SORTS: readonly CatalogProductSort[] = [
  "relevance",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
];

const VALID_TYPES: readonly Product["type"][] = [
  "physical",
  "digital",
  "service",
  "property",
  "vehicle",
];

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseCatalogSearchParams(
  tenantId: string,
  params: Record<string, string | string[] | undefined>,
): CatalogProductQuery {
  const sortValue = first(params.sort);
  const typeValue = first(params.type);

  return {
    tenantId,
    search: first(params.q)?.trim() || undefined,
    categorySlug: first(params.category)?.trim() || undefined,
    type: VALID_TYPES.includes(typeValue as Product["type"])
      ? (typeValue as Product["type"])
      : undefined,
    sort: VALID_SORTS.includes(sortValue as CatalogProductSort)
      ? (sortValue as CatalogProductSort)
      : "relevance",
    page: positiveInteger(first(params.page)),
    pageSize: positiveInteger(first(params.pageSize)),
  };
}

export function buildCatalogUrl(
  pathname: string,
  params: Partial<{
    q: string;
    category: string;
    type: Product["type"];
    sort: CatalogProductSort;
    page: number;
    pageSize: number;
  }>,
): string {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.category?.trim()) searchParams.set("category", params.category.trim());
  if (params.type) searchParams.set("type", params.type);
  if (params.sort && params.sort !== "relevance") searchParams.set("sort", params.sort);
  if (params.page && params.page > 1) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
