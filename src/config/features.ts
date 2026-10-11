export const featureConfig = {
  catalog: {
    products: true,
    categories: true,
    variants: true,
    search: true,
  },

  commerce: {
    cart: true,
    checkout: true,
    orders: true,
  },

  reviews: {
    enabled: true,
    ratings: true,
    images: true,
    verifiedPurchase: true,
  },

  wishlist: {
    enabled: true,
  },

  affiliate: {
    enabled: true,
  },

  payments: {
    midtrans: true,
    manualBankTransfer: true,
    manualQris: true,
  },

  shipping: {
    biteship: true,
    localCourier: true,
  },

  future: {
    digitalProducts: false,
    services: false,
    property: false,
    vehicles: false,
  },
} as const;