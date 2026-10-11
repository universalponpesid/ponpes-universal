import type { CatalogService } from "@/core/catalog";
import type { InventoryService } from "@/core/inventory";
import type {
  AddCartItemInput,
  Cart,
  CartAvailabilityStatus,
  CartItemAvailability,
  CartReconciliation,
  CartReconciliationAction,
  CartReconciliationIssue,
  CartReconciliationItem,
  ResolvedCart,
  ResolvedCartItem,
} from "./types";

const MAX_ITEM_QUANTITY = 99;

export class CartService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly inventory: InventoryService,
  ) {}

  async resolveCart(cart: Cart): Promise<ResolvedCart> {
    const items: ResolvedCartItem[] = [];

    for (const item of cart.items) {
      const product = await this.catalog.getProductDetail({
        tenantId: cart.tenantId,
        productId: item.productId,
      });

      if (!product || product.product.status !== "active") continue;

      const variant = item.variantId
        ? product.variants.find((candidate) => candidate.id === item.variantId)
        : undefined;

      if (item.variantId && (!variant || variant.status !== "active")) continue;

      const unitPrice = variant?.price ?? product.product.price;
      const quantity = Math.min(MAX_ITEM_QUANTITY, Math.max(1, item.quantity));

      items.push({
        ...item,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      });
    }

    return {
      tenantId: cart.tenantId,
      currency: "IDR",
      items,
      subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
    };
  }

  async resolveCartWithAvailability(cart: Cart): Promise<ResolvedCart> {
    const resolved = await this.resolveCart(cart);

    const items = await Promise.all(
      resolved.items.map(async (item): Promise<ResolvedCartItem> => ({
        ...item,
        availability: await this.getItemAvailability(cart.tenantId, item),
      })),
    );

    return { ...resolved, items };
  }

  async reconcileCart(cart: Cart): Promise<CartReconciliation> {
    const items: CartReconciliationItem[] = [];
    const resolvedItems: ResolvedCartItem[] = [];

    for (const item of cart.items) {
      const issues: CartReconciliationIssue[] = [];
      const product = await this.catalog.getProductDetail({
        tenantId: cart.tenantId,
        productId: item.productId,
      });

      if (!product) {
        issues.push({
          itemId: item.id,
          code: "product_missing",
          message: "Produk sudah tidak tersedia.",
          action: "remove",
        });
        items.push(this.reconciliationItem(item, "remove", null, null, issues));
        continue;
      }

      if (product.product.status !== "active") {
        issues.push({
          itemId: item.id,
          code: "product_inactive",
          message: "Produk sedang tidak tersedia.",
          action: "remove",
        });
        items.push(this.reconciliationItem(item, "remove", null, null, issues));
        continue;
      }

      const variant = item.variantId
        ? product.variants.find((candidate) => candidate.id === item.variantId)
        : undefined;

      if (item.variantId && !variant) {
        issues.push({
          itemId: item.id,
          code: "variant_missing",
          message: "Varian yang dipilih sudah tidak tersedia.",
          action: "remove",
        });
        items.push(this.reconciliationItem(item, "remove", null, null, issues));
        continue;
      }

      if (variant && variant.status !== "active") {
        issues.push({
          itemId: item.id,
          code: "variant_inactive",
          message: "Varian yang dipilih sedang tidak tersedia.",
          action: "remove",
        });
        items.push(this.reconciliationItem(item, "remove", null, null, issues));
        continue;
      }

      const authoritativeUnitPrice = variant?.price ?? product.product.price;
      if (authoritativeUnitPrice !== item.unitPriceSnapshot) {
        issues.push({
          itemId: item.id,
          code: "price_changed",
          message: "Harga produk telah berubah.",
          action: "update",
        });
      }

      const availability = await this.getItemAvailability(cart.tenantId, {
        ...item,
        quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, item.quantity)),
        unitPrice: authoritativeUnitPrice,
        lineTotal: authoritativeUnitPrice * Math.min(MAX_ITEM_QUANTITY, Math.max(1, item.quantity)),
      });

      let reconciledQuantity = Math.min(MAX_ITEM_QUANTITY, Math.max(1, item.quantity));
      if (reconciledQuantity !== item.quantity) {
        issues.push({
          itemId: item.id,
          code: "quantity_clamped",
          message: `Jumlah disesuaikan menjadi maksimal ${MAX_ITEM_QUANTITY} unit.`,
          action: "update",
        });
      }

      if (availability.status === "insufficient") {
        if ((availability.available ?? 0) > 0) {
          reconciledQuantity = Math.min(reconciledQuantity, availability.available ?? 0);
          issues.push({
            itemId: item.id,
            code: "inventory_insufficient",
            message: `Stok tersisa ${availability.available ?? 0} unit.`,
            action: "update",
          });
        } else {
          issues.push({
            itemId: item.id,
            code: "inventory_unavailable",
            message: "Stok sudah habis.",
            action: "remove",
          });
        }
      } else if (availability.status === "inactive") {
        issues.push({
          itemId: item.id,
          code: "inventory_unavailable",
          message: "Inventory produk sedang tidak aktif.",
          action: "remove",
        });
      } else if (availability.status === "untracked") {
        issues.push({
          itemId: item.id,
          code: "inventory_untracked",
          message: "Stok produk belum tersinkron.",
          action: "keep",
        });
      }

      const hasRemoval = issues.some((issue) => issue.action === "remove");
      // Informational issues such as untracked inventory must not force an
      // endless reconciliation loop. Only actionable issues change the cart.
      const hasActionableIssue = issues.some((issue) => issue.action === "update");
      const action: CartReconciliationAction = hasRemoval
        ? "remove"
        : hasActionableIssue
          ? "update"
          : "keep";

      if (action !== "remove") {
        resolvedItems.push({
          ...item,
          quantity: reconciledQuantity,
          unitPrice: authoritativeUnitPrice,
          lineTotal: authoritativeUnitPrice * reconciledQuantity,
          availability,
        });
      }

      items.push({
        itemId: item.id,
        action,
        currentQuantity: item.quantity,
        reconciledQuantity: action === "remove" ? null : reconciledQuantity,
        currentUnitPrice: item.unitPriceSnapshot,
        authoritativeUnitPrice: action === "remove" ? null : authoritativeUnitPrice,
        availability,
        issues,
      });
    }

    const resolved: ResolvedCart = {
      tenantId: cart.tenantId,
      currency: "IDR",
      items: resolvedItems,
      subtotal: resolvedItems.reduce((total, item) => total + item.lineTotal, 0),
    };

    return {
      tenantId: cart.tenantId,
      currency: "IDR",
      items,
      resolved,
      hasChanges: items.some((item) => item.action !== "keep"),
      // Missing inventory tracking is treated as an explicit non-tracked item,
      // not as a blocking reconciliation error. Checkout displays a warning;
      // tracked items still require a valid active reservation.
      hasBlockingIssues: items.some((item) => item.action === "remove"),
    };
  }

  validateAddItem(input: AddCartItemInput): void {
    if (!input.tenantId.trim()) throw new Error("tenantId is required.");
    if (!input.productId.trim()) throw new Error("productId is required.");
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_ITEM_QUANTITY) {
      throw new Error(`quantity must be an integer between 1 and ${MAX_ITEM_QUANTITY}.`);
    }
  }

  private async getItemAvailability(
    tenantId: string,
    item: ResolvedCartItem,
  ): Promise<CartItemAvailability> {
    const availability = await this.inventory.getAvailability({
      tenantId,
      productId: item.productId,
      variantId: item.variantId,
    });

    let status: CartAvailabilityStatus;
    let available: number | null;

    if (!availability) {
      status = "untracked";
      available = null;
    } else if (availability.status !== "active") {
      status = "inactive";
      available = 0;
    } else {
      available = availability.available;
      status = available >= item.quantity ? "available" : "insufficient";
    }

    return {
      itemId: item.id,
      status,
      available,
      requested: item.quantity,
    };
  }

  private reconciliationItem(
    item: ResolvedCartItem | Cart["items"][number],
    action: "remove",
    reconciledQuantity: null,
    authoritativeUnitPrice: null,
    issues: readonly CartReconciliationIssue[],
  ): CartReconciliationItem {
    return {
      itemId: item.id,
      action,
      currentQuantity: item.quantity,
      reconciledQuantity,
      currentUnitPrice: item.unitPriceSnapshot,
      authoritativeUnitPrice,
      issues,
    };
  }
}
