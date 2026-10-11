import { NextResponse } from "next/server";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";
import { storeConfig } from "@/config/store";
import { resolveBiteshipRuntimeConfig } from "@/infrastructure/tenant-config/provider-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BiteshipArea = {
  id: string;
  name: string;
  postal_code?: number | string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
};

export async function GET(request: Request) {
  try {
    assertSingleStoreMode("shipping areas");
    const input = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (input.length < 3) {
      return NextResponse.json({ areas: [] });
    }
    if (input.length > 100) {
      return NextResponse.json({ error: "Pencarian wilayah terlalu panjang." }, { status: 400 });
    }

    const config = await resolveBiteshipRuntimeConfig(storeConfig.tenantId);
    if (!config.enabled || !config.apiKey.trim()) {
      return NextResponse.json({ error: "Pencarian wilayah membutuhkan konfigurasi Biteship aktif." }, { status: 503 });
    }

    const url = new URL("https://api.biteship.com/v1/maps/areas");
    url.searchParams.set("countries", "ID");
    url.searchParams.set("input", input);
    url.searchParams.set("type", "single");
    const response = await fetch(url, {
      headers: { Authorization: config.apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json() as { areas?: BiteshipArea[]; message?: string };
    if (!response.ok) {
      return NextResponse.json({ error: payload.message ?? "Wilayah belum dapat dicari." }, { status: 502 });
    }
    const areas = (payload.areas ?? []).filter((area) => area.id && area.name).slice(0, 8).map((area) => ({
      id: area.id,
      name: area.name,
      postalCode: String(area.postal_code ?? ""),
      province: area.administrative_division_level_1_name ?? "",
      city: area.administrative_division_level_2_name ?? "",
      district: area.administrative_division_level_3_name ?? "",
    }));
    return NextResponse.json({ areas });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Wilayah belum dapat dicari." }, { status: 400 });
  }
}
