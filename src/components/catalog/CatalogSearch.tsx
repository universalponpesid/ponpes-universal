import Link from "next/link";

export type CatalogSearchProps = {
  defaultValue?: string;
  action?: string;
  placeholder?: string;
  clearHref?: string;
  className?: string;
};

export function CatalogSearch({
  defaultValue = "",
  action = "/produk",
  placeholder = "Cari produk...",
  clearHref,
  className = "",
}: CatalogSearchProps) {
  const hasValue = defaultValue.trim().length > 0;

  return (
    <form
      action={action}
      role="search"
      className={`relative ${className}`}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Cari produk
      </label>

      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgb(var(--color-text-subtle))]"
      >
        <path
          d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      <input
        id="catalog-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="min-h-12 w-full rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] pl-12 pr-24 text-sm text-[rgb(var(--color-text))] outline-none transition placeholder:text-[rgb(var(--color-text-subtle))] focus:border-[rgb(var(--color-primary))] focus:ring-4 focus:ring-[rgb(var(--color-primary)/0.08)]"
      />

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {hasValue && clearHref ? (
          <Link
            href={clearHref}
            aria-label="Hapus pencarian"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[rgb(var(--color-text-subtle))] hover:bg-[rgb(var(--color-surface-muted))] hover:text-[rgb(var(--color-text))]"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </Link>
        ) : null}

        <button
          type="submit"
          className="hidden min-h-9 rounded-full bg-[rgb(var(--color-primary))] px-4 text-xs font-semibold text-white transition-colors hover:bg-[rgb(var(--color-primary-hover))] sm:inline-flex sm:items-center"
        >
          Cari
        </button>
      </div>
    </form>
  );
}
