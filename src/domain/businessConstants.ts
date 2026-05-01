/** Golden Seeds Co. — mandatory business vocabulary. */

export const CUSTOMER_SEGMENTS = [
  'Farmers',
  'Manufacturers',
  'Traders',
  'Agricultural Associations',
] as const

export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number]

export function isValidCustomerSegment(value: string): value is CustomerSegment {
  return (CUSTOMER_SEGMENTS as readonly string[]).includes(value)
}

/** Storage handling for received seed potato lots. */
export const STORAGE_CATEGORIES = [
  'Cold storage',
  'Controlled atmosphere',
  'General warehouse',
] as const

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number]

export function isValidStorageCategory(value: string): value is StorageCategory {
  return (STORAGE_CATEGORIES as readonly string[]).includes(value)
}

/** Canonical supplier → origin (import programme). */
export const SUPPLIER_DEFAULT_ORIGIN: Record<string, 'France' | 'Scotland'> = {
  SUP_ELORN: 'France',
  SUP_SMILLIE: 'Scotland',
}

export const ORIGIN_OPTIONS = ['France', 'Scotland'] as const

/** Inspecting body for agricultural quarantine (single authorised option in this workflow). */
export const QUARANTINE_INSPECTING_BODY = 'Agricultural Quarantine Authority' as const

/** Inbound quantity correction reasons (before quarantine inspection is finalised). */
export const INBOUND_QUANTITY_CORRECTION_REASONS = [
  'Misrouted container',
  'Unloading discrepancy',
  'Measurement error',
  'Damage',
  'Other',
] as const

export type InboundQuantityCorrectionReason =
  (typeof INBOUND_QUANTITY_CORRECTION_REASONS)[number]

export function isValidInboundQuantityCorrectionReason(
  value: string,
): value is InboundQuantityCorrectionReason {
  return (INBOUND_QUANTITY_CORRECTION_REASONS as readonly string[]).includes(value)
}
