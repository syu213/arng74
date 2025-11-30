import { Receipt } from "@/types/receipt";

interface ExtractedData {
  itemName: string;
  borrowerName: string;
  date: string;
  serialNumber?: string;
  category?: string;
  condition?: string;
  notes?: string;
}

export class GeminiOCRService {
  constructor() {
    // Check if we're in production (Vercel) and need to use the server API
    this.isProduction = import.meta.env.PROD;
  }

  private isProduction: boolean;

  async extractDataFromImage(imageFile: File): Promise<ExtractedData> {
    console.log('🤖 Processing image with Gemini OCR...');
    console.log('📊 Image file type:', imageFile.type);
    console.log('📏 Image size:', imageFile.size);
    console.log('🏗️ Environment:', this.isProduction ? 'Production (Vercel)' : 'Development');

    try {
      if (this.isProduction) {
        // In production, call Vercel serverless function
        return await this.callServerFunction(imageFile);
      } else {
        // In development, try to use the API key directly (for testing)
        // or fall back to server function if available
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
          console.log('🔑 Using development API key');
          return await this.callGeminiDirectly(imageFile, apiKey);
        } else {
          console.log('⚠️ No API key found, attempting server function...');
          return await this.callServerFunction(imageFile);
        }
      }
    } catch (error) {
      console.error('Gemini OCR service error:', error);
      throw new Error(`Failed to extract data with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callServerFunction(imageFile: File): Promise<ExtractedData> {
    console.log('📡 Sending image to Vercel serverless function...');

    try {
      // Convert image to base64 and send as JSON (more reliable than multipart)
      const base64Image = await this.fileToBase64(imageFile);

      const requestData = {
        image: base64Image.split(',')[1], // Remove data:image/jpeg;base64, prefix
        mimeType: imageFile.type,
      };

      console.log('📤 Sending request data:', {
        imageLength: requestData.image.length,
        mimeType: requestData.mimeType,
      });

      const response = await fetch('/api/gemini-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const extractedData: ExtractedData = await response.json();
      console.log('✅ Successfully extracted data:', extractedData);

      return extractedData;
    } catch (error) {
      console.error('❌ Server function call failed:', error);
      throw error;
    }
  }

  private async callGeminiDirectly(imageFile: File, apiKey: string): Promise<ExtractedData> {
    console.log('🔑 Calling Gemini API directly with API key...');

    // Convert image to base64
    const base64Image = await this.fileToBase64(imageFile);

    const prompt = `
You are analyzing a U.S. Army National Guard form (DA 2062, DA 3161, OCIE, or other military document) for equipment accountability.
Carefully examine this form and extract the requested information in precise JSON format.

IMPORTANT: This form may contain HANDWRITTEN text. Pay extra attention to:
- NAME fields with handwritten entries
- RANK/GRADE fields
- SSN/PID fields
- Any signatures or printed text

OCR HANDWRITING INSTRUCTIONS:
1. Focus on printed form labels first (NAME:, RANK/GRADE:, etc.)
2. For handwritten entries, try multiple interpretations if unclear
3. Look for dark ink, pen strokes, and character shapes
4. If handwriting is very light, indicate "illegible" in notes

Please identify and extract:
1. The equipment/item being transferred
2. The service member(s) and units involved - pay special attention to ranks and names
3. Transaction details and identifiers
4. ALL visible text from headers, labels, and any readable handwritten entries

Return ONLY a JSON object with these exact fields:

{
  "itemName": "Complete equipment description including model numbers",
  "borrowerName": "Full name of the person receiving equipment including rank (e.g., SGT Smith, PFC Johnson)",
  "date": "Transaction date in MM/DD/YYYY format",
  "serialNumber": "Serial number, NSN (National Stock Number), or unique identifier",
  "category": "Choose one: Weapons, Optics, Radios/Comms, PPE, Tools, Vehicles, Medical, Other",
  "condition": "Equipment condition (Serviceable, Damaged, Missing parts, etc.)",
  "notes": "Additional remarks, quantities, special instructions, OR note if handwriting is illegible"
}

NAME EXTRACTION PRIORITY:
- Look for "FROM:", "TO:", "RECEIVED BY:", "ISSUED TO:" fields
- Extract complete names with military ranks: PVT, PV2, PFC, SPC, CPL, SGT, SSG, SFC, MSG, 1SG, SGM, LT, CPT, MAJ, LTC, COL
- For DA 2062: Look in the "TO:" field and individual line item signatures
- For DA 3161: Look in "REQUEST FROM:" and signature areas
- For OCIE: Look in "NAME:" field and signature blocks
- Include both rank and full name when visible (e.g., "SGT John Smith" not just "John Smith")
- If multiple names are present, prioritize the person receiving the equipment

MILITARY EQUIPMENT EXAMPLES:
- Weapons: M4 Carbine, M16A4, M249 SAW, M240B, M2 HB, M320 GLM, M9 Beretta, M18 pistol
- Optics: ACOG, M68 CCO, ELCAN, AN/PVS-14, AN/PVS-31, PEQ-15, PEQ-16
- Radios: AN/PRC-152, AN/PRC-163, AN/PRC-148, SINCGARS, Harris Falcon
- Vehicles: HMMWV (Humvee), JLTV, MRAP, LMTV, FMTV, M-ATV
- PPE: IOTV, SAPI plates, ACH, ECH, helmet, body armor, gloves

ANALYSIS GUIDELINES:
- Extract serial numbers and NSNs (typically 13-digit format like 1005-01-231-0001)
- Find dates in various formats and convert to MM/DD/YYYY
- For HANDWRITTEN text: If completely illegible, put "illegible handwriting" in notes field
- For missing information, use empty string ""
- Respond with JSON only - no explanations or markdown formatting

Carefully analyze all text, form fields, headers, and any handwritten entries in image.
    `;

    // Try different model names
    const modelNames = [
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-2.5-flash-preview-05-20'
    ];

    let response: Response;
    let usedModel = '';

    for (const modelName of modelNames) {
      try {
        console.log(`🎯 Trying model: ${modelName}`);
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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

        usedModel = modelName;
        console.log(`📡 Model ${modelName} response status:`, response.status);

        if (response.ok) {
          break;
        }
      } catch (error) {
        console.log(`❌ Model ${modelName} failed:`, error);
        continue;
      }
    }

    // If no model worked, throw the last error
    if (!response || !response.ok) {
      const lastError = response ? await response.text() : 'No response';
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    console.log(`✅ Successfully used model: ${usedModel}`);

    const result = await response.json();
    const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      throw new Error('No response from Gemini API');
    }

    // Parse JSON response
    const jsonData = this.parseJsonResponse(extractedText);

    // Convert date from MM/DD/YYYY to YYYY-MM-DD format for HTML date input
    let formattedDate = jsonData.date || '';
    if (formattedDate) {
      const dateMatch = formattedDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        let [, month, day, year] = dateMatch;
        // Convert 2-digit year to 4-digit year
        if (year.length === 2) {
          year = parseInt(year) >= 50 ? '19' + year : '20' + year;
        }
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return {
      itemName: jsonData.itemName || '',
      borrowerName: jsonData.borrowerName || '',
      date: formattedDate,
      serialNumber: jsonData.serialNumber || '',
      category: jsonData.category || 'Other',
      condition: jsonData.condition || '',
      notes: jsonData.notes || ''
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private parseJsonResponse(text: string): any {
    try {
      // Try to parse as-is
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from text that might have markdown or extra content
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Could not parse JSON response from Gemini');
    }
  }
}

export const geminiOCRService = new GeminiOCRService();