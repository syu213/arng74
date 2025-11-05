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

      const response = await fetch('/api/gemini-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image.split(',')[1], // Remove data:image/jpeg;base64, prefix
          mimeType: imageFile.type,
        }),
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
You are analyzing a U.S. Army National Guard hand receipt form (DA 2062) for equipment accountability.
Carefully examine this form and extract the requested information in precise JSON format.

Please identify and extract:
1. The equipment/item being transferred
2. The service member receiving the equipment
3. Transaction details and identifiers

Return ONLY a JSON object with these exact fields:

{
  "itemName": "Complete equipment description including model numbers",
  "borrowerName": "Full name of the borrower including rank if visible",
  "date": "Transaction date in MM/DD/YYYY format",
  "serialNumber": "Serial number, NSN (National Stock Number), or unique identifier",
  "category": "Choose one: Weapons, Optics, Radios/Comms, PPE, Tools, Vehicles, Medical, Other",
  "condition": "Equipment condition (Serviceable, Damaged, Missing parts, etc.)",
  "notes": "Additional remarks, quantities, or special instructions"
}

ANALYSIS GUIDELINES:
- Look for military equipment: M4/M16 rifles, M249, M240, radios, night vision, body armor, vehicles, etc.
- Identify ranks and names: SGT, PFC, CPL, SSG, etc.
- Extract serial numbers and NSNs (typically 13-digit format like 1005-01-231-0001)
- Find dates in various formats and convert to MM/DD/YYYY
- NSNs indicate: 1st 4 digits = Federal Supply Class, next 2 digits = country code
- For missing information, use empty string ""
- Respond with JSON only - no explanations or markdown formatting

Carefully analyze all text, numbers, and form fields in the image.
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