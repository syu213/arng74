// Form type discriminator
export type FormType = 'DA2062' | 'DA3161' | 'OCIE' | 'Generic';

// DA Form 2062 - Hand Receipt
export interface DA2062Receipt {
  handReceiptNumber: string;
  from: string;        // Unit/Issuer
  to: string;          // Recipient Name
  publicationDate: string;
  items: DA2062Item[];
  page: string;
  totalPages: string;
}

export interface DA2062Item {
  stockNumber: string;
  itemDescription: string;
  model?: string;
  securityCode: string;
  unitOfIssue: string;
  quantityAuth: number;
  quantities: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
  };
}

// DA Form 3161 - Request for Issue or Turn-In
export interface DA3161Receipt {
  requestNumber: string;
  voucherNumber: string;
  sendTo: string;
  dateRequired: string;
  dodAAC: string;
  priority: string;
  requestFrom: string;
  transactionType: 'ISSUE' | 'TURN-IN';
  items: DA3161Item[];
  signature?: string;
  date?: string;
}

export interface DA3161Item {
  itemNumber: number;
  stockNumber: string;
  itemDescription: string;
  unitOfIssue: string;
  quantity: number;
  code: string;
  supplyAction: string;
  unitPrice: number;
  totalCost: number;
}

// OCIE Record - Automated DA Form 3645
export interface OCIEReceipt {
  soldierName: string;
  rankGrade: string;
  ssnPid: string;
  unit: string;
  cifCode: string;
  reportDate: string;
  items: OCIEItem[];
  signature?: string;
  statementDate?: string;
}

export interface OCIEItem {
  issuingCif: string;
  lin: string;
  size: string;
  nomenclature: string;
  nsn: string;
  onHandQty: number;
  pcsTrans: boolean;
  etsTrans: boolean;
}

// Generic receipt data (for backward compatibility)
export interface GenericReceiptData {
  itemName: string;
  borrowerName: string;
  date: string;
  serialNumber?: string;
  category: string;
  condition?: string;
  notes?: string;
}

// Enhanced main Receipt interface
export interface Receipt {
  id: string;
  formType: FormType;
  photoUrl: string;
  timestamp: number;
  notes?: string;
  // Form-specific data
  data: DA2062Receipt | DA3161Receipt | OCIEReceipt | GenericReceiptData;
}

// Legacy receipt interface for migration
export interface LegacyReceipt {
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

// Form type definitions for UI
export const FORM_TYPE_LABELS: Record<FormType, string> = {
  'DA2062': 'DA Form 2062 - Hand Receipt',
  'DA3161': 'DA Form 3161 - Request/Turn-In',
  'OCIE': 'OCIE Record - DA Form 3645',
  'Generic': 'Generic Receipt'
};

// Type guards for form-specific data
export const isDA2062Receipt = (receipt: Receipt): receipt is Receipt & { data: DA2062Receipt } => {
  return receipt.formType === 'DA2062';
};

export const isDA3161Receipt = (receipt: Receipt): receipt is Receipt & { data: DA3161Receipt } => {
  return receipt.formType === 'DA3161';
};

export const isOCIEReceipt = (receipt: Receipt): receipt is Receipt & { data: OCIEReceipt } => {
  return receipt.formType === 'OCIE';
};

export const isGenericReceipt = (receipt: Receipt): receipt is Receipt & { data: GenericReceiptData } => {
  return receipt.formType === 'Generic';
};
