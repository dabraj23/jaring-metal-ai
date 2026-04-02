const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDe3DtY0TBnPy7bCEDmxts2N1Ss2kvRDGc';
const genAI = new GoogleGenerativeAI(API_KEY);

async function extractDocumentData(filePath, originalName) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let fileContent;
    const ext = path.extname(originalName).toLowerCase();

    if (ext === '.pdf') {
      fileContent = fs.readFileSync(filePath).toString('base64');
    } else if (['.txt', '.csv'].includes(ext)) {
      fileContent = fs.readFileSync(filePath, 'utf-8');
    } else {
      fileContent = fs.readFileSync(filePath).toString('base64');
    }

    const prompt = `You are a precise document extraction expert for recycled metal quotations. Extract all relevant information from this document.

Return a JSON object with the following structure (use null for missing values):
{
  "document_type": "test report | quotation | invoice | other",
  "customer_name": "string",
  "company_name": "string",
  "lab_ref_no": "string or null",
  "date_issued": "YYYY-MM-DD or null",
  "date_sample_received": "YYYY-MM-DD or null",
  "sample_marking": "string or null",
  "sample_description": "string or null",
  "physical_appearance": "string or null",
  "original_weight": {"value": number or null, "unit": "g|kg|tonne|oz"},
  "initial_volume": {"value": number or null, "unit": "ml|l"},
  "final_volume": {"value": number or null, "unit": "ml|l"},
  "metal_results": {
    "Cu": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Ag": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Au": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Pd": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Ni": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Sn": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Pb": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Zn": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Fe": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Pt": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0},
    "Al": {"value": number or null, "unit": "%|g|ppm|mg", "confidence": 0.0-1.0}
  },
  "remarks": "string or null",
  "possible_material_category": "CU_AG|NI_PD_AU|NI_PD_AG_AU|AU_SOL|PD_SOL|AG_PASTE|unknown",
  "category_reasoning": "brief explanation of category choice",
  "overall_confidence": 0.0-1.0,
  "extraction_notes": "any issues or assumptions made during extraction"
}

Be precise and extract only what is clearly visible in the document. Use null for values you cannot find.`;

    let response;
    if (ext === '.pdf') {
      response = await model.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileContent
          }
        },
        prompt
      ]);
    } else {
      response = await model.generateContent([
        {
          inlineData: {
            mimeType: 'text/plain',
            data: fileContent
          }
        },
        prompt
      ]);
    }

    const responseText = response.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse Gemini response as JSON');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    return extractedData;
  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw error;
  }
}

async function recommendCategory(extractedData) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const metalSummary = Object.entries(extractedData.metal_results || {})
      .filter(([_, data]) => data && data.value !== null)
      .map(([metal, data]) => `${metal}: ${data.value}${data.unit}`)
      .join(', ');

    const prompt = `Based on this extracted metal composition data, classify into the most likely material category:

Extracted Metals: ${metalSummary}
Document Description: ${extractedData.sample_description || 'N/A'}
Physical Appearance: ${extractedData.physical_appearance || 'N/A'}

Available Categories:
- CU_AG: Cu/Ag Mixed Scrap (mainly copper and silver)
- NI_PD_AU: Ni/Pd/Au/A194 Catalyst (nickel, palladium, gold catalyst)
- NI_PD_AG_AU: Ni/Pd/Ag/Au/A194 Mixed (mixed precious metals)
- AU_SOL: Au Solution (gold in liquid solution)
- PD_SOL: Pd Solution (palladium in liquid solution)
- AG_PASTE: Silver Paste Remain on Syringe (silver paste residue)

Return a JSON object:
{
  "recommended_category": "CATEGORY_CODE",
  "confidence_score": 0.0-1.0,
  "reasoning": "explanation of why this category was chosen",
  "alternative_categories": ["CATEGORY_CODE", "CATEGORY_CODE"]
}`;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        recommended_category: 'unknown',
        confidence_score: 0.5,
        reasoning: 'Could not parse recommendation',
        alternative_categories: []
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Category recommendation error:', error);
    return {
      recommended_category: 'unknown',
      confidence_score: 0.5,
      reasoning: 'Error during recommendation',
      alternative_categories: []
    };
  }
}

module.exports = {
  extractDocumentData,
  recommendCategory
};
