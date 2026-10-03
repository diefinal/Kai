import { NextResponse } from "next/server";
import https from "https";

export const dynamic = "force-dynamic";

interface ExchangeRateData {
  success: boolean;
  source: string;
  date: string;
  lastUpdated: string;
  isFallback: boolean;
  rates: {
    USD: { buying: number; selling: number };
    EUR: { buying: number; selling: number };
  };
}

// In-Memory Server Cache & Fallback Store
let cachedExchangeRates: {
  data: ExchangeRateData;
  timestamp: number;
} | null = null;

// Standard Fallback Rates (Used if TCMB is offline and no cache exists)
const HARDCODED_FALLBACK: ExchangeRateData = {
  success: true,
  source: "TCMB (Son Güncel Veri)",
  date: new Date().toLocaleDateString("tr-TR"),
  lastUpdated: new Date().toISOString(),
  isFallback: true,
  rates: {
    USD: { buying: 48.75, selling: 48.84 },
    EUR: { buying: 55.65, selling: 55.75 },
  },
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 Dakika Server Cache

function fetchTCMBXml(): Promise<ExchangeRateData> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "www.tcmb.gov.tr",
      path: "/kurlar/today.xml",
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      minVersion: "TLSv1.2" as const,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`TCMB HTTP Status: ${res.statusCode}`));
          }

          const dateMatch = data.match(/Tarih_Date\s+Tarih="([^"]+)"/);
          const date = dateMatch
            ? dateMatch[1]
            : new Date().toLocaleDateString("tr-TR");

          // USD
          const usdMatch = data.match(
            /<Currency[^>]*CurrencyCode="USD"[\s\S]*?<\/Currency>/
          );
          let usdBuying = 0;
          let usdSelling = 0;
          if (usdMatch) {
            const b = usdMatch[0].match(/<ForexBuying>([^<]*)<\/ForexBuying>/);
            const s = usdMatch[0].match(/<ForexSelling>([^<]*)<\/ForexSelling>/);
            usdBuying = b ? parseFloat(b[1]) || 0 : 0;
            usdSelling = s ? parseFloat(s[1]) || 0 : 0;
          }

          // EUR
          const eurMatch = data.match(
            /<Currency[^>]*CurrencyCode="EUR"[\s\S]*?<\/Currency>/
          );
          let eurBuying = 0;
          let eurSelling = 0;
          if (eurMatch) {
            const b = eurMatch[0].match(/<ForexBuying>([^<]*)<\/ForexBuying>/);
            const s = eurMatch[0].match(/<ForexSelling>([^<]*)<\/ForexSelling>/);
            eurBuying = b ? parseFloat(b[1]) || 0 : 0;
            eurSelling = s ? parseFloat(s[1]) || 0 : 0;
          }

          if (usdBuying === 0 || eurBuying === 0) {
            return reject(new Error("Kur verileri XML'den okunamadı."));
          }

          resolve({
            success: true,
            source: "TCMB (Türkiye Cumhuriyet Merkez Bankası)",
            date,
            lastUpdated: new Date().toISOString(),
            isFallback: false,
            rates: {
              USD: { buying: usdBuying, selling: usdSelling },
              EUR: { buying: eurBuying, selling: eurSelling },
            },
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error("TCMB Zaman Aşımı"));
    });
    req.end();
  });
}

export async function GET() {
  const now = Date.now();

  // 1. Önbellek kontrolü (Cache TTL 30 dakika)
  if (cachedExchangeRates && now - cachedExchangeRates.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedExchangeRates.data);
  }

  try {
    // 2. TCMB Resmi Servisine Server-Side İstek
    const liveData = await fetchTCMBXml();

    // Cache Güncelleme
    cachedExchangeRates = {
      data: liveData,
      timestamp: now,
    };

    return NextResponse.json(liveData);
  } catch (error: unknown) {
    console.warn("TCMB Kur Servisine erişilemedi, fallback kullanılıyor:", error);

    // 3. Fallback Mantığı: Daha önce cache varsa onu kullan, yoksa hardcoded fallback kullan
    if (cachedExchangeRates) {
      const fallbackFromCache = {
        ...cachedExchangeRates.data,
        isFallback: true,
        source: `${cachedExchangeRates.data.source} (Önbellek)`,
      };
      return NextResponse.json(fallbackFromCache);
    }

    return NextResponse.json(HARDCODED_FALLBACK);
  }
}
