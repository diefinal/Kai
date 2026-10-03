import { NextResponse } from "next/server";
import { getDateRangeFromPreset, DateFilterPreset } from "@/lib/reports/date-utils";
import { getOverviewReport } from "@/lib/reports/reports-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = (searchParams.get("preset") as DateFilterPreset) || "THIS_MONTH";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);
    const data = await getOverviewReport({ startDate, endDate });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Overview report API error:", error);
    return NextResponse.json(
      { success: false, error: "Genel bakış raporu alınırken hata oluştu." },
      { status: 500 }
    );
  }
}
