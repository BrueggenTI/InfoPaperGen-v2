import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Azure-compatible environment variable configuration
let openai: OpenAI | null = null;

// Initialize OpenAI only if API key is available
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 seconds timeout for Azure compatibility
      maxRetries: 3, // Retry logic for robust Azure deployment
    });
    console.log("[OPENAI SERVICE] OpenAI client initialized successfully");
  } else {
    console.warn("[OPENAI SERVICE] OpenAI API key not found - AI features will be disabled");
  }
} catch (error) {
  console.error("[OPENAI SERVICE] Failed to initialize OpenAI client:", error);
}

export interface ExtractedIngredients {
  ingredients: Array<{
    name: string;
    percentage?: number;
  }>;
}

export interface ExtractedNutrition {
  energy: {
    kj: number;
    kcal: number;
  };
  fat: number;
  saturatedFat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  protein: number;
  salt: number;
}

export async function extractIngredientsFromImage(base64Image: string, isBaseProduct: boolean = false): Promise<ExtractedIngredients> {
  try {
    // Azure Environment Check - Verify OpenAI API Key availability
    if (!process.env.OPENAI_API_KEY || !openai) {
      console.error("[OPENAI INGREDIENTS] OpenAI API key not available in environment");
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    // Validate base64 image
    if (!base64Image || typeof base64Image !== 'string') {
      throw new Error("Invalid base64 image data provided");
    }

    // Strip data URL prefix if present (for Azure compatibility)
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const productType = isBaseProduct ? "base product" : "final product";
    const contextDescription = isBaseProduct
      ? "This is a base product SAP screenshot. The base product ingredients are components that will be included within a final product. Focus on extracting the ingredient composition of this base component."
      : "This is a final product SAP screenshot. Extract all ingredients from the complete final product, which may include base products as components.";

    console.log("[OPENAI INGREDIENTS] Attempting to extract ingredients from image...", {
      imageSize: `${Math.round(cleanBase64.length / 1024)}KB`,
      productType,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasApiKey: !!process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting ingredient information from SAP food product screenshots.
          ${contextDescription}

          Analyze the image and extract all ingredients with their percentages if visible.
          Return the data in JSON format with this structure:
          { "ingredients": [{ "name": "ingredient name", "percentage": number or null }] }
          If no percentage is shown, set percentage to null. Be precise and thorough.

          IMPORTANT EXTRACTION RULES:
          - Extract ONLY ingredient names and descriptions (e.g., "Haferflocken", "Weizenmehl", "Zucker")
          - Do NOT extract recipe numbers, product codes, or any numerical identifiers
          - Focus on the actual food ingredient names, not internal reference numbers
          - Round all percentages to exactly ONE decimal place
          - Example: Extract "Haferflocken" not "Recipe 12345" or "Mat-Nr 67890"

          Pay attention to the relationship between base products and final products:
          - Base products are components used within final products
          - Final products contain all ingredients including those from base products
          - Extract ingredients according to the product type specified`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all ingredients and their percentages from this ${productType} SAP screenshot. Focus on ingredient lists, labels, or any text showing ingredient information.

              CRITICAL: Extract only the actual ingredient NAMES and DESCRIPTIONS (like "Haferflocken", "Weizenmehl", "Zucker"), never extract recipe numbers, material numbers, or product codes. Round percentages to one decimal place. ${contextDescription}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${cleanBase64}`,
                detail: "high" // High detail for better ingredient reading
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for consistent extraction
      // Azure-optimized settings
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const responseContent = response.choices[0]?.message?.content || "{}";

    console.log("[OPENAI INGREDIENTS] Received response from OpenAI", {
      hasContent: !!responseContent,
      responseLength: responseContent.length,
      timestamp: new Date().toISOString()
    });

    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[OPENAI INGREDIENTS] JSON Parse Error:", parseError);
      console.error("[OPENAI INGREDIENTS] Raw response content:", responseContent);
      throw new Error("Invalid response format from OpenAI for ingredients extraction");
    }

    console.log("[OPENAI INGREDIENTS] Successfully extracted ingredients:", result);
    return result as ExtractedIngredients;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[OPENAI INGREDIENTS] Error extracting ingredients:", errorMessage);

    // Provide Azure-compatible error handling
    if (errorMessage?.includes('API key')) {
      throw new Error("OpenAI API key configuration issue. Please verify OPENAI_API_KEY environment variable is set.");
    } else if (errorMessage?.includes('rate_limit')) {
      throw new Error("OpenAI API rate limit exceeded. Please try again in a few moments.");
    } else {
      throw new Error(`Failed to extract ingredients from image: ${errorMessage}`);
    }
  }
}

// Translation interfaces
interface TranslationRequest {
  ingredients: { name: string; percentage?: number; origin?: string }[];
  targetLanguage: string;
  sourceLanguage?: string;
}

interface TranslatedIngredient {
  originalName: string;
  translatedName: string;
}

interface TranslationResponse {
  translatedIngredients: TranslatedIngredient[];
}

export async function translateIngredients(request: TranslationRequest): Promise<TranslationResponse> {
  try {
    if (!process.env.OPENAI_API_KEY || !openai) {
      console.error("[OPENAI TRANSLATION] OpenAI API key not available in environment");
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }
    
    const ingredientNames = request.ingredients.map(ing => ing.name);

    const prompt = `Translate the following food ingredient names from ${request.sourceLanguage || 'the original language'} to ${request.targetLanguage}.

Ingredients to translate:
${ingredientNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

Please provide accurate food industry translations. Maintain technical precision and use standard food industry terminology. Return the result in JSON format with this structure:
{ "translatedIngredients": [{ "originalName": "original name", "translatedName": "translated name" }] }

Important guidelines:
- Keep chemical and technical names accurate
- Use standard food industry terminology
- Maintain nutritional and regulatory accuracy
- If a term doesn't have a direct translation, keep the original term`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert food scientist and translator specializing in food ingredient terminology. Provide accurate, technical translations that maintain regulatory and nutritional precision."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as TranslationResponse;
  } catch (error) {
    console.error("Error translating ingredients:", error);
    throw new Error("Failed to translate ingredients");
  }
}

export async function extractNutritionFromImage(base64Image: string): Promise<ExtractedNutrition> {
  try {
    // Azure Environment Check - Verify OpenAI API Key availability
    if (!process.env.OPENAI_API_KEY || !openai) {
      console.error("[OPENAI NUTRITION] OpenAI API key not available in environment");
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    // Validate base64 image before sending to OpenAI
    if (!base64Image || typeof base64Image !== 'string') {
      throw new Error("Invalid base64 image data provided");
    }

    // Check if base64 string has reasonable length (min 100 bytes, max 20MB in base64)
    if (base64Image.length < 100) {
      throw new Error("Image data appears too small to be a valid image");
    }
    if (base64Image.length > 28000000) { // ~20MB in base64
      throw new Error("Image data too large (max 20MB)");
    }

    // Strip data URL prefix if present (for Azure compatibility)
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log("[OPENAI NUTRITION] Attempting to extract nutrition from image...", {
      imageSize: `${Math.round(cleanBase64.length / 1024)}KB`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasApiKey: !!process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting nutritional information from food product labels.

          CRITICAL: You MUST respond in JSON format only. No other text is allowed.

          Analyze the nutrition facts label and extract all nutritional values per 100g.
          If values are shown per different serving size, convert them to per 100g.

          ALWAYS return data in this exact JSON structure, even if you cannot see the image clearly:
          {
            "energy": { "kj": 0, "kcal": 0 },
            "fat": 0,
            "saturatedFat": 0,
            "carbohydrates": 0,
            "sugars": 0,
            "fiber": 0,
            "protein": 0,
            "salt": 0,
            "error": "Optional error message if image is unclear"
          }

          If you cannot read the nutrition label, set all values to 0 and include an "error" field.
          All numeric values must be numbers, not strings. Use 0 for unavailable values.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract nutritional information from this nutrition facts label and return ONLY the JSON object. Convert all values to per 100g if needed."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${cleanBase64}`,
                detail: "high" // High detail for better nutrition label reading
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent extraction
      // Azure-optimized settings
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const responseContent = response.choices[0]?.message?.content || "{}";

    console.log("[OPENAI NUTRITION] Received response from OpenAI", {
      hasContent: !!responseContent,
      responseLength: responseContent.length,
      contentPreview: responseContent.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    // Robust try-catch for JSON parsing with detailed logging (as requested)
    let result;
    try {
      result = JSON.parse(responseContent);
      console.log("[OPENAI NUTRITION] Successfully parsed JSON response");
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      
      // Detailed logging for debugging crashes (as requested in German description)
      console.error("=== NUTRITION EXTRACTION JSON PARSING ERROR ===");
      console.error("Fehler beim Parsen der KI-Antwort:", parseError);
      console.error("Rohe KI-Antwort (ki_response):", responseContent);
      console.error("JSON Parse Fehler Details:", {
        errorMessage,
        errorName: parseError instanceof Error ? parseError.name : "Unknown",
        errorStack: parseError instanceof Error ? parseError.stack : "No stack trace",
        responseLength: responseContent.length,
        responsePreview: responseContent.substring(0, 200) + "...",
        timestamp: new Date().toISOString()
      });
      console.error("=== END JSON PARSING ERROR DETAILS ===");

      // If the response indicates the model can't see the image, provide helpful error
      if (responseContent.includes("unable to see") || responseContent.includes("can't see") || responseContent.includes("cannot analyze")) {
        throw new Error("Das Bild konnte nicht verarbeitet werden. Bitte stellen Sie sicher, dass Sie ein klares Nährwerttabellen-Bild hochladen.");
      }

      // If it's a generic parsing error, return a default structure with German message
      throw new Error(`Ungültiges Antwortformat von OpenAI: ${errorMessage}. Rohe Antwort: ${responseContent.substring(0, 100)}...`);
    }

    // Robust validation and conversion with extensive error handling (as requested)
    if (!result || typeof result !== 'object') {
      console.error("[OPENAI NUTRITION] Invalid result structure:", result);
      throw new Error("OpenAI hat ein ungültiges Nährwerte-Datenformat zurückgegeben");
    }

    // Robust conversion with try-catch for each field to handle ValueError scenarios
    const nutritionData: Partial<ExtractedNutrition> = {};
    
    try {
      // Energy handling with nested object validation
      if (result.energy && typeof result.energy === 'object') {
        nutritionData.energy = {
          kj: Number(result.energy.kj) || 0,
          kcal: Number(result.energy.kcal) || 0
        };
      } else {
        nutritionData.energy = { kj: 0, kcal: 0 };
        console.warn("[OPENAI NUTRITION] Energy field missing or invalid, using defaults");
      }
    } catch (energyError) {
      console.error("Fehler beim Verarbeiten des Energy-Werts:", energyError);
      nutritionData.energy = { kj: 0, kcal: 0 };
    }

    // Handle each nutrition field with individual try-catch to prevent total failure
    const nutritionFields = [
      { key: 'fat', german: 'Fett' },
      { key: 'saturatedFat', german: 'Gesättigte Fettsäuren' },
      { key: 'carbohydrates', german: 'Kohlenhydrate' },
      { key: 'sugars', german: 'Zucker' },
      { key: 'fiber', german: 'Ballaststoffe' },
      { key: 'protein', german: 'Eiweiß' },
      { key: 'salt', german: 'Salz' }
    ];

    for (const field of nutritionFields) {
      try {
        const rawValue = result[field.key];
        if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === 'N/A' || rawValue === 'n/a') {
          (nutritionData as any)[field.key] = 0;
          console.warn(`[OPENAI NUTRITION] ${field.german} (${field.key}) was null/empty, using 0`);
        } else {
          const numericValue = Number(rawValue);
          if (isNaN(numericValue)) {
            console.error(`Fehler beim Konvertieren von ${field.german} (${field.key}): "${rawValue}" ist keine gültige Zahl`);
            (nutritionData as any)[field.key] = 0;
          } else {
            (nutritionData as any)[field.key] = numericValue;
          }
        }
      } catch (fieldError) {
        console.error(`Fehler beim Verarbeiten von ${field.german} (${field.key}):`, fieldError);
        console.error(`Roher Wert war:`, result[field.key]);
        (nutritionData as any)[field.key] = 0; // Fallback to prevent crashes
      }
    }

    // Ensure all required fields are present with defaults for complete ExtractedNutrition type
    const completeNutritionData: ExtractedNutrition = {
      energy: nutritionData.energy || { kj: 0, kcal: 0 },
      fat: nutritionData.fat || 0,
      saturatedFat: nutritionData.saturatedFat || 0,
      carbohydrates: nutritionData.carbohydrates || 0,
      sugars: nutritionData.sugars || 0,
      fiber: nutritionData.fiber || 0,
      protein: nutritionData.protein || 0,
      salt: nutritionData.salt || 0
    };

    // Data validation: Check if the extraction returned any meaningful data.
    const isDataEffectivelyEmpty =
      (completeNutritionData.energy.kcal === 0 && completeNutritionData.energy.kj === 0) &&
      completeNutritionData.fat === 0 &&
      completeNutritionData.protein === 0 &&
      completeNutritionData.carbohydrates === 0;

    if (isDataEffectivelyEmpty) {
      console.warn("[OPENAI NUTRITION] Extraction resulted in empty or zero-value data. Throwing error.", { result });
      if ((result as any).error) {
        throw new Error(`Die KI hat einen Fehler gemeldet: ${(result as any).error}`);
      }
      throw new Error("Es konnten keine Nährwertangaben aus dem Bild extrahiert werden. Bitte versuchen Sie es mit einem deutlicheren Bild erneut.");
    }

    console.log("[OPENAI NUTRITION] Successfully processed nutrition data:", completeNutritionData);
    console.log("[OPENAI NUTRITION] Original OpenAI response keys:", Object.keys(result));
    return completeNutritionData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = error instanceof Error ? error.constructor.name : typeof error;

    console.error("[OPENAI NUTRITION] Error details:", {
      errorMessage,
      errorStack,
      errorType
    });

    // Provide more specific error messages
    if (errorMessage?.includes('image_parse_error')) {
      throw new Error(`Failed to extract nutrition information from image: ${errorMessage}`);
    } else if (errorMessage?.includes('unsupported image')) {
      throw new Error(`Failed to extract nutrition information from image: ${errorMessage}`);
    } else {
      throw new Error(`Failed to extract nutrition information from image: ${errorMessage}`);
    }
  }
}