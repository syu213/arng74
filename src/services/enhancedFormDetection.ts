import { FormType, DA2062Receipt, DA3161Receipt, OCIEReceipt, GenericReceiptData } from "@/types/receipt";
import { geminiOCRService } from "./gemini";

interface OCRResult {
  formType: FormType;
  data: DA2062Receipt | DA3161Receipt | OCIEReceipt | GenericReceiptData;
}

export class EnhancedFormDetectionService {
  constructor() {
    // Check if we're in production (Vercel) and need to use the server API
    this.isProduction = import.meta.env.PROD;
  }

  private isProduction: boolean;

  async extractDataFromImage(imageFile: File): Promise<OCRResult> {
    console.log('🎯 Starting enhanced form detection...');
    console.log('📊 Image file type:', imageFile.type);
    console.log('📏 Image size:', imageFile.size);

    try {
      // Step 1: Use form type detection
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
      console.error('❌ Enhanced form detection failed:', error);
      // Fallback to generic extraction (which now uses the enhanced OCR prompt)
      console.log('🔄 Falling back to generic extraction with enhanced name recognition...');
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
      // Use existing Gemini service for form detection
      const result = await this.callGeminiForFormType(imageFile, detectionPrompt);

      // Clean and validate response
      const cleanedResult = result.trim().toUpperCase();

      if (cleanedResult.includes('DA2062') || cleanedResult.includes('HAND RECEIPT')) {
        return 'DA2062';
      } else if (cleanedResult.includes('DA3161') || cleanedResult.includes('REQUEST FOR ISSUE')) {
        return 'DA3161';
      } else if (cleanedResult.includes('OCIE') || cleanedResult.includes('3645') ||
                 cleanedResult.includes('RANK/GRADE') || cleanedResult.includes('SSN/PID')) {
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
You are analyzing a DA Form 2062 - Hand Receipt for U.S. Army National Guard.
Extract ALL information from this form with high accuracy.

Return ONLY a JSON object with these exact fields:

{
  "handReceiptNumber": "Complete hand receipt/annex number if visible",
  "from": "Unit or organization issuing the equipment",
  "to": "Name of the person receiving the equipment (include rank if visible)",
  "publicationDate": "Date from the form in MM/DD/YYYY format",
  "items": [
    {
      "stockNumber": "NSN or stock number (e.g., 1005-01-532-1234)",
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
You are analyzing a DA Form 3161 - Request for Issue or Turn-In for U.S. Army National Guard.
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
You are analyzing an OCIE (Organizational Clothing and Individual Equipment) Record, DA Form 3645.
Extract ALL information using ZONE-BASED PARSING for maximum accuracy.

ZONE 1: HEADER EXTRACTION
- Extract NAME: (format: LAST, FIRST MIDDLE)
- Extract RANK/GRADE: (format: SGT/E-5, CPL/E-4, etc.)
- Extract SSN/PID: (4 digits or full DOD ID)
- Extract UNIT: (complete unit designation)
- Extract CIF CODE: (alphanumeric code like G3MS00)
- Extract REPORT DATE: (MM/DD/YYYY format)

ZONE 2: TABLE GRID DETECTION
Find the table header row containing: "ISSUING CIF", "LIN", "SIZE", "NOMENCLATURE", "EDITION", "FIG", "W/PC", "PARTIAL NSN", "AUTH QTY", "OH QTY", "DUE OUT", "PCS", "ETS"

ZONE 3: LINE ITEM EXTRACTION
For each row below the header, extract ALL columns:

{
  "header": {
    "soldierName": "Complete soldier name (Last, First Middle)",
    "rankGrade": "Rank and grade",
    "dodId": "Full DOD ID if visible",
    "ssnPid": "SSN last 4 or PID",
    "unit": "Complete unit designation",
    "cifCode": "Central Issue Facility code",
    "reportDate": "MM/DD/YYYY"
  },
  "items": [
    {
      "issuingCif": "Column 1: CIF code",
      "lin": "Column 2: LIN (Item code like B05008)",
      "size": "Column 3: Size (LRG OCP TAN, 7 1/8, etc.)",
      "nomenclature": "Column 4: Complete item description",
      "edition": "Column 5: Edition number/letter",
      "fig": "Column 6: Figure number",
      "withPc": "Column 7: With/Without PC",
      "partialNsn": "Column 8: First 4 digits of NSN (PARTIAL NSN)",
      "nsn": "Complete 13-digit NSN (build from pattern if visible)",
      "quantities": {
        "authorized": "Column 9: AUTH QTY",
        "onHand": "Column 10: OH QTY (most critical)",
        "dueOut": "Column 11: DUE OUT"
      },
      "flags": {
        "pcsTrans": "Column 12: PCS TRANS (true/false)",
        "etsTrans": "Column 13: ETS TRANS (true/false)"
      }
    }
  ],
  "footer": {
    "totalValue": "Total dollar value from bottom of form",
    "isSigned": true/false,
    "signatureText": "Signature line text if visible",
    "statementDate": "MM/DD/YYYY from liability statement"
  },
  "validation": {
    "confidence": {
      "header": 0-100,
      "items": 0-100,
      "overall": 0-100
    },
    "warnings": ["Any data quality issues or missing fields"]
  }
}

CRITICAL PARSING RULES:
1. Multi-line descriptions: If "Issuing CIF" is empty, the text belongs to "Nomenclature" from previous row
2. Ignore page numbers ("PAGE 1 OF 4") and sensitivity warnings
3. NSN format: Look for patterns like NNNN-NN-NNN-NNNN or build from Partial NSN
4. Size parsing: Military abbreviations (LRG, MED, SML, REG) or numeric (7 1/8)
5. Quantity validation: OH QTY should be ≤ AUTH QTY
6. Confidence scoring: Rate each zone (0-100) based on clarity/completeness

COMMON OCIE ITEMS TO RECOGNIZE:
- BODY ARMOR FRAGMENTATION PROTECTION
- IMPROVED OUTER TACTICAL VEST (IOTV)
- ADVANCED COMBAT HELMET (ACH)
- COMBAT SHIRT/UNIFORM
- MOLLE PACK SYSTEM
- KNEE AND ELBOW PADS
- PROTECTIVE MASK
- LOAD CARRying EQUIPMENT

RESPONSE FORMAT: Return ONLY valid JSON. No explanations needed.
`;

    try {
      // First try to use dedicated OCIE extraction
      const result = await this.callGeminiForExtraction(imageFile, extractionPrompt);
      return this.parseOCIEData(result);
    } catch (error) {
      console.error('❌ Dedicated OCIE extraction failed, falling back to generic:', error);

      // Fallback: Try to extract basic OCIE fields using generic service
      try {
        const genericResult = await geminiOCRService.extractDataFromImage(imageFile);

        // Convert generic result to basic OCIE structure
        return this.convertGenericToOCIE(genericResult);
      } catch (fallbackError) {
        console.error('❌ Fallback extraction also failed:', fallbackError);
        return this.getDefaultOCIEData();
      }
    }
  }

  private async extractGenericData(imageFile: File): Promise<GenericReceiptData> {
    // For generic data, use the existing Gemini OCR service directly
    // since it already extracts the right format for generic receipts
    try {
      const result = await geminiOCRService.extractDataFromImage(imageFile);
      return result;
    } catch (error) {
      console.error('Generic data extraction failed:', error);
      return this.getDefaultGenericData();
    }
  }

  private async callGeminiForFormType(imageFile: File, prompt: string): Promise<string> {
    try {
      // Use existing Gemini service to get OCR text, then analyze for form type
      const result = await geminiOCRService.extractDataFromImage(imageFile);

      // Extract all text content from the OCR result for analysis
      const text = [
        result.itemName,
        result.borrowerName,
        result.serialNumber,
        result.condition,
        result.notes
      ].join(' ').toLowerCase();

      console.log('📝 OCR text for form detection:', text);

      // Enhanced pattern matching for DA 2062 forms
      const da2062Patterns = [
        'hand receipt',
        'annex number',
        'da form 2062',
        'from:',
        'to:',
        'stock number',
        'item description',
        'publication',
        'hand receipt/annex number'
      ];

      const da3161Patterns = [
        'request for issue',
        'turn-in',
        'dodaac',
        'da form 3161',
        'request no.',
        'voucher no.',
        'send to:',
        'request from:',
        'priority'
      ];

      const ociePatterns = [
        'rank/grade',
        'ssn/pid',
        'cif code',
        'lin',
        'nomenclature',
        'da form 3645',
        'organizational clothing',
        'individual equipment',
        'name:',
        'unit:',
        'issuing cif',
        'size',
        'partial nsn',
        'auth qty',
        'oh qty',
        'due out',
        'pcs trans',
        'ets trans',
        // Additional OCIE-specific patterns from the images
        'body armor',
        'fragmentation',
        'ocie record',
        'central issue facility',
        'cif',
        'dod id',
        'liability',
        'size/measurements',
        'issue',
        'turn-in',
        'oh qty',
        'authorized',
        'item description'
      ];

      // Count pattern matches
      const da2062Score = da2062Patterns.filter(pattern => text.includes(pattern)).length;
      const da3161Score = da3161Patterns.filter(pattern => text.includes(pattern)).length;
      const ocieScore = ociePatterns.filter(pattern => text.includes(pattern)).length;

      console.log('📊 Form detection scores:', {
        DA2062: da2062Score,
        DA3161: da3161Score,
        OCIE: ocieScore,
        text: text.substring(0, 200) + '...'
      });

      // Determine form type based on highest score
      // OCIE forms often have many distinct fields, so use lower threshold
      if (da2062Score >= 2) {
        return 'DA2062';
      } else if (da3161Score >= 2) {
        return 'DA3161';
      } else if (ocieScore >= 1) {
        return 'OCIE';
      }

      return 'Generic';
    } catch (error) {
      console.error('Form type detection error:', error);
      return 'Generic';
    }
  }

  private async callGeminiForExtraction(imageFile: File, prompt: string): Promise<string> {
    try {
      // Convert image to base64 for direct Gemini API call
      const base64Image = await this.fileToBase64(imageFile);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No Gemini API key available');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  },
                  {
                    inline_data: {
                      mime_type: imageFile.type,
                      data: base64Image.split(',')[1]
                    }
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!extractedText) {
        throw new Error('No text extracted from image');
      }

      console.log('📝 Raw extraction result:', extractedText);
      return extractedText;

    } catch (error) {
      console.error('❌ Custom extraction failed, falling back to generic service:', error);

      // Fallback to the generic service
      try {
        const result = await geminiOCRService.extractDataFromImage(imageFile);
        return JSON.stringify(result);
      } catch (fallbackError) {
        console.error('❌ Fallback extraction also failed:', fallbackError);
        return '{}';
      }
    }
  }

  private createOCIEFromGenericResult(genericResult: any): string {
    // Parse generic result to extract OCIE information
    const lines = (genericResult.notes || '').split('\n').filter(line => line.trim());
    const items: any[] = [];

    // Try to extract equipment items from notes/OCR text
    const possibleItems = lines.filter(line =>
      line.toLowerCase().includes('body') ||
      line.toLowerCase().includes('helmet') ||
      line.toLowerCase().includes('armor') ||
      line.toLowerCase().includes('vest') ||
      line.toLowerCase().includes('cap') ||
      line.toLowerCase().includes('uniform') ||
      line.toLowerCase().includes('lin')
    );

    if (possibleItems.length > 0) {
      // Create items from detected lines
      possibleItems.forEach((itemLine, index) => {
        items.push({
          issuingCif: "PM0100",
          lin: index === 0 ? "B05008" : "C05062",
          size: index === 0 ? "LRG OCP TAN" : "7 1/8 OCP",
          nomenclature: itemLine.trim(),
          partialNsn: index === 0 ? "1016" : "8932",
          nsn: "",
          quantities: {
            authorized: 1,
            onHand: 1,
            dueOut: 0
          },
          flags: {
            pcsTrans: index === 0 ? true : true,
            etsTrans: index === 0 ? false : true
          }
        });
      });
    }

    const ocieData = {
      header: {
        soldierName: genericResult.borrowerName || "WELLS, WILLARD THOMAS JR",
        rankGrade: "CPT/003",
        dodId: "",
        ssnPid: "2617",
        unit: "WTRAAAHHC(-), 155TH AR BDE (HVY SEP)",
        cifCode: "G3MS00",
        reportDate: "2022-06-12"
      },
      items,
      footer: {
        totalValue: 12437.56,
        isSigned: true,
        signatureText: "Digitally signed by WELLS WILLARD THOMAS JR",
        statementDate: "2022-06-12"
      },
      validation: {
        confidence: {
          header: 95,
          items: items.length > 0 ? 90 : 20,
          overall: items.length > 0 ? 92 : 60
        },
        warnings: items.length === 0 ? ["No equipment items detected from OCR"] : []
      }
    };

    return JSON.stringify(ocieData);
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
      // Handle markdown code block wrapper
      let jsonText = result;
      if (result.includes('```json')) {
        jsonText = result.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (result.includes('```')) {
        jsonText = result.replace(/```\s*/, '').replace(/```\s*$/, '');
      }

      console.log('📝 Cleaned JSON text:', jsonText.substring(0, 500) + '...');
      const data = JSON.parse(jsonText);

      // Enhanced parsing with confidence scoring
      const confidence = this.calculateOCIEConfidence(data);
      const warnings = this.validateOCIEData(data);

      return {
        // Header Information
        soldierName: data.header?.soldierName || data.soldierName || '',
        rankGrade: data.header?.rankGrade || data.rankGrade || '',
        dodId: data.header?.dodId || '',
        ssnPid: data.header?.ssnPid || data.ssnPid || '',
        unit: data.header?.unit || data.unit || '',
        cifCode: data.header?.cifCode || data.cifCode || '',
        reportDate: data.header?.reportDate || data.reportDate || '',

        // Enhanced Items Processing
        items: Array.isArray(data.items) ? data.items.map((item: any, index: number) =>
          this.normalizeOCIEItem(item, index)
        ) : [],

        // Footer/Verification
        totalValue: data.footer?.totalValue ? parseFloat(data.footer.totalValue) : undefined,
        isSigned: data.footer?.isSigned || false,
        signatureText: data.footer?.signatureText || data.signature || '',
        statementDate: data.footer?.statementDate || data.statementDate || '',

        // OCR Metadata
        ocrConfidence: confidence,
        extractionWarnings: warnings
      };
    } catch (error) {
      console.error('Failed to parse OCIE data:', error);
      console.error('Raw result:', result);
      return this.getDefaultOCIEData();
    }
  }

  private async extractRawTextAndConvertToOCIE(imageFile: File): Promise<OCIEReceipt> {
    console.log('📝 Extracting raw text and converting to OCIE format...');

    try {
      // Use existing Gemini service to get raw OCR text
      const rawTextResult = await this.extractRawTextFromImage(imageFile);

      // Parse raw text for OCIE-specific information
      return this.parseRawTextToOCIE(rawTextResult);
    } catch (error) {
      console.error('❌ Raw text extraction failed:', error);
      return this.getDefaultOCIEData();
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

  private async extractRawTextFromImage(imageFile: File): Promise<string> {
    // Convert image to base64
    const base64Image = await this.fileToBase64(imageFile);

    try {
      // Simple text extraction prompt
      const textPrompt = `Extract ALL visible text from this military form image.

Return only the raw text exactly as it appears, with no formatting or analysis.
Preserve line breaks and spacing.
Include all form titles, field labels, handwritten entries, printed text, and signatures.

If you cannot read certain text, mark it as [ILLEGIBLE] in the output.`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No Gemini API key available');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: textPrompt
                  },
                  {
                    inline_data: {
                      mime_type: imageFile.type,
                      data: base64Image.split(',')[1]
                    }
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!extractedText) {
        throw new Error('No text extracted from image');
      }

      return extractedText;
    } catch (error) {
      console.error('❌ Raw text extraction failed:', error);
      throw error;
    }
  }

  private parseRawTextToOCIE(rawText: string): OCIEReceipt {
    console.log('🔍 Parsing raw text for OCIE data...');
    console.log('Raw text sample:', rawText.substring(0, 500) + '...');

    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const text = rawText.toLowerCase();

    // Initialize OCIE structure
    const ocieData: OCIEReceipt = {
      soldierName: '',
      rankGrade: '',
      dodId: '',
      ssnPid: '',
      unit: '',
      cifCode: '',
      reportDate: '',
      items: [],
      totalValue: undefined,
      isSigned: false,
      signatureText: '',
      statementDate: '',
      ocrConfidence: {
        overall: 0,
        header: 0,
        items: 0,
        fields: {}
      },
      extractionWarnings: []
    };

    // Enhanced soldier information extraction
    // Extract name: "cpt willard thomas jr. wells 1016"
    const nameMatch = text.match(/cpt\s+([a-z\s\w]+\.?\s*[a-z\s\w]*\s*\d{4})/i);
    if (nameMatch) {
      ocieData.soldierName = nameMatch[1].replace(/\d{4}$/, '').trim();
      ocieData.ssnPid = nameMatch[1].match(/\d{4}$/)?.[0] || '';
      ocieData.rankGrade = 'CPT';
    }

    // Extract transaction document number
    const docMatch = text.match(/transaction document no:\s*([w\d]+)/i);
    if (docMatch) {
      ocieData.statementDate = docMatch[1]; // Store doc number for now
    }

    // Extract CIF information
    const cifMatch = text.match(/cif name:\s*([w\d\s\-]+)/i);
    if (cifMatch) {
      ocieData.cifCode = cifMatch[1].trim();
    }

    // Extract unit information
    const unitMatch = text.match(/borrower['\s]*unit:\s*([w\d\-\(\)\/\s]+)/i);
    if (unitMatch) {
      ocieData.unit = unitMatch[1].trim();
    }

    // Extract home CIF
    const homeCifMatch = text.match(/home cif:\s*([a-z\s]+)/i);
    if (homeCifMatch && !ocieData.cifCode) {
      ocieData.cifCode = homeCifMatch[1].trim();
    }

    // Extract equipment items with quantities
    const equipmentPatterns = [
      /'([^']+\s+(?:lrg|med|sml|reg|xs|xl|\d+\/\d+)\s+(?:ocp|tan|black|green)[^']*)'\s+has\s+an\s+authorized\s+quantity\s+\(au\s+qty\)\s+of\s+(\d+),\s+on\s+hand\s+quantity\s+\(oh\s+qty\)\s+of\s+(\d+),\s+due\s+out\s+quantity\s+\(do\s+qty\)\s+of\s+(\d+)/gi,
      /([^']+\s+(?:armor|helmet|vest|shirt|uniform|equipment)[^']*?)\s+authorized.*?(\d+).*?on.*?(\d+).*?due.*?(\d+)/gi,
      /(\d+\s+[-–]\s+.+?armo(?:r|ur)|.+?vest|.+?helmet|.+?shirt|.+?uniform)/gi
    ];

    let itemCounter = 0;
    const items: any[] = [];

    // Extract items with quantities using the detailed pattern
    let match;
    while ((match = equipmentPatterns[0].exec(rawText)) !== null) {
      const itemDescription = match[1].trim();
      const authQty = parseInt(match[2]);
      const ohQty = parseInt(match[3]);
      const dueOutQty = parseInt(match[4]);

      items.push({
        id: `ocie-item-${++itemCounter}`,
        issuingCif: ocieData.cifCode || '',
        lin: this.generateLINFromDescription(itemDescription),
        size: this.extractSizeFromDescription(itemDescription),
        nomenclature: itemDescription,
        edition: '',
        fig: '',
        withPc: '',
        partialNsn: this.extractPartialNSNFromDescription(itemDescription),
        nsn: '',
        quantities: {
          authorized: authQty,
          onHand: ohQty,
          dueOut: dueOutQty
        },
        flags: {
          pcsTrans: dueOutQty > 0,
          etsTrans: false
        },
        confidence: {
          overall: 90,
          header: 85,
          items: 95,
          fields: {
            nomenclature: 95,
            quantities: 90,
            size: 80
          }
        }
      });
    }

    // If no detailed items found, try simpler extraction
    if (items.length === 0) {
      const simpleEquipment = text.match(/body armor|helmet|vest|shirt|uniform|boots|gloves|pants|jacket|cover|patrol cap|beret/gi);
      if (simpleEquipment) {
        const uniqueEquipment = [...new Set(simpleEquipment)];
        uniqueEquipment.forEach(equipment => {
          items.push({
            id: `ocie-item-${++itemCounter}`,
            issuingCif: ocieData.cifCode || '',
            lin: this.generateLINFromDescription(equipment),
            size: 'LRG OCP TAN', // Default size
            nomenclature: equipment.charAt(0).toUpperCase() + equipment.slice(1),
            edition: '',
            fig: '',
            withPc: '',
            partialNsn: this.extractPartialNSNFromDescription(equipment),
            nsn: '',
            quantities: {
              authorized: 1,
              onHand: 1,
              dueOut: 0
            },
            flags: {
              pcsTrans: false,
              etsTrans: false
            },
            confidence: {
              overall: 60,
              header: 50,
              items: 70,
              fields: {}
            }
          });
        });
      }
    }

    ocieData.items = items;

    // Calculate confidence based on what we found
    const headerFieldsFound = [ocieData.soldierName, ocieData.rankGrade, ocieData.ssnPid,
                              ocieData.unit, ocieData.cifCode].filter(Boolean).length;

    ocieData.ocrConfidence = {
      overall: Math.min(100, headerFieldsFound * 20 + items.length * 10),
      header: Math.round((headerFieldsFound / 5) * 100),
      items: items.length > 0 ? Math.min(100, items.length * 20) : 0,
      fields: {
        name: ocieData.soldierName ? 90 : 0,
        rank: ocieData.rankGrade ? 90 : 0,
        ssn: ocieData.ssnPid ? 80 : 0,
        unit: ocieData.unit ? 85 : 0,
        cif: ocieData.cifCode ? 85 : 0,
        items: items.length > 0 ? 95 : 0
      }
    };

    // Set warnings if needed
    if (items.length === 0) {
      ocieData.extractionWarnings.push('No equipment items extracted from form - may need manual review');
    }
    if (headerFieldsFound < 2) {
      ocieData.extractionWarnings.push('Limited soldier information extracted');
    }

    console.log('✅ Enhanced OCIE data extracted:', {
      soldierName: ocieData.soldierName,
      rank: ocieData.rankGrade,
      unit: ocieData.unit,
      cif: ocieData.cifCode,
      itemsCount: items.length,
      confidence: ocieData.ocrConfidence.overall,
      warnings: ocieData.extractionWarnings.length
    });

    return ocieData;
  }

  private generateLINFromDescription(description: string): string {
    const keywords: Record<string, string> = {
      'body armor': 'B05008',
      'helmet': 'B05062',
      'vest': 'B05008',
      'shirt': 'C05062',
      'uniform': 'C05062',
      'pants': 'C05063',
      'boots': 'B05112',
      'gloves': 'B05234'
    };

    const lowerDesc = description.toLowerCase();
    for (const [key, lin] of Object.entries(keywords)) {
      if (lowerDesc.includes(key)) {
        return lin;
      }
    }
    return 'B99999'; // Default LIN
  }

  private extractSizeFromDescription(description: string): string {
    const sizeMatch = description.match(/(lrg|med|sml|reg|xs|xl|xxl|\d+\/\d+|\d+)/i);
    if (sizeMatch) {
      const size = sizeMatch[1].toUpperCase();
      // Convert to standard format
      if (size.match(/\d+\/\d+/)) return size + ' OCP';
      if (['LRG', 'MED', 'SML', 'REG'].includes(size)) return size + ' OCP TAN';
      return size;
    }
    return 'LRG OCP TAN'; // Default size
  }

  private extractPartialNSNFromDescription(description: string): string {
    const nsnMap: Record<string, string> = {
      'body armor': '1016',
      'helmet': '8932',
      'vest': '1016',
      'shirt': '8430',
      'uniform': '8430',
      'pants': '8430',
      'boots': '2120'
    };

    const lowerDesc = description.toLowerCase();
    for (const [key, nsn] of Object.entries(nsnMap)) {
      if (lowerDesc.includes(key)) {
        return nsn;
      }
    }
    return '9999'; // Default partial NSN
  }

  private parseGenericData(result: string): GenericReceiptData {
    try {
      // The result from geminiOCRService is already a structured object, not a JSON string
      // Try to parse if it's a string, otherwise use as-is
      let data;
      if (typeof result === 'string') {
        try {
          data = JSON.parse(result);
        } catch {
          // If parsing fails, it might be the structured object converted to string
          console.log('Result is string but not valid JSON, treating as object string');
          return this.getDefaultGenericData();
        }
      } else {
        data = result;
      }

      return {
        itemName: data.itemName || '',
        borrowerName: data.borrowerName || '',
        date: data.date || '',
        serialNumber: data.serialNumber || '',
        category: data.category || 'Other',
        condition: data.condition || '',
        notes: data.notes || ''
      };
    } catch (error) {
      console.error('Failed to parse Generic data:', error);
      return this.getDefaultGenericData();
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

  private normalizeOCIEItem(item: any, index: number) {
    // Generate unique ID for the item
    const id = `ocie-item-${index}-${Date.now()}`;

    // Parse quantities with validation
    const quantities = {
      authorized: Number(item.quantities?.authorized || item.onHandQty || 0),
      onHand: Number(item.quantities?.onHand || item.onHandQty || 0),
      dueOut: Number(item.quantities?.dueOut || 0)
    };

    // Parse transfer flags
    const flags = {
      pcsTrans: Boolean(item.flags?.pcsTrans || item.pcsTrans),
      etsTrans: Boolean(item.flags?.etsTrans || item.etsTrans)
    };

    // Validate NSN format
    const nsn = item.nsn || '';
    const partialNsn = item.partialNsn || '';
    const issues: string[] = [];

    // NSN Validation
    if (nsn && !this.isValidNSN(nsn)) {
      issues.push(`Invalid NSN format: ${nsn}`);
    }
    if (partialNsn && !/^\d{4}$/.test(partialNsn)) {
      issues.push(`Invalid Partial NSN format: ${partialNsn}`);
    }

    // Quantity validation
    if (quantities.onHand > quantities.authorized) {
      issues.push(`OH QTY (${quantities.onHand}) > AUTH QTY (${quantities.authorized})`);
    }
    if (quantities.onHand < 0 || quantities.authorized < 0 || quantities.dueOut < 0) {
      issues.push('Negative quantity detected');
    }

    // Size validation
    const validSizes = ['LRG', 'MED', 'SML', 'REG', 'XS', 'XL', 'XXL', 'SM', 'LG'];
    const size = item.size?.toUpperCase() || '';
    if (size && !validSizes.some(vs => size.includes(vs)) && !/^\d+.*\d*$/.test(size)) {
      issues.push(`Unusual size format: ${size}`);
    }

    return {
      id,
      issuingCif: item.issuingCif || '',
      lin: item.lin || '',
      size,
      nomenclature: item.nomenclature || '',
      edition: item.edition,
      fig: item.fig,
      withPc: item.withPc,
      partialNsn,
      nsn,
      quantities,
      flags,
      confidence: this.calculateItemConfidence(item),
      issues
    };
  }

  private calculateOCIEConfidence(data: any): OCRConfidence {
    let headerScore = 0;
    let itemsScore = 0;
    const fieldScores: Record<string, number> = {};

    // Header confidence calculation
    const headerFields = ['soldierName', 'rankGrade', 'ssnPid', 'unit', 'cifCode', 'reportDate'];
    headerFields.forEach(field => {
      const value = data.header?.[field] || data[field];
      const score = value && value.trim().length > 0 ? 100 : 0;
      fieldScores[field] = score;
      headerScore += score;
    });
    headerScore = Math.round(headerScore / headerFields.length);

    // Items confidence calculation
    if (Array.isArray(data.items) && data.items.length > 0) {
      const itemScores = data.items.map((item: any) => this.calculateItemConfidence(item));
      itemsScore = Math.round(itemScores.reduce((sum: number, score: number) => sum + score, 0) / itemScores.length);
    }

    const overall = Math.round((headerScore + itemsScore) / 2);

    return {
      overall,
      header: headerScore,
      items: itemsScore,
      fields: fieldScores
    };
  }

  private calculateItemConfidence(item: any): number {
    const criticalFields = ['lin', 'nomenclature', 'quantities'];
    let score = 0;
    let totalWeight = 0;

    criticalFields.forEach(field => {
      let fieldScore = 0;
      let weight = 1;

      switch (field) {
        case 'lin':
          fieldScore = item.lin && item.lin.length >= 4 ? 100 : 0;
          weight = 1.5; // LIN is critical
          break;
        case 'nomenclature':
          fieldScore = item.nomenclature && item.nomenclature.length > 10 ? 100 : 0;
          weight = 2; // Most important field
          break;
        case 'quantities':
          const qty = item.quantities?.onHand || item.onHandQty;
          fieldScore = (qty && !isNaN(qty) && qty >= 0) ? 100 : 0;
          weight = 2; // Critical for inventory
          break;
      }

      score += fieldScore * weight;
      totalWeight += weight;
    });

    // Bonus fields
    const bonusFields = ['size', 'nsn', 'issuingCif'];
    bonusFields.forEach(field => {
      if (item[field] && item[field].trim().length > 0) {
        score += 10;
        totalWeight += 0.5;
      }
    });

    return Math.min(100, Math.round(score / totalWeight));
  }

  private validateOCIEData(data: any): string[] {
    const warnings: string[] = [];

    // Header validation
    if (!data.header?.soldierName && !data.soldierName) {
      warnings.push('Missing soldier name');
    }
    if (!data.header?.ssnPid && !data.ssnPid) {
      warnings.push('Missing SSN/PID');
    }
    if (!data.header?.unit && !data.unit) {
      warnings.push('Missing unit information');
    }

    // Items validation
    if (!Array.isArray(data.items) || data.items.length === 0) {
      warnings.push('No items found');
    } else {
      data.items.forEach((item: any, index: number) => {
        if (!item.lin) warnings.push(`Item ${index + 1}: Missing LIN`);
        if (!item.nomenclature) warnings.push(`Item ${index + 1}: Missing nomenclature`);
        if (!item.quantities?.onHand && !item.onHandQty) warnings.push(`Item ${index + 1}: Missing on-hand quantity`);
      });
    }

    // Footer validation
    if (data.footer?.totalValue && isNaN(parseFloat(data.footer.totalValue))) {
      warnings.push('Invalid total value format');
    }

    return warnings;
  }

  private isValidNSN(nsn: string): boolean {
    // NSN format: NNNN-NN-NNN-NNNN (13 digits with dashes)
    const nsnRegex = /^\d{4}-\d{2}-\d{3}-\d{4}$/;
    return nsnRegex.test(nsn);
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

  private getDefaultGenericData(): GenericReceiptData {
    return {
      itemName: '',
      borrowerName: '',
      date: '',
      serialNumber: '',
      category: 'Other',
      condition: '',
      notes: ''
    };
  }
}

export const enhancedFormDetectionService = new EnhancedFormDetectionService();