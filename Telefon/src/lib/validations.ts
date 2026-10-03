export function isValidIMEI(imei: string): boolean {
  if (!imei) return false;
  const cleaned = imei.trim();
  // IMEI genellikle 14-16 haneli rakamlardan oluşur
  return /^[0-9A-Za-z]{14,16}$/.test(cleaned);
}

export function parsePositiveDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (isNaN(num) || num < 0) return null;
  return num;
}
