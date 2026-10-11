"use client";

import { useMemo } from "react";
import type { ProductVariantViewModel } from "@/core/catalog/view-models";

export type ProductVariantSelectorProps = {
  variants: readonly ProductVariantViewModel[];
  selectedVariantId?: string;
  onChange: (variant: ProductVariantViewModel) => void;
};

type OptionGroup = { name: string; values: string[] };

function buildOptionGroups(variants: readonly ProductVariantViewModel[]): OptionGroup[] {
  const groups = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const option of variant.options) {
      const values = groups.get(option.name) ?? new Set<string>();
      values.add(option.value);
      groups.set(option.name, values);
    }
  }
  return Array.from(groups.entries()).map(([name, values]) => ({ name, values: Array.from(values) }));
}

export function ProductVariantSelector({ variants, selectedVariantId, onChange }: ProductVariantSelectorProps) {
  const groups = useMemo(() => buildOptionGroups(variants), [variants]);
  if (variants.length === 0) return null;
  const selected = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const selectedValue = selected.options.find((option) => option.name === group.name)?.value;
        return (
          <fieldset key={group.name} className="space-y-2.5">
            <legend className="text-sm font-semibold text-[rgb(var(--color-text))]">
              {group.name}
              {selectedValue ? <span className="ml-2 font-normal text-[rgb(var(--color-text-muted))]">{selectedValue}</span> : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const candidate = variants.find((variant) => variant.options.some((option) => option.name === group.name && option.value === value));
                const isActive = selectedValue === value;
                return (
                  <button key={`${group.name}-${value}`} type="button" onClick={() => candidate && onChange(candidate)} aria-pressed={isActive}
                    className={`min-h-10 rounded-[var(--radius-sm)] border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] ${isActive ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary-active))]" : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] hover:border-[rgb(var(--color-border-strong))]"}`}>
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
