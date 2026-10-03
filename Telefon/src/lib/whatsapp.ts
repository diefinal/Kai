import { APP_CONFIG } from "./constants";

export interface WhatsAppMessageParams {
  brand: string;
  modelName: string;
  ram?: string;
  storage?: string;
  color?: string;
  inStock: boolean;
}

/**
 * Müşterinin ürün sayfasından tek tıkla WhatsApp talebi oluşturması için link üretir.
 * Stok > 0 ise "bilgi almak istiyorum"
 * Stok = 0 ise "3 gün içinde teslim hakkında bilgi almak istiyorum"
 */
export function generateWhatsAppLink(params: WhatsAppMessageParams): string {
  const { brand, modelName, ram, storage, color, inStock } = params;
  
  const formattedRam = ram ? (ram.toUpperCase().includes("RAM") ? ram : `${ram} RAM`) : "";
  const parts = [brand, modelName, formattedRam, storage, color ? color.trim() : ""].filter(Boolean);
  const variantTitle = parts.join(" / ");

  let messageText = "";
  if (inStock) {
    messageText = `Merhaba, ${variantTitle} modeli hakkında bilgi almak istiyorum.`;
  } else {
    messageText = `Merhaba, ${variantTitle} modeli için 3 gün içinde teslim hakkında bilgi almak istiyorum.`;
  }

  const encodedMessage = encodeURIComponent(messageText);
  return `https://wa.me/${APP_CONFIG.whatsappCleanNumber}?text=${encodedMessage}`;
}
