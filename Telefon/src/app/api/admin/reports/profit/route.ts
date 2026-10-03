import { NextResponse } from "next/server";
import { getDateRangeFromPreset, DateFilterPreset } from "@/lib/reports/date-utils";
import { getProfitReport } from "@/lib/reports/reports-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = (searchParams.get("preset") as DateFilterPreset) || "THIS_MONTH";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const search = searchParams.get("search") || undefined;

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);
    const data = await getProfitReport({
      startDate,
      endDate,
      brand,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Profit report API error:", error);
    return NextResponse.json(
      { success: false, error: "Kâr raporu alınırken hata oluştu." },
      { status: 500 }
    );
  }
}
