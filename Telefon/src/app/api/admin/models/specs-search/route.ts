import { NextResponse } from "next/server";
import { NormalizedPhoneSpecs } from "@/types";
import { formatNormalizedSpecs } from "@/data/productSpecs";

export const dynamic = "force-dynamic";

/**
 * Strict Brand & Model Qualifier Validation Engine
 * Ensures target query (e.g. "Samsung Galaxy S25 Ultra") NEVER matches wrong models (e.g. "Galaxy Fame Lite Duos S6792L")
 */
function isStrictBrandAndModelMatch(
  targetBrand: string,
  targetModelName: string,
  candidateBrand: string,
  candidateName: string
): boolean {
  const norm = (str: string) =>
    str
      .toLowerCase()
      .replace(/\+/g, " plus ")
      .replace(/\bplus\b/g, " plus ")
      .replace(/[-_,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tb = norm(targetBrand);
  const cb = norm(candidateBrand);

  // 1. Brand match check
  if (tb && cb && !cb.includes(tb) && !tb.includes(cb)) {
    return false;
  }

  const normTarget = norm(targetModelName);
  const normCandidate = norm(candidateName);

  // Remove generic brand words
  const removeBrands = (str: string) =>
    str
      .replace(/\b(apple|samsung|xiaomi|infinix|galaxy|iphone|redmi|poco)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const cleanTarget = removeBrands(normTarget);
  const cleanCandidate = removeBrands(normCandidate);

  // Critical model qualifiers that MUST NOT be mismatched
  const qualifiers = ["pro", "ultra", "max", "plus", "fe", "lite", "duos", "mini", "se", "note"];

  for (const q of qualifiers) {
    const targetHas = new RegExp(`\\b${q}\\b`, "i").test(cleanTarget);
    const candidateHas = new RegExp(`\\b${q}\\b`, "i").test(cleanCandidate);

    // If user searched for a specific qualifier (e.g. 'ultra' or 'pro'), candidate MUST have it
    if (targetHas && !candidateHas) {
      return false;
    }

    // If candidate has a conflicting/unrequested downgrade qualifier (e.g. 'lite', 'duos', 'mini'), reject if target didn't ask for it
    if (!targetHas && candidateHas && (q === "lite" || q === "duos" || q === "mini" || q === "se")) {
      return false;
    }
  }

  // Number matching (e.g. '17', '25', '15', '50', '30')
  const targetNums: string[] = cleanTarget.match(/\b\d+\b/g) || [];
  const candidateNums: string[] = cleanCandidate.match(/\b\d+\b/g) || [];

  for (const num of targetNums) {
    const found = candidateNums.includes(num);
    if (!found) {
      return false;
    }
  }

  return true;
}

/**
 * Convert MobileAPI raw device detail into NormalizedPhoneSpecs
 */
function normalizeMobileApiDevice(
  deviceDetail: Record<string, unknown>,
  sourceDeviceId: number
): NormalizedPhoneSpecs {
  const display = (deviceDetail.display as Record<string, unknown>) || {};
  const platform = (deviceDetail.platform as Record<string, unknown>) || {};
  const mainCam = (deviceDetail.main_camera as Record<string, unknown>) || {};
  const selfieCam = (deviceDetail.selfie_camera as Record<string, unknown>) || {};
  const battery = (deviceDetail.battery as Record<string, unknown>) || {};
  const comms = (deviceDetail.comms as Record<string, unknown>) || {};
  const body = (deviceDetail.body as Record<string, unknown>) || {};
  const network = (deviceDetail.network as Record<string, unknown>) || {};

  // Display fields
  const displaySize = (display.size as string) || (deviceDetail.screen_resolution as string) || "Veri yok";
  const displayTechnology = (display.type as string) || "Veri yok";
  const resolution = (display.resolution as string) || (deviceDetail.screen_resolution as string) || "Veri yok";
  const displayProtection = (display.protection as string) || "Veri yok";
  
  // Extract refresh rate if mentioned in display.type
  let refreshRate = "Veri yok";
  if (displayTechnology.includes("120Hz") || displayTechnology.includes("120 Hz")) {
    refreshRate = "120 Hz";
  } else if (displayTechnology.includes("144Hz") || displayTechnology.includes("144 Hz")) {
    refreshRate = "144 Hz";
  } else if (displayTechnology.includes("90Hz") || displayTechnology.includes("90 Hz")) {
    refreshRate = "90 Hz";
  } else if (displayTechnology.includes("60Hz") || displayTechnology.includes("60 Hz")) {
    refreshRate = "60 Hz";
  }

  // Performance
  const chipset = (platform.chipset as string) || (deviceDetail.hardware as string) || "Veri yok";
  const operatingSystem = (platform.os as string) || "Veri yok";

  // Camera
  const mainCamera = (mainCam.modules as string) || (deviceDetail.camera as string) || "Veri yok";
  const frontCamera = (selfieCam.modules as string) || "Veri yok";

  // Battery & Charging
  const batteryCapacity = (deviceDetail.battery_capacity as string) || (battery.type as string) || "Veri yok";
  let fastCharging = "Veri yok";
  let wirelessCharging = "Veri yok";

  if (battery.charging) {
    const chargingStr = String(battery.charging);
    if (chargingStr.toLowerCase().includes("wired") || chargingStr.toLowerCase().includes("w ") || chargingStr.toLowerCase().includes("quick charge")) {
      fastCharging = chargingStr.split(";")[0] || chargingStr;
    }
    if (chargingStr.toLowerCase().includes("wireless") || chargingStr.toLowerCase().includes("magsafe") || chargingStr.toLowerCase().includes("qi")) {
      wirelessCharging = chargingStr;
    }
  }

  // Connectivity
  const has5G = Boolean(
    network.bands_5g ||
    (network.technology && String(network.technology).includes("5G")) ||
    (deviceDetail.name && String(deviceDetail.name).includes("5G"))
  );
  const fiveG = has5G;
  const nfc = comms.nfc ? (comms.nfc === "Yes" || comms.nfc === "Yes (market/region dependent)") : undefined;
  const wifi = (comms.wlan as string) || "Veri yok";
  const bluetooth = (comms.bluetooth as string) || "Veri yok";

  // Design & Durability
  let waterResistance = "Veri yok";
  if (body.other && String(body.other).toLowerCase().includes("ip")) {
    const match = String(body.other).match(/IP\d{2}/i);
    if (match) {
      waterResistance = match[0].toUpperCase();
    } else {
      waterResistance = body.other as string;
    }
  }

  const dimensions = (body.dimensions as string) || (deviceDetail.thickness as string) || "Veri yok";
  const weight = (body.weight as string) || (deviceDetail.weight as string) || "Veri yok";

  return {
    source: "MobileAPI.dev",
    sourceUrl: `https://mobileapi.dev/devices/${sourceDeviceId}/`,
    sourceDeviceId,
    lastUpdated: "23 Eylül 2026",
    displaySize: displaySize !== "Veri yok" ? displaySize : null,
    displayTechnology: displayTechnology !== "Veri yok" ? displayTechnology : null,
    refreshRate: refreshRate !== "Veri yok" ? refreshRate : null,
    resolution: resolution !== "Veri yok" ? resolution : null,
    displayProtection: displayProtection !== "Veri yok" ? displayProtection : null,
    chipset: chipset !== "Veri yok" ? chipset : null,
    mainCamera: mainCamera !== "Veri yok" ? mainCamera : null,
    frontCamera: frontCamera !== "Veri yok" ? frontCamera : null,
    batteryCapacity: batteryCapacity !== "Veri yok" ? batteryCapacity : null,
    fastCharging: fastCharging !== "Veri yok" ? fastCharging : null,
    wirelessCharging: wirelessCharging !== "Veri yok" ? wirelessCharging : null,
    fiveG,
    nfc,
    wifi: wifi !== "Veri yok" ? wifi : null,
    bluetooth: bluetooth !== "Veri yok" ? bluetooth : null,
    waterResistance: waterResistance !== "Veri yok" ? waterResistance : null,
    dimensions: dimensions !== "Veri yok" ? dimensions : null,
    weight: weight !== "Veri yok" ? weight : null,
    operatingSystem: operatingSystem !== "Veri yok" ? operatingSystem : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand") || "";
    const modelName = searchParams.get("modelName") || "";

    if (!modelName) {
      return NextResponse.json(
        { success: false, error: "Model adı belirtilmedi." },
        { status: 400 }
      );
    }

    const query = `${brand} ${modelName}`.trim();
    const apiKey = process.env.MOBILEAPI_API_KEY;

    // Primary Source: MobileAPI.dev
    if (apiKey) {
      try {
        const searchUrl = `https://api.mobileapi.dev/devices/search/?name=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const rawDevices: Record<string, unknown>[] = searchData.devices || [];

          // Apply Strict Brand & Model Matching Filter
          const validCandidates = rawDevices.filter((dev) =>
            isStrictBrandAndModelMatch(
              brand,
              modelName,
              (dev.manufacturer_name as string) || brand,
              (dev.name as string) || ""
            )
          );

          if (validCandidates.length === 0) {
            return NextResponse.json({
              success: false,
              error: "Güvenilir bir teknik özellik eşleşmesi bulunamadı.",
              matchedQuery: query,
            });
          }

          // Fetch full specs for up to top 3 valid candidates
          const candidatesToFetch = validCandidates.slice(0, 3);
          const candidatesData = [];

          for (const cand of candidatesToFetch) {
            try {
              const detailUrl = `https://api.mobileapi.dev/devices/${cand.id}/`;
              const detailRes = await fetch(detailUrl, {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Accept: "application/json",
                },
                cache: "no-store",
              });

              if (detailRes.ok) {
                const fullDetail = await detailRes.json();
                const normalizedSpecs = normalizeMobileApiDevice(fullDetail, cand.id as number);
                const matchedTitle = `${cand.manufacturer_name || brand} ${cand.name}`;

                candidatesData.push({
                  id: cand.id,
                  matchedTitle,
                  source: "MobileAPI.dev",
                  sourceUrl: `https://mobileapi.dev/devices/${cand.id}/`,
                  lastUpdated: "23 Eylül 2026",
                  specs: normalizedSpecs,
                  previewCategories: formatNormalizedSpecs(cand.name as string, normalizedSpecs).categories,
                });
              }
            } catch (err) {
              console.error(`Detail fetch failed for device ${cand.id}:`, err);
            }
          }

          if (candidatesData.length > 0) {
            const topCandidate = candidatesData[0];
            return NextResponse.json({
              success: true,
              data: {
                matchedTitle: topCandidate.matchedTitle,
                source: topCandidate.source,
                sourceUrl: topCandidate.sourceUrl,
                lastUpdated: topCandidate.lastUpdated,
                specs: topCandidate.specs,
                previewCategories: topCandidate.previewCategories,
                candidates: candidatesData,
              },
            });
          }
        } else {
          console.warn(`MobileAPI search returned status ${searchRes.status}`);
        }
      } catch (mobileApiErr) {
        console.error("MobileAPI fetch exception:", mobileApiErr);
      }
    }

    // Fallback: If no MobileAPI result or network issue, notify cleanly
    return NextResponse.json({
      success: false,
      error: "Güvenilir bir teknik özellik eşleşmesi bulunamadı.",
      matchedQuery: query,
    });
  } catch (error: unknown) {
    console.error("Specs Search Route Error:", error);
    return NextResponse.json(
      { success: false, error: "Teknik özellik araması sırasında bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
