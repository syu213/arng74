const fs = require('fs');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if GEMINI_API_KEY is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Parse multipart form data
    const chunks = [];
    let boundary;

    // Get boundary from content type
    const contentType = req.headers['content-type'];
    if (contentType && contentType.includes('multipart/form-data')) {
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      boundary = boundaryMatch ? boundaryMatch[1] : null;
    }

    if (!boundary) {
      return res.status(400).json({ error: 'Invalid multipart form data' });
    }

    // Read the request body
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const data = Buffer.concat(chunks);

    // Parse the multipart data to extract the image
    const imageData = parseMultipartData(data, boundary);

    if (!imageData) {
      return res.status(400).json({ error: 'No image file provided' });
    }

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

    console.log('🤖 Calling Gemini API from Vercel serverless function...');

    // Try different model names
    const modelNames = [
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-2.5-flash-preview-05-20'
    ];

    let response;
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
                        mime_type: imageData.mimeType,
                        data: imageData.base64
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

    // If no model worked, return the last error
    if (!response || !response.ok) {
      const lastError = response ? await response.text() : 'No response';
      console.error('All Gemini models failed:', lastError);
      return res.status(500).json({ error: `Failed to process image: ${lastError}` });
    }

    console.log(`✅ Successfully used model: ${usedModel}`);

    const result = await response.json();
    const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      console.error('No response from Gemini API');
      return res.status(500).json({ error: 'No response from AI service' });
    }

    // Parse JSON response
    const jsonData = parseJsonResponse(extractedText);

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

    const extractedData = {
      itemName: jsonData.itemName || '',
      borrowerName: jsonData.borrowerName || '',
      date: formattedDate,
      serialNumber: jsonData.serialNumber || '',
      category: jsonData.category || 'Other',
      condition: jsonData.condition || '',
      notes: jsonData.notes || ''
    };

    return res.status(200).json(extractedData);

  } catch (error) {
    console.error('Vercel serverless function error:', error);
    return res.status(500).json({
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

function parseMultipartData(data, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = data.split(boundaryBuffer);

  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data') && part.includes('name="image"')) {
      const lines = part.split('\r\n');

      // Find the content type
      let mimeType = 'image/jpeg'; // default
      const contentTypeLine = lines.find(line => line.toLowerCase().includes('content-type'));
      if (contentTypeLine) {
        const match = contentTypeLine.match(/content-type:\s*(.+)/i);
        if (match) {
          mimeType = match[1].trim();
        }
      }

      // Find the actual image data (after the empty line)
      const emptyLineIndex = lines.findIndex(line => line === '');
      if (emptyLineIndex !== -1 && emptyLineIndex < lines.length - 1) {
        const imageData = lines.slice(emptyLineIndex + 1, -1).join('\r\n');
        // Remove trailing boundary markers if present
        const cleanData = imageData.replace(/\r\n$/, '').replace(/--\r\n?$/, '');

        if (cleanData.length > 0) {
          return {
            mimeType,
            base64: Buffer.from(cleanData, 'binary').toString('base64')
          };
        }
      }
    }
  }

  return null;
}

function parseJsonResponse(text) {
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