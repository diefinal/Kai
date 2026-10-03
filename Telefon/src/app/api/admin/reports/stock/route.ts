import { NextResponse } from "next/server";
import { getStockReport } from "@/lib/reports/reports-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getStockReport();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Stock report API error:", error);
    return NextResponse.json(
      { success: false, error: "Stok raporu alınırken hata oluştu." },
      { status: 500 }
    );
  }
}
