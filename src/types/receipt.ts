export interface Receipt {
  id: string;
  itemName: string;
  borrowerName: string;
  date: string;
  photoUrl: string;
  timestamp: number;
  serialNumber?: string;
  category: string;
  condition?: string;
  notes?: string;
}

export type ReceiptCategory = 
  | "Weapons"
  | "Optics"
  | "Radios/Comms"
  | "PPE"
  | "Tools"
  | "Vehicles"
  | "Medical"
  | "Other";

export const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  "Weapons",
  "Optics",
  "Radios/Comms",
  "PPE",
  "Tools",
  "Vehicles",
  "Medical",
  "Other",
];
