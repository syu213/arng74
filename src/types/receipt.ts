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
  // Header Information
  soldierName: string;
  rankGrade: string;
  dodId: string;
  ssnPid: string;
  unit: string;
  cifCode: string;
  reportDate: string;

  // Line Items
  items: OCIEItem[];

  // Footer/Verification
  totalValue?: number;
  isSigned: boolean;
  signatureText?: string;
  statementDate?: string;

  // OCR Metadata
  ocrConfidence: OCRConfidence;
  extractionWarnings?: string[];
}

export interface OCIEItem {
  id: string;
  // Table Columns
  issuingCif: string;          // Column 1: ISSUING CIF
  lin: string;                 // Column 2: LIN (Line Item Number)
  size: string;                // Column 3: SIZE
  nomenclature: string;         // Column 4: NOMENCLATURE (Item Description)
  edition?: string;            // Column 5: EDITION (if present)
  fig?: string;                // Column 6: FIG (Figure number)
  withPc?: string;             // Column 7: W/PC (With/Without Component)
  partialNsn: string;          // Column 8: PARTIAL NSN (first 4 digits)
  nsn: string;                 // Full 13-digit National Stock Number

  // Quantity Information
  quantities: {
    authorized: number;         // AUTH QTY
    onHand: number;            // OH QTY (On-Hand Quantity)
    dueOut: number;            // DUE OUT
  };

  // Transfer Flags
  flags: {
    pcsTrans: boolean;         // PCS TRANS (Permanent Change of Station)
    etsTrans: boolean;         // ETS TRANS (Expiration of Term of Service)
  };

  // OCR Validation
  confidence: OCRConfidence;
  issues: string[];           // Data quality issues (e.g., 'NSN format invalid')
}

// OCR confidence scoring
export interface OCRConfidence {
  overall: number;            // 0-100 overall confidence
  header: number;             // Header extraction confidence
  items: number;              // Line items extraction confidence
  fields: Record<string, number>; // Per-field confidence scores
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
