import type { Metadata } from "next";
import { storeConfig } from "@/config/store";
import type { Product } from "@/core/catalog/types";
import { cloudinaryImage } from "@/infrastructure/cloudinary";

export function absoluteUrl(path = "/") {
  return new URL(path, storeConfig.siteUrl).toString();
}

export function createSiteMetadata(overrides?: Metadata): Metadata {
  return {
    metadataBase: new URL(storeConfig.siteUrl),
    title: {
      default: storeConfig.name,
      template: `%s | ${storeConfig.name}`,
    },
    description: storeConfig.description,
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: storeConfig.name,
      locale: storeConfig.locale,
      title: storeConfig.name,
      description: storeConfig.description,
      url: storeConfig.siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: storeConfig.name,
      description: storeConfig.description,
    },
    ...overrides,
  };
}

export function createProductMetadata(product: Product): Metadata {
  const title = product.seo.title || product.name;
  const description =
    product.seo.description ||
    product.shortDescription ||
    product.description ||
    storeConfig.description;
  const imagePublicIds = [
    product.imagePublicId,
    ...product.galleryPublicIds,
  ].filter((value): value is string => Boolean(value));
  const image = cloudinaryImage(imagePublicIds[0], "detail");
  const canonical = absoluteUrl(`/produk/${product.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: storeConfig.name,
      locale: storeConfig.locale,
      images: image
        ? [{ url: image, alt: product.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: {
      index: product.status === "active",
      follow: true,
    },
  };
}

export function createProductJsonLd(product: Product) {
  const imagePublicIds = [
    product.imagePublicId,
    ...product.galleryPublicIds,
  ].filter((value): value is string => Boolean(value));

  const image = imagePublicIds.map((publicId) =>
    cloudinaryImage(publicId, "detail"),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.shortDescription || product.description || undefined,
    sku: product.sku || undefined,
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    image,
    url: absoluteUrl(`/produk/${product.slug}`),
  };
}
