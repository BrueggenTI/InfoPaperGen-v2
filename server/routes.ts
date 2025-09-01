import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { productInfoSchema } from "@shared/schema";
import { extractIngredientsFromImage, extractNutritionFromImage, translateIngredients } from "./services/openai";
import { handlePDFDownload, handleDirectPDFGeneration } from "./lib/puppeteer-pdf-generator";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

import { azureHealthCheck } from "./middleware/azure-monitoring";
import { registerTestRoutes } from "./routes-test";
import { DebugLogger } from "./utils/debug-logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Azure Health Check Endpoint
  app.get("/api/health", azureHealthCheck);

  // Register Azure test endpoints (for development and deployment verification)
  if (process.env.NODE_ENV !== 'production') {
    registerTestRoutes(app);
  }
  // Create new product info session
  app.post("/api/product-info/sessions", async (req, res, next) => {
    try {
      const validatedData = productInfoSchema.parse(req.body);
      const session = await storage.createProductInfoSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        (error as any).status = 400;
      }
      next(error);
    }
  });

  // Get product info session
  app.get("/api/product-info/sessions/:id", async (req, res, next) => {
    try {
      const session = await storage.getProductInfoSession(req.params.id);
      if (!session) {
        const err = new Error("Session not found");
        (err as any).status = 404;
        return next(err);
      }
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  // Update product info session
  app.put("/api/product-info/sessions/:id", async (req, res, next) => {
    try {
      const validatedData = productInfoSchema.parse(req.body);
      const session = await storage.updateProductInfoSession(req.params.id, validatedData);
      res.json(session);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        (error as any).status = 400;
      }
      next(error);
    }
  });

  // Delete product info session
  app.delete("/api/product-info/sessions/:id", async (req, res, next) => {
    try {
      await storage.deleteProductInfoSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Extract ingredients from image
  app.post("/api/extract/ingredients", upload.single("image"), async (req, res) => {
    const operationId = `ingredient-extraction-${Date.now()}`;

    try {
      DebugLogger.info("INGREDIENT_EXTRACTION", "Started", { 
        operationId,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        apiKeyAvailable: !!process.env.OPENAI_API_KEY
      });

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        DebugLogger.error("INGREDIENT_EXTRACTION", "API Key Missing", { operationId }, "OpenAI API key not configured");
        res.status(503).json({ 
          message: "Zutatenlisten-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Zutaten manuell ein.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Zutaten manuell in die Felder eingeben.",
          debugInfo: { operationId, step: "API_KEY_VALIDATION", error: "Missing OPENAI_API_KEY environment variable" }
        });
        return;
      }

      if (!req.file) {
        DebugLogger.error("INGREDIENT_EXTRACTION", "No File Provided", { operationId });
        res.status(400).json({ 
          message: "No image file provided",
          userFriendlyMessage: "Kein Bild wurde hochgeladen. Bitte wählen Sie ein Bild aus.",
          debugInfo: { operationId, step: "FILE_VALIDATION", error: "No file in request" }
        });
        return;
      }

      DebugLogger.info("INGREDIENT_EXTRACTION", "Converting to Base64", { 
        operationId, 
        fileSize: req.file.size, 
        mimeType: req.file.mimetype 
      });

      const base64Image = req.file.buffer.toString("base64");

      DebugLogger.info("INGREDIENT_EXTRACTION", "Calling OpenAI API", { 
        operationId, 
        base64Length: base64Image.length 
      });

      const extractedIngredients = await extractIngredientsFromImage(base64Image);

      DebugLogger.success("INGREDIENT_EXTRACTION", "OpenAI Response Received", { 
        operationId, 
        ingredientCount: extractedIngredients.ingredients?.length || 0 
      });

      // Round all percentages to one decimal place
      const roundedIngredients = {
        ...extractedIngredients,
        ingredients: extractedIngredients.ingredients.map(ingredient => ({
          ...ingredient,
          percentage: ingredient.percentage !== null && ingredient.percentage !== undefined 
            ? Math.round(ingredient.percentage * 10) / 10 
            : ingredient.percentage
        }))
      };

      DebugLogger.success("INGREDIENT_EXTRACTION", "Processing Complete", { 
        operationId, 
        finalIngredientCount: roundedIngredients.ingredients?.length || 0 
      });

      res.json(roundedIngredients);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      DebugLogger.error("INGREDIENT_EXTRACTION", "Processing Failed", { 
        operationId, 
        errorMessage, 
        errorStack: error instanceof Error ? error.stack : undefined 
      }, error as Error);

      // Check if this is an API key related error
      if (errorMessage.includes("OpenAI API key")) {
        res.status(503).json({ 
          message: "Zutatenlisten-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Zutaten manuell ein.",
          error: errorMessage,
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Zutaten manuell in die Felder eingeben.",
          debugInfo: { operationId, step: "OPENAI_API_CALL", error: errorMessage }
        });
      } else {
        res.status(500).json({ 
          message: "Error extracting ingredients", 
          error: errorMessage,
          userFriendlyMessage: "Die Zutaten konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild.",
          debugInfo: { operationId, step: "IMAGE_PROCESSING", error: errorMessage }
        });
      }
    }
  });

  // Extract ingredients from base64 image (for the new ingredients step)
  app.post("/api/extract-ingredients", async (req, res, next) => {
    try {
      const { image, isBaseProduct } = req.body;

      if (!image) {
        const err = new Error("No image data provided");
        (err as any).status = 400;
        return next(err);
      }

      const extractedIngredients = await extractIngredientsFromImage(image, isBaseProduct);

      // Round all percentages to one decimal place
      const roundedIngredients = {
        ...extractedIngredients,
        ingredients: extractedIngredients.ingredients.map(ingredient => ({
          ...ingredient,
          percentage: ingredient.percentage !== null && ingredient.percentage !== undefined
            ? Math.round(ingredient.percentage * 10) / 10
            : ingredient.percentage
        }))
      };

      res.json(roundedIngredients);
    } catch (error) {
      next(error);
    }
  });

  // Extract nutrition from image
  app.post("/api/extract/nutrition", upload.single("image"), async (req, res) => {
    const operationId = `nutrition-extraction-${Date.now()}`;

    try {
      DebugLogger.info("NUTRITION_EXTRACTION", "Started", { 
        operationId,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        apiKeyAvailable: !!process.env.OPENAI_API_KEY
      });

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        DebugLogger.error("NUTRITION_EXTRACTION", "API Key Missing", { operationId }, "OpenAI API key not configured");
        res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben.",
          debugInfo: { operationId, step: "API_KEY_VALIDATION", error: "Missing OPENAI_API_KEY environment variable" }
        });
        return;
      }

      if (!req.file) {
        DebugLogger.error("NUTRITION_EXTRACTION", "No File Provided", { operationId });
        res.status(400).json({ 
          message: "No image file provided",
          userFriendlyMessage: "Kein Bild wurde hochgeladen. Bitte wählen Sie ein Bild aus.",
          debugInfo: { operationId, step: "FILE_VALIDATION", error: "No file in request" }
        });
        return;
      }

      DebugLogger.info("NUTRITION_EXTRACTION", "Converting to Base64", { 
        operationId, 
        fileSize: req.file.size, 
        mimeType: req.file.mimetype 
      });

      const base64Image = req.file.buffer.toString("base64");

      console.log(`[${operationId}] About to call extractNutritionFromImage...`);
      
      // Robust try-catch for nutrition extraction with detailed German error logging
      let extractedNutrition;
      try {
        extractedNutrition = await extractNutritionFromImage(base64Image);
        console.log(`[${operationId}] extractNutritionFromImage completed:`, extractedNutrition);
      } catch (extractionError) {
        const errorMessage = extractionError instanceof Error ? extractionError.message : String(extractionError);
        
        // Detailed logging as requested in German problem description
        console.error("=== NÄHRWERTETABELLE VERARBEITUNG FEHLER ===");
        console.error("Fehler beim Verarbeiten der Nährwertetabelle:", extractionError);
        console.error("Fehlermeldung (Exception as e):", errorMessage);
        console.error("Error Stack:", extractionError instanceof Error ? extractionError.stack : "Kein Stack Trace");
        console.error("Operation ID:", operationId);
        console.error("Image size:", Math.round(base64Image.length / 1024), "KB");
        console.error("Timestamp:", new Date().toISOString());
        console.error("=== ENDE NÄHRWERTETABELLE FEHLER ===");
        
        // Don't crash the app - return error response instead
        DebugLogger.error("NUTRITION_EXTRACTION", "Processing Failed", { 
          operationId,
          error: errorMessage,
          errorType: extractionError instanceof Error ? extractionError.constructor.name : typeof extractionError
        });

        res.status(500).json({ 
          message: "Die Nährwertetabelle konnte nicht verarbeitet werden",
          error: errorMessage,
          userFriendlyMessage: "Die Nährwerte konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild.",
          debugInfo: { 
            operationId, 
            step: "NUTRITION_EXTRACTION", 
            error: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      DebugLogger.success("NUTRITION_EXTRACTION", "Processing Complete", { 
        operationId, 
        hasNutrition: !!extractedNutrition,
        nutritionKeys: Object.keys(extractedNutrition || {}),
        nutritionData: extractedNutrition
      });

      // Ensure consistent response format across all nutrition endpoints
      res.json({ nutrition: extractedNutrition });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      DebugLogger.error("NUTRITION_EXTRACTION", "Processing Failed", { 
        operationId, 
        errorMessage, 
        errorStack: error instanceof Error ? error.stack : undefined 
      }, error as Error);

      // Check if this is an API key related error
      if (errorMessage.includes("OpenAI API key")) {
        res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: errorMessage,
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben.",
          debugInfo: { operationId, step: "OPENAI_API_CALL", error: errorMessage }
        });
      } else {
        res.status(500).json({ 
          message: "Error extracting nutrition", 
          error: errorMessage,
          userFriendlyMessage: "Die Nährwerte konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild.",
          debugInfo: { operationId, step: "IMAGE_PROCESSING", error: errorMessage }
        });
      }
    }
  });

  // Extract nutrition from base64 image
  app.post("/api/extract-nutrition", async (req, res) => {
    const operationId = `nutrition-extraction-base64-${Date.now()}`;

    try {
      DebugLogger.info("NUTRITION_EXTRACTION_BASE64", "Started", { 
        operationId,
        hasImageData: !!req.body?.image,
        apiKeyAvailable: !!process.env.OPENAI_API_KEY
      });

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        DebugLogger.error("NUTRITION_EXTRACTION_BASE64", "API Key Missing", { operationId });
        return res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben.",
          operationId
        });
      }

      const { image } = req.body;

      if (!image) {
        DebugLogger.error("NUTRITION_EXTRACTION_BASE64", "No Image Data", { operationId });
        return res.status(400).json({ 
          message: "No image data provided",
          userFriendlyMessage: "Kein Bild wurde hochgeladen. Bitte wählen Sie ein Bild aus.",
          operationId
        });
      }

      // Clean base64 data - remove any data URL prefix if present
      let cleanBase64 = image;
      if (typeof image === 'string' && image.includes(',')) {
        cleanBase64 = image.split(',')[1];
      }

      // Validate base64 format
      if (!cleanBase64 || typeof cleanBase64 !== 'string' || cleanBase64.length === 0) {
        DebugLogger.error("NUTRITION_EXTRACTION_BASE64", "Invalid Base64 Format", { 
          operationId, 
          hasCleanBase64: !!cleanBase64,
          base64Length: cleanBase64?.length || 0
        });
        return res.status(400).json({ 
          message: "Invalid image data format",
          userFriendlyMessage: "Das Bildformat konnte nicht verarbeitet werden. Bitte versuchen Sie es mit einem anderen Bild.",
          operationId
        });
      }

      // Validate it's properly base64 encoded
      try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        if (buffer.length === 0) {
          throw new Error("Empty buffer after base64 decode");
        }
        DebugLogger.info("NUTRITION_EXTRACTION_BASE64", "Base64 Validation Success", { 
          operationId, 
          bufferSize: buffer.length 
        });
      } catch (e) {
        DebugLogger.error("NUTRITION_EXTRACTION_BASE64", "Base64 Validation Failed", { operationId, error: e });
        return res.status(400).json({ 
          message: "Invalid base64 image data",
          userFriendlyMessage: "Das Bild konnte nicht gelesen werden. Bitte verwenden Sie ein gültiges Bildformat (JPG, PNG).",
          operationId
        });
      }

      DebugLogger.info("NUTRITION_EXTRACTION_BASE64", "Calling OpenAI", { operationId });
      const extractedNutrition = await extractNutritionFromImage(cleanBase64);

      console.log(`[${operationId}] Sending response with nutrition data:`, { nutrition: extractedNutrition });

      // Make sure response format matches frontend expectations
      const response = { nutrition: extractedNutrition };
      res.json(response);

      console.log(`[${operationId}] Response sent successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorType = error instanceof Error ? error.constructor.name : typeof error;

      console.error(`[${operationId}] Error in nutrition extraction:`, error);

      DebugLogger.error("NUTRITION_EXTRACTION_BASE64", "Failed", { 
        operationId, 
        errorMessage, 
        errorStack: errorStack?.split('\n')[0], // Only first line to avoid too much data
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString()
      }, error as Error);

      // Enhanced error handling for deployment issues
      if (errorMessage.includes("OpenAI API key") || errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("not configured")) {
        return res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: "OpenAI API service unavailable",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben.",
          operationId,
          debugInfo: {
            step: "API_KEY_VALIDATION",
            environment: process.env.NODE_ENV,
            hasApiKey: !!process.env.OPENAI_API_KEY,
            timestamp: new Date().toISOString()
          }
        });
      } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNRESET")) {
        return res.status(504).json({ 
          message: "Request timeout",
          error: "Processing timeout", 
          userFriendlyMessage: "Die Verarbeitung hat zu lange gedauert. Bitte versuchen Sie es mit einem kleineren oder klareren Bild.",
          operationId,
          debugInfo: {
            step: "TIMEOUT_ERROR",
            timestamp: new Date().toISOString()
          }
        });
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
        return res.status(429).json({
          message: "Rate limit exceeded",
          error: "Too many requests",
          userFriendlyMessage: "Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
          operationId,
          debugInfo: {
            step: "RATE_LIMIT_ERROR",
            timestamp: new Date().toISOString()
          }
        });
      } else {
        return res.status(500).json({ 
          message: "Error extracting nutrition", 
          error: errorMessage,
          userFriendlyMessage: "Die Nährwerte konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild.",
          operationId,
          debug: {
            timestamp: new Date().toISOString(),
            errorType
          }
        });
      }
    }
  });

  // Translate ingredients
  app.post("/api/translate-ingredients", async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error("[INGREDIENT TRANSLATION] OpenAI API key not available");
        res.status(503).json({ 
          message: "Zutatenlisten-Übersetzung ist derzeit nicht verfügbar.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Übersetzung ist in der aktuellen Umgebung nicht verfügbar. Sie können die Zutaten manuell übersetzen."
        });
        return;
      }

      const { ingredients, targetLanguage, sourceLanguage } = req.body;

      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        res.status(400).json({ 
          message: "No ingredients provided",
          userFriendlyMessage: "Keine Zutaten zum Übersetzen vorhanden."
        });
        return;
      }

      if (!targetLanguage) {
        res.status(400).json({ 
          message: "Target language is required",
          userFriendlyMessage: "Zielsprache ist erforderlich."
        });
        return;
      }

      const translationResult = await translateIngredients({
        ingredients,
        targetLanguage,
        sourceLanguage
      });

      res.json(translationResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[INGREDIENT TRANSLATION] Error:", error);

      // Check if this is an API key related error
      if (errorMessage.includes("OpenAI API key")) {
        res.status(503).json({ 
          message: "Zutatenlisten-Übersetzung ist derzeit nicht verfügbar.",
          error: errorMessage,
          userFriendlyMessage: "Die automatische Übersetzung ist in der aktuellen Umgebung nicht verfügbar. Sie können die Zutaten manuell übersetzen."
        });
      } else {
        res.status(500).json({ 
          message: "Error translating ingredients", 
          error: errorMessage,
          userFriendlyMessage: "Die Zutaten konnten nicht übersetzt werden. Bitte versuchen Sie es erneut oder übersetzen Sie sie manuell."
        });
      }
    }
  });

  // Enhanced Puppeteer-based PDF generation endpoint
  app.post("/api/download-pdf", handlePDFDownload);

  // Direct PDF generation from form data
  app.post("/api/generate-pdf", handleDirectPDFGeneration);

  // Debug endpoints for troubleshooting, only available in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    app.get("/api/debug/logs", (req, res) => {
      const operation = req.query.operation as string;
      const logs = DebugLogger.getLogs(operation);
      res.json({
        logs,
        totalLogs: logs.length,
        operations: Array.from(new Set(DebugLogger.getLogs().map(log => log.operation)))
      });
    });

    app.get("/api/debug/status", (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        recentErrors: DebugLogger.getLogs().filter(log => log.status === 'error').slice(0, 5),
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage()
        }
      });
    });

    app.post("/api/debug/clear", (req, res) => {
      DebugLogger.clearLogs();
      res.json({ message: "Debug logs cleared", timestamp: new Date().toISOString() });
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
