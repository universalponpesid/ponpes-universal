"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { cloudinaryImage } from "@/infrastructure/cloudinary";

export type ProductGalleryImage = {
  id: string;
  publicId: string;
  alt?: string;
};

export type ProductGalleryProps = {
  productName: string;
  images: readonly ProductGalleryImage[];
  variantImagePublicId?: string;
  priority?: boolean;
  className?: string;
};

function uniqueImages(
  images: readonly ProductGalleryImage[],
  variantImagePublicId?: string,
): ProductGalleryImage[] {
  const result: ProductGalleryImage[] = [];
  const seen = new Set<string>();

  if (variantImagePublicId) {
    seen.add(variantImagePublicId);
    result.push({
      id: `variant-${variantImagePublicId}`,
      publicId: variantImagePublicId,
    });
  }

  for (const image of images) {
    if (!image.publicId || seen.has(image.publicId)) continue;
    seen.add(image.publicId);
    result.push(image);
  }

  return result;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d={direction === "left" ? "m12.5 4-5 6 5 6" : "m7.5 4 5 6-5 6"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProductGallery({
  productName,
  images,
  variantImagePublicId,
  priority = true,
  className = "",
}: ProductGalleryProps) {
  const galleryImages = useMemo(
    () => uniqueImages(images, variantImagePublicId),
    [images, variantImagePublicId],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [variantImagePublicId]);

  useEffect(() => {
    if (activeIndex >= galleryImages.length) {
      setActiveIndex(Math.max(0, galleryImages.length - 1));
    }
  }, [activeIndex, galleryImages.length]);

  useEffect(() => {
    if (galleryImages.length === 0) return;

    for (const image of galleryImages) {
      const detailUrl = cloudinaryImage(image.publicId, "detail");
      const zoomUrl = cloudinaryImage(image.publicId, "zoom");
      const detailPreload = new window.Image();
      const zoomPreload = new window.Image();
      detailPreload.src = detailUrl;
      zoomPreload.src = zoomUrl;
    }
  }, [galleryImages]);

  useEffect(() => {
    if (!isZoomOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsZoomOpen(false);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === 0 ? galleryImages.length - 1 : current - 1,
        );
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          galleryImages.length === 0 || current === galleryImages.length - 1
            ? 0
            : current + 1,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryImages.length, isZoomOpen]);

  if (galleryImages.length === 0) {
    return (
      <div
        className={`aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-muted))] ${className}`}
      >
        <div className="flex h-full items-center justify-center px-8 text-center">
          <span className="font-[var(--font-heading)] text-sm font-medium text-[rgb(var(--color-text-subtle))]">
            {productName}
          </span>
        </div>
      </div>
    );
  }

  const activeImage = galleryImages[activeIndex] ?? galleryImages[0];
  const activeAlt = activeImage.alt ?? productName;
  const hasMultipleImages = galleryImages.length > 1;

  const goPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    );
  };

  const goNext = () => {
    setActiveIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <>
      <div className={`min-w-0 ${className}`}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[72px_minmax(0,1fr)] lg:gap-4">
          <div className="order-2 flex min-w-0 gap-2 overflow-x-auto pb-1 sm:order-1 sm:max-h-[620px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:pb-0">
            {galleryImages.map((image, index) => {
              const isActive = index === activeIndex;
              const thumbUrl = cloudinaryImage(image.publicId, "thumb");

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Tampilkan foto ${index + 1} dari ${galleryImages.length}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border bg-[rgb(var(--color-surface))] transition-all sm:h-[68px] sm:w-[68px] ${isActive ? "border-[rgb(var(--color-primary))] ring-2 ring-[rgb(var(--color-primary)/0.14)]" : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border-strong))]"}`}
                >
                  <Image
                    src={thumbUrl}
                    alt={image.alt ?? `${productName} thumbnail ${index + 1}`}
                    fill
                    sizes="68px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>

          <div className="order-1 min-w-0 sm:order-2">
            <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-muted))] sm:aspect-[4/5] lg:rounded-[var(--radius-xl)]">
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--color-primary))]"
                aria-label={`Perbesar foto ${productName}`}
              />

              <Image
                key={activeImage.publicId}
                src={cloudinaryImage(activeImage.publicId, "detail")}
                alt={activeAlt}
                fill
                priority={priority}
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 80vw, 55vw"
                className="object-cover transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-[1.015]"
              />

              {hasMultipleImages ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between bg-gradient-to-t from-black/35 to-transparent px-3 pb-3 pt-12 sm:px-4 sm:pb-4">
                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-white backdrop-blur-sm sm:text-[11px]">
                    {activeIndex + 1} / {galleryImages.length}
                  </span>
                  <span className="hidden rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--color-text))] shadow-[var(--shadow-xs)] backdrop-blur-sm sm:block">
                    Klik untuk memperbesar
                  </span>
                </div>
              ) : null}

              {hasMultipleImages ? (
                <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-2 opacity-100 transition-opacity sm:px-3 sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={goPrevious}
                    aria-label="Foto sebelumnya"
                    className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-white/90 text-[rgb(var(--color-text))] shadow-[var(--shadow-sm)] backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
                  >
                    <ArrowIcon direction="left" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Foto berikutnya"
                    className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-white/90 text-[rgb(var(--color-text))] shadow-[var(--shadow-sm)] backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
                  >
                    <ArrowIcon direction="right" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isZoomOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeri foto ${productName}`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsZoomOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Tutup galeri"
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:top-5"
          >
            <CloseIcon />
          </button>

          <div className="relative h-[min(88vh,900px)] w-full max-w-6xl">
            <Image
              src={cloudinaryImage(activeImage.publicId, "zoom")}
              alt={activeAlt}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {hasMultipleImages ? (
              <>
                <button
                  type="button"
                  onClick={goPrevious}
                  aria-label="Foto sebelumnya"
                  className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-3"
                >
                  <ArrowIcon direction="left" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Foto berikutnya"
                  className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-3"
                >
                  <ArrowIcon direction="right" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
