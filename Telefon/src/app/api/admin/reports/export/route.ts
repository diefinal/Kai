import { NextResponse } from "next/server";
import { getDateRangeFromPreset, DateFilterPreset } from "@/lib/reports/date-utils";
import { generateReportExport } from "@/lib/reports/excel-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "sales";
    const preset = (searchParams.get("preset") as DateFilterPreset) || "THIS_MONTH";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const search = searchParams.get("search") || undefined;

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const exportData = await generateReportExport(tab, {
      startDate,
      endDate,
      brand,
      search,
    });

    return new NextResponse(new Uint8Array(exportData.buffer), {
      status: 200,
      headers: {
        "Content-Type": exportData.mimeType,
        "Content-Disposition": `attachment; filename="${exportData.filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Report export API error:", error);
    return NextResponse.json(
      { success: false, error: "Excel raporu oluşturulurken hata oluştu." },
      { status: 500 }
    );
  }
}
