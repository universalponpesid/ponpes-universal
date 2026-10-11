export type CartItem = {
  id: string;
  tenantId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  sku?: string;
  imagePublicId?: string;
  unitPriceSnapshot: number;
  quantity: number;
};

export type Cart = {
  id: string;
  tenantId: string;
  currency: "IDR";
  items: readonly CartItem[];
  updatedAt: string;
};

export type AddCartItemInput = {
  tenantId: string;
  productId: string;
  variantId?: string;
  quantity: number;
};

export type CartAvailabilityStatus =
  | "available"
  | "insufficient"
  | "inactive"
  | "untracked";

export type CartItemAvailability = {
  itemId: string;
  status: CartAvailabilityStatus;
  available: number | null;
  requested: number;
};

export type CartReconciliationIssueCode =
  | "product_missing"
  | "product_inactive"
  | "variant_missing"
  | "variant_inactive"
  | "price_changed"
  | "quantity_clamped"
  | "inventory_unavailable"
  | "inventory_insufficient"
  | "inventory_untracked";

export type CartReconciliationAction = "keep" | "update" | "remove";

export type CartReconciliationIssue = {
  itemId: string;
  code: CartReconciliationIssueCode;
  message: string;
  action: CartReconciliationAction;
};

export type CartReconciliationItem = {
  itemId: string;
  action: CartReconciliationAction;
  currentQuantity: number;
  reconciledQuantity: number | null;
  currentUnitPrice: number;
  authoritativeUnitPrice: number | null;
  availability?: CartItemAvailability;
  issues: readonly CartReconciliationIssue[];
};

export type ResolvedCartItem = CartItem & {
  unitPrice: number;
  lineTotal: number;
  availability?: CartItemAvailability;
};

export type ResolvedCart = {
  tenantId: string;
  currency: "IDR";
  items: readonly ResolvedCartItem[];
  subtotal: number;
};

export type CartReconciliation = {
  tenantId: string;
  currency: "IDR";
  items: readonly CartReconciliationItem[];
  resolved: ResolvedCart;
  hasChanges: boolean;
  hasBlockingIssues: boolean;
};
