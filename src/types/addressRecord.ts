export interface GeneratedAddressRecord {
  id: string;
  index: number;
  addressP2SH: string; // 3... address
  addressBech32: string; // bc1q...
  addressLegacy: string; // 1...
  path: string;
  privKeyHex: string;
  wif: string;
  createdAt: number;
  label?: string;
}

const STORAGE_KEY = 'aegis_generated_address_records_v1';

export function loadAddressRecords(): GeneratedAddressRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAddressRecords(records: GeneratedAddressRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save address records to localStorage', e);
  }
}
