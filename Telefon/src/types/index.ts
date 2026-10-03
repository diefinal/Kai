/**
 * Public Vitrin DTO
 * KESİNLİKLE GİZLİ KALMASI GEREKENLER (DTO'da ASLA YER ALMAZ):
 * - imei
 * - purchasePrice (alış fiyatı)
 * - cost (maliyet)
 * - supplier / cari (tedarikçi)
 * - profit (kâr)
 * - notes (yönetim notları)
 */
export interface ColorAvailabilityDTO {
  color: string;
  inStock: boolean;
  stockCount?: number;
  imageUrl?: string | null;
}

export interface NormalizedPhoneSpecs {
  source: string;
  sourceUrl?: string | null;
  sourceDeviceId?: number | string | null;
  lastUpdated: string;
  displaySize?: string | null;
  displayTechnology?: string | null;
  refreshRate?: string | null;
  resolution?: string | null;
  displayProtection?: string | null;
  displayBrightness?: string | null;
  chipset?: string | null;
  gpu?: string | null;
  mainCamera?: string | null;
  frontCamera?: string | null;
  videoFeatures?: string | null;
  batteryCapacity?: string | null;
  fastCharging?: string | null;
  wirelessCharging?: string | null;
  fiveG?: boolean | string | null;
  nfc?: boolean | string | null;
  wifi?: string | null;
  bluetooth?: string | null;
  waterResistance?: string | null;
  dimensions?: string | null;
  weight?: string | null;
  operatingSystem?: string | null;
}

export interface PublicProductDTO {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  stockColors: string[];
  colorsWithStock?: ColorAvailabilityDTO[];
  colorImages?: Record<string, string> | null;
  specs?: NormalizedPhoneSpecs | null;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  inStock: boolean;
  stockCount: number;
  deliveryBadge: string;
}

export interface AuthUserPayload {
  userId: string;
  username: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
}

export interface PublicConnectedPhoneDTO {
  modelId: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  minSalePrice: number;
  inStock: boolean;
  whatsappLink: string;
}

export interface PublicAdDTO {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  position: "HERO_SLIDER" | "IN_FEED";
  displayType: "IMAGE_ONLY" | "IMAGE_AND_TEXT";
  buttonText: string;
  startDate: string;
  endDate: string | null;
  targetRam?: string | null;
  targetStorage?: string | null;
  connectedPhone?: PublicConnectedPhoneDTO | null;
}

export interface AdminAdDTO {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  phoneModelId: string | null;
  targetRam: string | null;
  targetStorage: string | null;
  buttonText: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  position: "HERO_SLIDER" | "IN_FEED";
  displayType: "IMAGE_ONLY" | "IMAGE_AND_TEXT";
  order: number;
  createdAt: string;
  updatedAt: string;
  phoneModel?: {
    id: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    color: string;
    basePrice: number;
    inStockCount: number;
  } | null;
}

export interface StockVariantOptionDTO {
  variantKey: string;
  modelId: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  stockCount: number;
  colors: string[];
  minSalePrice: number;
  displayText: string;
}

export type LeadStatus =
  | "YENI"
  | "KAPORA_BEKLENIYOR"
  | "KAPORA_ALINDI"
  | "TEDARIKTE"
  | "TESLIME_HAZIR"
  | "SATISA_DONUSTU"
  | "VAZGECTI";

export type DepositStatus =
  | "PENDING"
  | "RECEIVED"
  | "REFUNDED"
  | "NOT_REFUNDED";

export interface SalesLeadDTO {
  id: string;
  leadNumber: string;
  customerName: string;
  customerPhone: string;
  notes?: string | null;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  snapshotPrice: number;
  snapshotStock: boolean;
  status: LeadStatus;
  depositAmount: number;
  depositStatus: DepositStatus;
  depositMethod?: string | null;
  depositDate?: string | null;
  depositNotes?: string | null;
  depositRecordedBy?: string | null;
  refundAmount?: number | null;
  refundDate?: string | null;
  refundMethod?: string | null;
  refundNotes?: string | null;
  phoneModelId?: string | null;
  deviceId?: string | null;
  customerId?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt: string;
  deviceInfo?: {
    id: string;
    imei?: string | null;
    status: string;
  } | null;
}
