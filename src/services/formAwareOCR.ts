import { FormType, DA2062Receipt, DA3161Receipt, OCIEReceipt, GenericReceiptData } from "@/types/receipt";
import { geminiOCRService } from "./gemini";

interface OCRResult {
  formType: FormType;
  data: DA2062Receipt | DA3161Receipt | OCIEReceipt | GenericReceiptData;
}

export class FormAwareOCRService {
  constructor() {
    // Check if we're in production (Vercel) and need to use the server API
    this.isProduction = import.meta.env.PROD;
  }

  private isProduction: boolean;

  async extractDataFromImage(imageFile: File): Promise<OCRResult> {
    console.log('🎯 Starting form-aware OCR analysis...');
    console.log('📊 Image file type:', imageFile.type);
    console.log('📏 Image size:', imageFile.size);
    console.log('🏗️ Environment:', this.isProduction ? 'Production (Vercel)' : 'Development');

    try {
      // Step 1: Detect form type
      const formType = await this.detectFormType(imageFile);
      console.log('📋 Detected form type:', formType);

      // Step 2: Use form-specific extraction
      let data: DA2062Receipt | DA3161Receipt | OCIEReceipt | GenericReceiptData;

      switch (formType) {
        case 'DA2062':
          data = await this.extractDA2062Data(imageFile);
          break;
        case 'DA3161':
          data = await this.extractDA3161Data(imageFile);
          break;
        case 'OCIE':
          data = await this.extractOCIEData(imageFile);
          break;
        default:
          data = await this.extractGenericData(imageFile);
          break;
      }

      console.log('✅ Form-specific extraction completed');
      return { formType, data };

    } catch (error) {
      console.error('❌ Form-aware OCR failed:', error);
      // Fallback to generic extraction
      console.log('🔄 Falling back to generic extraction...');
      const data = await this.extractGenericData(imageFile);
      return { formType: 'Generic', data };
    }
  }

  private async detectFormType(imageFile: File): Promise<FormType> {
    const detectionPrompt = `
Analyze this Army form image and identify which specific form type it is.

Look for these distinctive features:

1. DA FORM 2062 - HAND RECEIPT:
- Contains "HAND RECEIPT/ANNEX NUMBER" at the top
- Has grid columns labeled "a", "b", "c", "d", "e", "f"
- Contains "STOCK NUMBER", "ITEM DESCRIPTION" columns
- Has "FROM:" and "TO:" fields for units/personnel
- Contains quantity authorization fields
- Publication shows "DA FORM 2062"

2. DA FORM 3161 - REQUEST FOR ISSUE OR TURN-IN:
- Contains "REQUEST FOR ISSUE OR TURN-IN" at the top
- Has checkboxes for [ ] ISSUE | [ ] TURN-IN
- Contains fields: "REQUEST NO.", "VOUCHER NO.", "DODAAC"
- Has "PRIORITY" designator
- Contains "SEND TO:" and "REQUEST FROM:" fields
- Has line items with "ITEM NO.", "STOCK NO.", "QUANTITY"

3. OCIE RECORD (DA FORM 3645 or similar):
- Contains soldier information: "NAME:", "RANK/GRADE:", "SSN/PID:"
- Has "UNIT:" and "CIF CODE:" fields
- Contains columns: "LIN", "SIZE", "NOMENCLATURE", "NSN"
- Shows "OH QTY" (On-Hand Quantity)
- Has "PCS TRANS" and "ETS TRANS" columns
- Contains liability statement and signature line

4. GENERIC RECEIPT:
- None of the above specific Army form features
- May be a simple receipt, invoice, or handwritten note
- Lacks official Army form headers and structure

Respond with ONLY one of these exact values:
"DA2062" for Hand Receipt forms
"DA3161" for Request/Issue Turn-In forms
"OCIE" for OCIE/Personal Issue records
"Generic" for all other receipts

Analyze the entire form structure, headers, and column layouts to make the most accurate determination.
`;

    try {
      const result = await this.callGeminiForDetection(imageFile, detectionPrompt);

      // Clean and validate the response
      const cleanedResult = result.trim().toUpperCase();

      if (cleanedResult.includes('DA2062') || cleanedResult.includes('HAND RECEIPT')) {
        return 'DA2062';
      } else if (cleanedResult.includes('DA3161') || cleanedResult.includes('REQUEST FOR ISSUE')) {
        return 'DA3161';
      } else if (cleanedResult.includes('OCIE') || cleanedResult.includes('3645')) {
        return 'OCIE';
      } else {
        return 'Generic';
      }
    } catch (error) {
      console.error('Form type detection failed:', error);
      return 'Generic';
    }
  }

  private async extractDA2062Data(imageFile: File): Promise<DA2062Receipt> {
    const extractionPrompt = `
You are analyzing a DA Form 2062 - Hand Receipt for the U.S. Army National Guard.
Extract ALL information from this form with high accuracy.

Return ONLY a JSON object with these exact fields:

{
  "handReceiptNumber": "Complete hand receipt/annex number if visible",
  "from": "Unit or organization issuing the equipment",
  "to": "Name of the person receiving the equipment (include rank if visible)",
  "publicationDate": "Date from the form in MM/DD/YYYY format",
  "items": [
    {
      "stockNumber": "NSN or stock number (e.g., 1005-01-531-2345)",
      "itemDescription": "Complete item description including model numbers",
      "model": "Model number if separate from description",
      "securityCode": "Security classification (U, S, etc.)",
      "unitOfIssue": "Unit of issue (EA, SE, KIT, etc.)",
      "quantityAuth": "Authorized quantity as a number",
      "quantities": {
        "A": 0,
        "B": 0,
        "C": 0,
        "D": 0,
        "E": 0,
        "F": 0
      }
    }
  ],
  "page": "Current page number",
  "totalPages": "Total number of pages"
}

ANALYSIS GUIDELINES:
- Extract ALL line items visible in the grid
- For quantities (A-F), read the numbers from each column
- NSNs typically follow format: NNNN-NN-NNN-NNNN
- Include ranks and full names in the "to" field
- If a field is not visible, use empty string ""
- For quantities, use 0 if no entry is visible
- Include all items even if some fields are incomplete

Carefully analyze every field and line item on the form.
`;

    const result = await this.callGeminiForExtraction(imageFile, extractionPrompt);
    return this.parseDA2062Data(result);
  }

  private async extractDA3161Data(imageFile: File): Promise<DA3161Receipt> {
    const extractionPrompt = `
You are analyzing a DA Form 3161 - Request for Issue or Turn-In for the U.S. Army National Guard.
Extract ALL information from this form with high accuracy.

Return ONLY a JSON object with these exact fields:

{
  "requestNumber": "Request number from the form",
  "voucherNumber": "Voucher number if assigned",
  "sendTo": "Unit or organization receiving the request (Supply Support Activity)",
  "dateRequired": "Date material required in MM/DD/YYYY format",
  "dodAAC": "Department of Defense Activity Address Code",
  "priority": "Priority designator code",
  "requestFrom": "Unit making the request",
  "transactionType": "ISSUE" or "TURN-IN" based on the checkbox checked",
  "items": [
    {
      "itemNumber": 1,
      "stockNumber": "NSN or stock number",
      "itemDescription": "Complete item description",
      "unitOfIssue": "Unit of issue (EA, BX, KIT, etc.)",
      "quantity": "Quantity requested as a number",
      "code": "Reason code (I, R, etc.)",
      "supplyAction": "Supply action taken",
      "unitPrice": 0.00,
      "totalCost": 0.00
    }
  ],
  "signature": "Signature if visible",
  "date": "Date of signature in MM/DD/YYYY format"
}

ANALYSIS GUIDELINES:
- Check the checkboxes at the top to determine transaction type
- Extract ALL line items from the form
- NSNs follow federal supply classification format
- Look for priority codes, DODAACs, and request numbers
- For financial fields, extract as numbers (use 0 if not filled)
- Include all items even if some columns are empty
- Pay attention to military unit designations and codes

Carefully analyze every section including headers, grid items, and footer signatures.
`;

    const result = await this.callGeminiForExtraction(imageFile, extractionPrompt);
    return this.parseDA3161Data(result);
  }

  private async extractOCIEData(imageFile: File): Promise<OCIEReceipt> {
    const extractionPrompt = `
You are analyzing an OCIE (Organizational Clothing and Individual Equipment) Record, typically DA Form 3645 or similar.
Extract ALL soldier and equipment information from this form.

Return ONLY a JSON object with these exact fields:

{
  "soldierName": "Full name of the soldier (Last, First Middle)",
  "rankGrade": "Rank and grade (e.g., SGT/E-5, CPL/E-4)",
  "ssnPid": "Social Security Number or Personnel ID",
  "unit": "Unit designation (e.g., HHC, 337th EN BN)",
  "cifCode": "Central Issue Facility code",
  "reportDate": "Date of the report in MM/DD/YYYY format",
  "items": [
    {
      "issuingCif": "CIF that issued the item",
      "lin": "Line Item Number (short code)",
      "size": "Size (LRG, MED, SML, 10R, etc.)",
      "nomenclature": "Complete item description",
      "nsn": "National Stock Number",
      "onHandQty": "On-hand quantity as a number",
      "pcsTrans": "true or false if item transfers with PCS",
      "etsTrans": "true or false if item transfers with ETS"
    }
  ],
  "signature": "Soldier's signature if visible",
  "statementDate": "Date of liability statement in MM/DD/YYYY format"
}

ANALYSIS GUIDELINES:
- Extract the soldier's complete information from the header
- OCIE items typically include: uniforms, body armor, helmets, gear
- LIN codes are usually 4-6 character abbreviations
- NSNs follow the standard 13-digit format
- Sizes use military abbreviations (LRG, MED, SML, REG, etc.)
- PCS/ETS TRANS flags indicate if items move with the soldier
- Look for liability statements and signature lines
- Include ALL equipment items listed on the form

This is a government document used for tracking individual soldier equipment accountability.
`;

    const result = await this.callGeminiForExtraction(imageFile, extractionPrompt);
    return this.parseOCIEData(result);
  }

  private async extractGenericData(imageFile: File): Promise<GenericReceiptData> {
    // Use the existing Gemini OCR service for generic extraction
    const extractedData = await geminiOCRService.extractDataFromImage(imageFile);

    return {
      itemName: extractedData.itemName || '',
      borrowerName: extractedData.borrowerName || '',
      date: extractedData.date || '',
      serialNumber: extractedData.serialNumber || '',
      category: extractedData.category || 'Other',
      condition: extractedData.condition || '',
      notes: extractedData.notes || ''
    };
  }

  private async callGeminiForDetection(imageFile: File, prompt: string): Promise<string> {
    // Use a simplified call for form type detection
    // This can use the existing Gemini service infrastructure
    try {
      // In a real implementation, this would call the Gemini API
      // For now, we'll simulate with a basic detection
      const result = await this.makeGeminiCall(imageFile, prompt);
      return result;
    } catch (error) {
      console.error('Form detection call failed:', error);
      throw error;
    }
  }

  private async callGeminiForExtraction(imageFile: File, prompt: string): Promise<string> {
    try {
      const result = await this.makeGeminiCall(imageFile, prompt);
      return result;
    } catch (error) {
      console.error('Form extraction call failed:', error);
      throw error;
    }
  }

  private async makeGeminiCall(imageFile: File, prompt: string): Promise<string> {
    // Convert image to base64
    const base64Image = await this.fileToBase64(imageFile);

    // This would normally call the Gemini API
    // For Phase 1 implementation, we'll return a mock response
    // that can be replaced with actual API calls later

    // Simulate API response structure
    if (prompt.includes('Detect form type')) {
      // Mock form detection - in real implementation, this would analyze the image
      return 'Generic';
    } else {
      // Mock extraction - would be replaced with actual OCR
      return '{}';
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private parseDA2062Data(result: string): DA2062Receipt {
    try {
      const data = JSON.parse(result);
      return {
        handReceiptNumber: data.handReceiptNumber || '',
        from: data.from || '',
        to: data.to || '',
        publicationDate: data.publicationDate || '',
        items: Array.isArray(data.items) ? data.items.map(this.normalizeDA2062Item) : [],
        page: data.page || '',
        totalPages: data.totalPages || ''
      };
    } catch (error) {
      console.error('Failed to parse DA2062 data:', error);
      return this.getDefaultDA2062Data();
    }
  }

  private parseDA3161Data(result: string): DA3161Receipt {
    try {
      const data = JSON.parse(result);
      return {
        requestNumber: data.requestNumber || '',
        voucherNumber: data.voucherNumber || '',
        sendTo: data.sendTo || '',
        dateRequired: data.dateRequired || '',
        dodAAC: data.dodAAC || '',
        priority: data.priority || '',
        requestFrom: data.requestFrom || '',
        transactionType: data.transactionType === 'TURN-IN' ? 'TURN-IN' : 'ISSUE',
        items: Array.isArray(data.items) ? data.items.map(this.normalizeDA3161Item) : [],
        signature: data.signature || '',
        date: data.date || ''
      };
    } catch (error) {
      console.error('Failed to parse DA3161 data:', error);
      return this.getDefaultDA3161Data();
    }
  }

  private parseOCIEData(result: string): OCIEReceipt {
    try {
      const data = JSON.parse(result);
      return {
        soldierName: data.soldierName || '',
        rankGrade: data.rankGrade || '',
        ssnPid: data.ssnPid || '',
        unit: data.unit || '',
        cifCode: data.cifCode || '',
        reportDate: data.reportDate || '',
        items: Array.isArray(data.items) ? data.items.map(this.normalizeOCIEItem) : [],
        signature: data.signature || '',
        statementDate: data.statementDate || ''
      };
    } catch (error) {
      console.error('Failed to parse OCIE data:', error);
      return this.getDefaultOCIEData();
    }
  }

  private normalizeDA2062Item(item: any) {
    return {
      stockNumber: item.stockNumber || '',
      itemDescription: item.itemDescription || '',
      model: item.model || '',
      securityCode: item.securityCode || '',
      unitOfIssue: item.unitOfIssue || '',
      quantityAuth: Number(item.quantityAuth) || 0,
      quantities: {
        A: Number(item.quantities?.A) || 0,
        B: Number(item.quantities?.B) || 0,
        C: Number(item.quantities?.C) || 0,
        D: Number(item.quantities?.D) || 0,
        E: Number(item.quantities?.E) || 0,
        F: Number(item.quantities?.F) || 0
      }
    };
  }

  private normalizeDA3161Item(item: any) {
    return {
      itemNumber: Number(item.itemNumber) || 0,
      stockNumber: item.stockNumber || '',
      itemDescription: item.itemDescription || '',
      unitOfIssue: item.unitOfIssue || '',
      quantity: Number(item.quantity) || 0,
      code: item.code || '',
      supplyAction: item.supplyAction || '',
      unitPrice: Number(item.unitPrice) || 0,
      totalCost: Number(item.totalCost) || 0
    };
  }

  private normalizeOCIEItem(item: any) {
    return {
      issuingCif: item.issuingCif || '',
      lin: item.lin || '',
      size: item.size || '',
      nomenclature: item.nomenclature || '',
      nsn: item.nsn || '',
      onHandQty: Number(item.onHandQty) || 0,
      pcsTrans: Boolean(item.pcsTrans),
      etsTrans: Boolean(item.etsTrans)
    };
  }

  private getDefaultDA2062Data(): DA2062Receipt {
    return {
      handReceiptNumber: '',
      from: '',
      to: '',
      publicationDate: '',
      items: [],
      page: '',
      totalPages: ''
    };
  }

  private getDefaultDA3161Data(): DA3161Receipt {
    return {
      requestNumber: '',
      voucherNumber: '',
      sendTo: '',
      dateRequired: '',
      dodAAC: '',
      priority: '',
      requestFrom: '',
      transactionType: 'ISSUE',
      items: [],
      signature: '',
      date: ''
    };
  }

  private getDefaultOCIEData(): OCIEReceipt {
    return {
      soldierName: '',
      rankGrade: '',
      ssnPid: '',
      unit: '',
      cifCode: '',
      reportDate: '',
      items: [],
      signature: '',
      statementDate: ''
    };
  }
}

export const formAwareOCRService = new FormAwareOCRService();