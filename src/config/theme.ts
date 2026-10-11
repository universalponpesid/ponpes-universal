export type ThemeTokens = {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;
  primaryMuted: string;
  primarySubtle: string;
  secondary: string;
  secondaryHover: string;
  secondaryActive: string;
  secondarySoft: string;
  secondaryMuted: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  accentSoft: string;
  accentMuted: string;
  accentSubtle: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  sale: string;
  stockReady: string;
  stockLow: string;
  stockOut: string;
  rating: string;
  verified: string;
};

export const themeTokens: ThemeTokens = {
  primary: "22 122 78",
  primaryHover: "16 102 64",
  primaryActive: "12 82 52",
  primarySoft: "229 246 237",
  primaryMuted: "198 232 214",
  primarySubtle: "242 250 246",
  secondary: "14 74 54",
  secondaryHover: "10 61 44",
  secondaryActive: "8 49 36",
  secondarySoft: "225 239 232",
  secondaryMuted: "193 219 205",
  accent: "201 157 58",
  accentHover: "174 132 40",
  accentActive: "145 108 31",
  accentSoft: "250 244 225",
  accentMuted: "240 226 183",
  accentSubtle: "253 250 241",
  background: "250 250 248",
  surface: "255 255 255",
  surfaceMuted: "246 247 245",
  foreground: "20 29 25",
  foregroundMuted: "91 105 98",
  foregroundSubtle: "132 145 138",
  border: "224 229 225",
  borderStrong: "202 211 205",
  success: "22 163 74",
  warning: "217 119 6",
  danger: "220 38 38",
  info: "37 99 235",
  sale: "185 28 28",
  stockReady: "22 163 74",
  stockLow: "217 119 6",
  stockOut: "220 38 38",
  rating: "201 157 58",
  verified: "22 122 78",
};

export function getThemeCssVariables(tokens: ThemeTokens = themeTokens) {
  return {
    "--color-primary": tokens.primary,
    "--color-primary-hover": tokens.primaryHover,
    "--color-primary-active": tokens.primaryActive,
    "--color-primary-soft": tokens.primarySoft,
    "--color-primary-muted": tokens.primaryMuted,
    "--color-primary-subtle": tokens.primarySubtle,
    "--color-secondary": tokens.secondary,
    "--color-secondary-hover": tokens.secondaryHover,
    "--color-secondary-active": tokens.secondaryActive,
    "--color-secondary-soft": tokens.secondarySoft,
    "--color-secondary-muted": tokens.secondaryMuted,
    "--color-accent": tokens.accent,
    "--color-accent-hover": tokens.accentHover,
    "--color-accent-active": tokens.accentActive,
    "--color-accent-soft": tokens.accentSoft,
    "--color-accent-muted": tokens.accentMuted,
    "--color-accent-subtle": tokens.accentSubtle,
    "--color-background": tokens.background,
    "--color-surface": tokens.surface,
    "--color-surface-muted": tokens.surfaceMuted,
    "--color-foreground": tokens.foreground,
    "--color-foreground-muted": tokens.foregroundMuted,
    "--color-foreground-subtle": tokens.foregroundSubtle,
    "--color-border": tokens.border,
    "--color-border-strong": tokens.borderStrong,
    "--color-success": tokens.success,
    "--color-warning": tokens.warning,
    "--color-danger": tokens.danger,
    "--color-info": tokens.info,
    "--color-sale": tokens.sale,
    "--color-stock-ready": tokens.stockReady,
    "--color-stock-low": tokens.stockLow,
    "--color-stock-out": tokens.stockOut,
    "--color-rating": tokens.rating,
    "--color-verified": tokens.verified,
  } as const;
}
