export type CloudinaryPreset =
  | "lcp"
  | "detail"
  | "zoom"
  | "card"
  | "thumb"
  | "gallery"
  | "natural"
  | "square"
  | "portrait"
  | "banner"
  | "preview"
  | "icon"
  | "sponsor";

const TRANSFORMS: Record<CloudinaryPreset, string> = {
  lcp: "f_auto,q_auto,dpr_auto,w_1400,c_limit",
  detail: "f_auto,q_auto,dpr_auto,w_1000,c_limit",
  zoom: "f_auto,q_auto,dpr_auto,w_1800,c_limit",
  card: "f_auto,q_auto,dpr_auto,w_640,c_limit",
  thumb: "f_auto,q_auto,dpr_auto,w_180,c_limit",
  gallery: "f_auto,q_auto,dpr_auto,w_800,c_limit",
  natural: "f_auto,q_auto,dpr_auto,w_1200,c_limit",
  square: "f_auto,q_auto,dpr_auto,w_800,h_800,c_fill,g_auto",
  portrait: "f_auto,q_auto,dpr_auto,w_800,h_1066,c_fill,g_auto",
  banner: "f_auto,q_auto,dpr_auto,w_1800,h_800,c_fill,g_auto",
  preview: "f_auto,q_auto,dpr_auto,w_480,h_320,c_fill,g_auto",
  icon: "f_auto,q_auto,dpr_auto,w_48,h_48,c_fill,g_auto",
  sponsor: "f_auto,q_auto,dpr_auto,h_160,c_limit",
};

export function cloudinaryImage(
  src: string | null | undefined,
  preset: CloudinaryPreset = "natural"
): string {
  if (!src) return "/placeholder.png";
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }

  return src.replace("/upload/", `/upload/${TRANSFORMS[preset]}/`);
}

export function cloudinarySrcSet(
  src: string | null | undefined,
  presets: CloudinaryPreset[] = ["thumb", "card", "detail"]
): string[] {
  return presets.map((preset) => cloudinaryImage(src, preset));
}
