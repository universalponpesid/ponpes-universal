export const dataConfig = {
  provider: "google-sheets",

  sheets: {
    products: "products",
    productVariants: "product_variants",
    categories: "categories",

    inventory: "product_variants",
    reservations: "stock_reservations",

    orders: "orders",
  },

  cache: {
    catalogSeconds: 30,
    ordersSeconds: 0,
  },
} as const;