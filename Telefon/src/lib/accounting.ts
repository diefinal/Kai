import { formatCurrency } from "./utils";

export interface CariBalanceStatus {
  label: "Bizim Alacağımız" | "Bizim Borcumuz" | "Borcu Yok / Hesap Kapalı";
  amount: number;
  formattedText: string;
  type: "RECEIVABLE" | "PAYABLE" | "SETTLED";
}

/**
 * Cari bakiye standardı:
 * Bakiye > 0 => Bizim Alacağımız (Müşteri borçlu)
 * Bakiye < 0 => Bizim Borcumuz (Biz tedarikçiye borçluyuz)
 * Bakiye == 0 => Hesap Kapalı / Borcu Yok
 */
export function getCariBalanceStatus(balance: number | string | { toString(): string }): CariBalanceStatus {
  const num = typeof balance === "number" ? balance : Number(balance.toString());
  const rounded = Math.round(num * 100) / 100;

  if (rounded > 0.009) {
    return {
      label: "Bizim Alacağımız",
      amount: rounded,
      formattedText: `${formatCurrency(rounded)} (Alacağımız)`,
      type: "RECEIVABLE",
    };
  } else if (rounded < -0.009) {
    const abs = Math.abs(rounded);
    return {
      label: "Bizim Borcumuz",
      amount: abs,
      formattedText: `${formatCurrency(abs)} (Borcumuz)`,
      type: "PAYABLE",
    };
  } else {
    return {
      label: "Borcu Yok / Hesap Kapalı",
      amount: 0,
      formattedText: "Borcu Yok",
      type: "SETTLED",
    };
  }
}
