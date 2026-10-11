import { CatalogSortSelect } from "./CatalogSortSelect";

export type CatalogToolbarProps = {
  total: number;
  sort?: Parameters<typeof CatalogSortSelect>[0]["value"];
  className?: string;
};

export function CatalogToolbar({
  total,
  sort = "relevance",
  className = "",
}: CatalogToolbarProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-y border-[rgb(var(--color-border))] py-3.5 ${className}`}
    >
      <p className="text-xs font-medium text-[rgb(var(--color-text-muted))] sm:text-sm">
        <span className="font-semibold text-[rgb(var(--color-text))]">
          {total.toLocaleString("id-ID")}
        </span>{" "}
        produk
      </p>

      <CatalogSortSelect value={sort} />
    </div>
  );
}
