import type { CatalogService } from "@/core/catalog";
import type { Cart } from "@/core/cart";
import type { ShippingProvider, ShippingRate } from "./types";

export class ShippingService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly provider: ShippingProvider,
  ) {}

  async quote(input: {
    tenantId: string;
    cart: Cart;
    destinationPostalCode: string;
    destinationAreaId?: string;
    courierCodes: readonly string[];
  }): Promise<readonly ShippingRate[]> {
    if (input.cart.tenantId !== input.tenantId) {
      throw new Error("Cart tenant does not match shipping tenant.");
    }

    const destinationPostalCode = input.destinationPostalCode.trim();
    if (!/^\d{5}$/.test(destinationPostalCode)) {
      throw new Error("Kode pos tujuan harus terdiri dari 5 digit.");
    }

    if (input.courierCodes.length === 0) {
      throw new Error("Pilih minimal satu kurir.");
    }

    return this.provider.quote({
      tenantId: input.tenantId,
      cart: input.cart,
      destinationPostalCode,
      destinationAreaId: input.destinationAreaId,
      courierCodes: input.courierCodes,
    });
  }

  async resolveShippingItemData(tenantId: string, cart: Cart) {
    return Promise.all(
      cart.items.map(async (item) => {
        const detail = await this.catalog.getProductDetail({
          tenantId,
          productId: item.productId,
        });
        if (!detail) throw new Error(`Produk ${item.productName} tidak ditemukan.`);

        const variant = item.variantId
          ? detail.variants.find((candidate) => candidate.id === item.variantId)
          : undefined;
        const weightGrams = variant?.weightGrams ?? detail.product.weightGrams ?? 1000;

        return {
          id: item.id,
          name: item.productName,
          description: item.variantLabel ?? detail.product.shortDescription ?? item.productName,
          value: (variant?.price ?? detail.product.price) * item.quantity,
          weightGrams: Math.max(1, weightGrams),
          quantity: item.quantity,
        };
      }),
    );
  }
}
