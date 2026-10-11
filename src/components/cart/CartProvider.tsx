"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Cart, CartItem, CartReconciliation } from "@/core/cart";

const STORAGE_KEY = "universal-mart-cart";

export type CartContextValue = {
  cart: Cart;
  itemCount: number;
  subtotalSnapshot: number;
  addItem: (item: Omit<CartItem, "tenantId"> & { tenantId?: string }) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  syncItemSnapshot: (itemId: string, quantity: number, unitPrice: number) => void;
  applyReconciliation: (reconciliation: CartReconciliation) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function createCart(tenantId: string): Cart {
  return {
    id: `cart-${tenantId}`,
    tenantId,
    currency: "IDR",
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

function readCart(tenantId: string): Cart {
  if (typeof window === "undefined") return createCart(tenantId);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createCart(tenantId);
    const parsed = JSON.parse(raw) as Cart;
    if (parsed.tenantId !== tenantId || !Array.isArray(parsed.items)) {
      return createCart(tenantId);
    }
    return parsed;
  } catch {
    return createCart(tenantId);
  }
}

export function CartProvider({ tenantId, children }: { tenantId: string; children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(() => createCart(tenantId));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(readCart(tenantId));
    setHydrated(true);
  }, [tenantId]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "tenantId"> & { tenantId?: string }) => {
    setCart((current) => {
      const tenant = item.tenantId ?? tenantId;
      const existing = current.items.find((candidate) => candidate.id === item.id);
      const quantity = Math.min(99, (existing?.quantity ?? 0) + item.quantity);
      const nextItem: CartItem = { ...item, tenantId: tenant };

      return {
        ...current,
        items: existing
          ? current.items.map((candidate) =>
              candidate.id === item.id ? { ...candidate, ...nextItem, quantity } : candidate,
            )
          : [...current.items, { ...nextItem, quantity: item.quantity }],
        updatedAt: new Date().toISOString(),
      };
    });
  }, [tenantId]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    const safeQuantity = Math.min(99, Math.max(1, Math.floor(quantity)));
    setCart((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, quantity: safeQuantity } : item),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const syncItemSnapshot = useCallback((itemId: string, quantity: number, unitPrice: number) => {
    const safeQuantity = Math.min(99, Math.max(1, Math.floor(quantity)));
    setCart((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, quantity: safeQuantity, unitPriceSnapshot: unitPrice } : item,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const applyReconciliation = useCallback((reconciliation: CartReconciliation) => {
    setCart((current) => {
      const actions = new Map(reconciliation.items.map((item) => [item.itemId, item]));
      const nextItems = current.items.flatMap((item) => {
        const result = actions.get(item.id);
        if (!result || result.action === "remove" || result.reconciledQuantity === null || result.authoritativeUnitPrice === null) {
          return result?.action === "remove" ? [] : [item];
        }
        return [{ ...item, quantity: result.reconciledQuantity, unitPriceSnapshot: result.authoritativeUnitPrice }];
      });

      return { ...current, items: nextItems, updatedAt: new Date().toISOString() };
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart((current) => ({ ...current, items: [], updatedAt: new Date().toISOString() }));
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    itemCount: cart.items.reduce((total, item) => total + item.quantity, 0),
    subtotalSnapshot: cart.items.reduce((total, item) => total + item.unitPriceSnapshot * item.quantity, 0),
    addItem,
    updateQuantity,
    syncItemSnapshot,
    applyReconciliation,
    removeItem,
    clearCart,
  }), [addItem, applyReconciliation, cart, clearCart, removeItem, syncItemSnapshot, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
