"use client";

import { useCallback } from "react";
import type { ProductDetailViewModel } from "@/core/catalog/view-models";
import type { AddToCartPayload } from "@/components/catalog";
import { useCart } from "./CartProvider";
import { ProductDetail } from "@/components/catalog/ProductDetail";

export function ProductDetailWithCart({ product, relatedProducts }: {
  product: ProductDetailViewModel;
  relatedProducts?: readonly import("@/core/catalog/view-models").ProductCardViewModel[];
}) {
  const { addItem } = useCart();

  const handleAddToCart = useCallback((payload: AddToCartPayload) => {
    const variant = product.variants.find((candidate) => candidate.id === payload.variantId);
    const optionLabel = variant?.options.map((option) => `${option.name}: ${option.value}`).join(" · ");

    addItem({
      id: `${payload.productId}:${payload.variantId ?? "default"}`,
      productId: payload.productId,
      variantId: payload.variantId,
      productName: product.product.name,
      variantLabel: optionLabel,
      sku: variant?.sku ?? product.product.sku,
      imagePublicId: variant?.imagePublicId ?? product.product.imagePublicId,
      unitPriceSnapshot: variant?.price ?? product.product.price,
      quantity: payload.quantity,
    });
  }, [addItem, product]);

  return <ProductDetail product={product} relatedProducts={relatedProducts} onAddToCart={handleAddToCart} />;
}
