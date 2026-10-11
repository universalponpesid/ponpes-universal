import type { CategoryViewModel, ProductCardViewModel } from "@/core/catalog/view-models";

export const catalogPreviewCategories: readonly CategoryViewModel[] = [
  { id: "fashion", slug: "fashion", name: "Fashion" },
  { id: "books", slug: "buku", name: "Buku" },
  { id: "lifestyle", slug: "lifestyle", name: "Lifestyle" },
  { id: "travel", slug: "travel", name: "Travel" },
  { id: "souvenir", slug: "souvenir", name: "Souvenir" },
  { id: "digital", slug: "digital", name: "Digital" },
];

export const catalogPreviewProducts: readonly ProductCardViewModel[] = [
  {
    id: "preview-01",
    slug: "kaos-universal-premium",
    name: "Kaos Universal Premium",
    brand: "Universal",
    type: "physical",
    price: 149000,
    compareAtPrice: 179000,
    imagePublicId: "/images/catalog-preview/kaos-universal.svg",
    shortDescription: "Kaos esensial dengan bahan lembut dan potongan modern untuk aktivitas sehari-hari.",
  },
  {
    id: "preview-02",
    slug: "agenda-universal-2026",
    name: "Agenda Universal 2026",
    brand: "Universal",
    type: "physical",
    price: 89000,
    imagePublicId: "/images/catalog-preview/agenda-universal.svg",
    shortDescription: "Agenda berdesain minimal untuk merapikan rencana, catatan, dan target harian.",
  },
  {
    id: "preview-03",
    slug: "totebag-kanvas-universal",
    name: "Totebag Kanvas Universal",
    brand: "Universal",
    type: "physical",
    price: 75000,
    imagePublicId: "/images/catalog-preview/totebag-universal.svg",
    shortDescription: "Tas kanvas kokoh dengan siluet sederhana untuk membawa kebutuhan harian.",
  },
  {
    id: "preview-04",
    slug: "mukena-travel-universal",
    name: "Mukena Travel Universal",
    brand: "Universal",
    type: "physical",
    price: 219000,
    compareAtPrice: 249000,
    imagePublicId: "/images/catalog-preview/mukena-travel.svg",
    shortDescription: "Mukena praktis dengan material ringan dan kemasan ringkas untuk perjalanan.",
  },
];
