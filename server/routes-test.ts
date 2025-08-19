// Azure Compatibility Test Endpoints
import { Express, Request, Response } from "express";
import { extractNutritionFromImage, extractIngredientsFromImage } from "./services/openai";

export function registerTestRoutes(app: Express) {
  // Test OpenAI Azure connectivity
  app.get("/api/test/openai-status", (req: Request, res: Response) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const apiKeyPreview = process.env.OPENAI_API_KEY 
      ? `${process.env.OPENAI_API_KEY.substring(0, 6)}...${process.env.OPENAI_API_KEY.slice(-4)}`
      : 'Not set';
      
    res.json({
      status: hasApiKey ? "configured" : "missing",
      environment: process.env.NODE_ENV,
      apiKeyPreview: hasApiKey ? apiKeyPreview : "Not configured",
      timestamp: new Date().toISOString(),
      azureCompatible: true,
      features: {
        nutritionExtraction: hasApiKey,
        ingredientExtraction: hasApiKey,
        translation: hasApiKey
      }
    });
  });

  // Test nutrition extraction with sample data
  app.post("/api/test/nutrition-extraction", async (req: Request, res: Response) => {
    try {
      const { base64Image } = req.body;
      
      if (!base64Image) {
        return res.status(400).json({
          error: "No base64Image provided",
          message: "Please provide a base64-encoded image for testing"
        });
      }

      console.log("[TEST] Starting nutrition extraction test...");
      const startTime = Date.now();
      
      const result = await extractNutritionFromImage(base64Image);
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        processingTimeMs: processingTime,
        result,
        timestamp: new Date().toISOString(),
        test: "nutrition-extraction"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[TEST] Nutrition extraction test failed:", errorMessage);
      
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        test: "nutrition-extraction"
      });
    }
  });

  // Test ingredient extraction with sample data
  app.post("/api/test/ingredient-extraction", async (req: Request, res: Response) => {
    try {
      const { base64Image, isBaseProduct = false } = req.body;
      
      if (!base64Image) {
        return res.status(400).json({
          error: "No base64Image provided",
          message: "Please provide a base64-encoded image for testing"
        });
      }

      console.log("[TEST] Starting ingredient extraction test...");
      const startTime = Date.now();
      
      const result = await extractIngredientsFromImage(base64Image, isBaseProduct);
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        processingTimeMs: processingTime,
        result,
        timestamp: new Date().toISOString(),
        test: "ingredient-extraction",
        productType: isBaseProduct ? "base-product" : "final-product"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[TEST] Ingredient extraction test failed:", errorMessage);
      
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        test: "ingredient-extraction"
      });
    }
  });
}