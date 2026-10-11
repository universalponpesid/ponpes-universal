import { notFound } from "next/navigation";

import { ProductDetailWithCart } from "@/components/cart";
import { toProductCardViewModel, toProductDetailViewModel } from "@/core/catalog/view-models";
import { getCommerceConfig } from "@/infrastructure/config/commerce-config";
import { createTenantCommerceServices } from "@/infrastructure/tenancy";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const commerce = getCommerceConfig();
  // Cross-tenant product URLs will be introduced with marketplace tenant routing.
  if (commerce.mode === "marketplace") notFound();

  const { tenant, catalogService } = await createTenantCommerceServices(commerce.defaultTenantId);
  const detail = await catalogService.getProductDetailBySlug({ tenantId: tenant.tenantId, slug: params.slug });
  if (!detail) notFound();

  const related = await catalogService.getRelatedProducts({ tenantId: tenant.tenantId, productId: detail.product.id, limit: 4 });
  return <ProductDetailWithCart product={toProductDetailViewModel(detail)} relatedProducts={related.map(toProductCardViewModel)} />;
}
