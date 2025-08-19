import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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
    const productType = isBaseProduct ? "base product" : "final product";
    const contextDescription = isBaseProduct 
      ? "This is a base product SAP screenshot. The base product ingredients are components that will be included within a final product. Focus on extracting the ingredient composition of this base component."
      : "This is a final product SAP screenshot. Extract all ingredients from the complete final product, which may include base products as components.";

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
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as ExtractedIngredients;
  } catch (error) {
    console.error("Error extracting ingredients:", error);
    throw new Error("Failed to extract ingredients from image");
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

    console.log("[OPENAI NUTRITION] Attempting to extract nutrition from image...", {
      imageSize: `${Math.round(base64Image.length / 1024)}KB`,
      timestamp: new Date().toISOString()
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
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const responseContent = response.choices[0]?.message?.content || "{}";
    
    console.log("[OPENAI NUTRITION] Received response from OpenAI", {
      hasContent: !!responseContent,
      responseLength: responseContent.length,
      contentPreview: responseContent.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    // Try to parse the JSON response
    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error("[OPENAI NUTRITION] JSON Parse Error:", parseError);
      console.error("[OPENAI NUTRITION] Raw response content:", responseContent);
      
      // If the response indicates the model can't see the image, provide helpful error
      if (responseContent.includes("unable to see") || responseContent.includes("can't see") || responseContent.includes("cannot analyze")) {
        throw new Error("The image could not be processed. Please ensure you're uploading a clear nutrition facts label image.");
      }
      
      // If it's a generic parsing error, return a default structure
      throw new Error(`Invalid response format from OpenAI: ${errorMessage}`);
    }

    // Validate the result has the expected structure
    if (!result || typeof result !== 'object') {
      throw new Error("OpenAI returned invalid nutrition data format");
    }

    // Ensure all required fields exist with defaults
    const nutritionData: ExtractedNutrition = {
      energy: result.energy || { kj: 0, kcal: 0 },
      fat: Number(result.fat) || 0,
      saturatedFat: Number(result.saturatedFat) || 0,
      carbohydrates: Number(result.carbohydrates) || 0,
      sugars: Number(result.sugars) || 0,
      fiber: Number(result.fiber) || 0,
      protein: Number(result.protein) || 0,
      salt: Number(result.salt) || 0
    };

    console.log("[OPENAI NUTRITION] Successfully extracted nutrition data:", nutritionData);
    return nutritionData;
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
