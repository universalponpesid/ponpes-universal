import type { CatalogService } from "@/core/catalog";
import type { Cart } from "@/core/cart";
import type { ShippingProvider, ShippingRate } from "@/core/shipping";

const BITESHIP_API_URL = "https://api.biteship.com/v1/rates/couriers";

type BiteshipPricing = {
  company?: string;
  courier_name?: string;
  courier_code?: string;
  courier_service_code?: string;
  courier_service_name?: string;
  description?: string;
  duration?: string;
  price?: number;
};

type BiteshipResponse = { pricing?: BiteshipPricing[]; message?: string };

export class BiteshipProvider implements ShippingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly originPostalCode: number,
    private readonly catalog: CatalogService,
  ) {}

  async quote(input: {
    tenantId: string;
    cart: Cart;
    destinationPostalCode: string;
    destinationAreaId?: string;
    courierCodes: readonly string[];
  }): Promise<readonly ShippingRate[]> {
    if (!this.apiKey.trim()) throw new Error("Biteship API key belum dikonfigurasi.");

    const items = await Promise.all(input.cart.items.map(async (item) => {
      const detail = await this.catalog.getProductDetail({ tenantId: input.tenantId, productId: item.productId });
      if (!detail) throw new Error(`Produk ${item.productName} tidak ditemukan.`);
      const variant = item.variantId ? detail.variants.find((candidate) => candidate.id === item.variantId) : undefined;
      const weight = Math.max(1, variant?.weightGrams ?? detail.product.weightGrams ?? 1000);
      const price = variant?.price ?? detail.product.price;
      return {
        name: item.productName,
        description: item.variantLabel ?? detail.product.shortDescription ?? item.productName,
        value: price * item.quantity,
        weight,
        quantity: item.quantity,
      };
    }));

    const response = await fetch(BITESHIP_API_URL, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        origin_postal_code: this.originPostalCode,
        ...(input.destinationAreaId
          ? { destination_area_id: input.destinationAreaId }
          : { destination_postal_code: Number(input.destinationPostalCode) }),
        couriers: input.courierCodes.join(","),
        items,
      }),
      cache: "no-store",
    });

    const body = (await response.json()) as BiteshipResponse;
    if (!response.ok) throw new Error(body.message ?? "Biteship gagal mengambil tarif pengiriman.");

    return (body.pricing ?? [])
      .filter((rate) => typeof rate.price === "number" && Boolean(rate.company) && Boolean(rate.courier_service_code))
      .map((rate) => ({
        id: `${rate.company}:${rate.courier_service_code}`,
        provider: "biteship",
        company: rate.company ?? "",
        courierName: rate.courier_name ?? rate.company ?? "Kurir",
        serviceCode: rate.courier_service_code ?? "",
        serviceName: rate.courier_service_name ?? "Layanan",
        description: rate.description,
        duration: rate.duration,
        price: rate.price ?? 0,
        currency: "IDR" as const,
      }));
  }
}
