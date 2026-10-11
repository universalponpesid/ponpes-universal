"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { CatalogProductSort } from "@/core/catalog/query";

export type CatalogSortSelectProps = {
  value?: CatalogProductSort;
  className?: string;
};

const OPTIONS: ReadonlyArray<{
  value: CatalogProductSort;
  label: string;
}> = [
  { value: "relevance", label: "Relevansi" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "price_desc", label: "Harga tertinggi" },
  { value: "name_asc", label: "Nama A–Z" },
  { value: "name_desc", label: "Nama Z–A" },
];

export function CatalogSortSelect({
  value = "relevance",
  className = "",
}: CatalogSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextValue: CatalogProductSort) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", nextValue);
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="hidden text-xs font-medium text-[rgb(var(--color-text-subtle))] sm:inline">
        Urutkan
      </span>
      <select
        value={value}
        onChange={(event) =>
          handleChange(event.target.value as CatalogProductSort)
        }
        className="min-h-10 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3.5 text-xs font-semibold text-[rgb(var(--color-text))] outline-none transition focus:border-[rgb(var(--color-primary))] focus:ring-4 focus:ring-[rgb(var(--color-primary)/0.08)]"
        aria-label="Urutkan produk"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
