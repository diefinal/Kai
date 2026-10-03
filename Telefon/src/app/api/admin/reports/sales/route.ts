import { NextResponse } from "next/server";
import { getDateRangeFromPreset, DateFilterPreset } from "@/lib/reports/date-utils";
import { getSalesReport } from "@/lib/reports/reports-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = (searchParams.get("preset") as DateFilterPreset) || "THIS_MONTH";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);
    const data = await getSalesReport({
      startDate,
      endDate,
      brand,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Sales report API error:", error);
    return NextResponse.json(
      { success: false, error: "Satış raporu alınırken hata oluştu." },
      { status: 500 }
    );
  }
}
