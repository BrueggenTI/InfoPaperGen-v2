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

export async function registerRoutes(app: Express): Promise<Server> {
  // Azure Health Check Endpoint
  app.get("/api/health", azureHealthCheck);

  // Register Azure test endpoints (for development and deployment verification)
  if (process.env.NODE_ENV !== 'production') {
    registerTestRoutes(app);
  }
  // Create new product info session
  app.post("/api/product-info/sessions", async (req, res) => {
    try {
      const validatedData = productInfoSchema.parse(req.body);
      const session = await storage.createProductInfoSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid product info data", error: (error as Error).message });
    }
  });

  // Get product info session
  app.get("/api/product-info/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getProductInfoSession(req.params.id);
      if (!session) {
        res.status(404).json({ message: "Session not found" });
        return;
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Error retrieving session", error: (error as Error).message });
    }
  });

  // Update product info session
  app.put("/api/product-info/sessions/:id", async (req, res) => {
    try {
      const validatedData = productInfoSchema.parse(req.body);
      const session = await storage.updateProductInfoSession(req.params.id, validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Error updating session", error: (error as Error).message });
    }
  });

  // Delete product info session
  app.delete("/api/product-info/sessions/:id", async (req, res) => {
    try {
      await storage.deleteProductInfoSession(req.params.id);
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Error deleting session", error: (error as Error).message });
    }
  });

  // Extract ingredients from image
  app.post("/api/extract/ingredients", upload.single("image"), async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error("[INGREDIENT EXTRACTION] OpenAI API key not available");
        res.status(503).json({ 
          message: "Zutatenlisten-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Zutaten manuell ein.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Zutaten manuell in die Felder eingeben."
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ 
          message: "No image file provided",
          userFriendlyMessage: "Kein Bild wurde hochgeladen. Bitte wählen Sie ein Bild aus."
        });
        return;
      }

      const base64Image = req.file.buffer.toString("base64");
      const extractedIngredients = await extractIngredientsFromImage(base64Image);
      
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[INGREDIENT EXTRACTION] Error:", error);
      
      // Check if this is an API key related error
      if (errorMessage.includes("OpenAI API key")) {
        res.status(503).json({ 
          message: "Zutatenlisten-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Zutaten manuell ein.",
          error: errorMessage,
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Zutaten manuell in die Felder eingeben."
        });
      } else {
        res.status(500).json({ 
          message: "Error extracting ingredients", 
          error: errorMessage,
          userFriendlyMessage: "Die Zutaten konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild."
        });
      }
    }
  });

  // Extract ingredients from base64 image (for the new ingredients step)
  app.post("/api/extract-ingredients", async (req, res) => {
    try {
      const { image, isBaseProduct } = req.body;
      
      if (!image) {
        res.status(400).json({ message: "No image data provided" });
        return;
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
      res.status(500).json({ message: "Error extracting ingredients", error: (error as Error).message });
    }
  });

  // Extract nutrition from image
  app.post("/api/extract/nutrition", upload.single("image"), async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error("[NUTRITION EXTRACTION] OpenAI API key not available");
        res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben."
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ 
          message: "No image file provided",
          userFriendlyMessage: "Kein Bild wurde hochgeladen. Bitte wählen Sie ein Bild aus."
        });
        return;
      }

      const base64Image = req.file.buffer.toString("base64");
      const extractedNutrition = await extractNutritionFromImage(base64Image);
      res.json(extractedNutrition);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[NUTRITION EXTRACTION] Error:", error);
      
      // Check if this is an API key related error
      if (errorMessage.includes("OpenAI API key")) {
        res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: errorMessage,
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben."
        });
      } else {
        res.status(500).json({ 
          message: "Error extracting nutrition", 
          error: errorMessage,
          userFriendlyMessage: "Die Nährwerte konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild."
        });
      }
    }
  });

  // Extract nutrition from base64 image
  app.post("/api/extract-nutrition", async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error("[NUTRITION EXTRACTION] OpenAI API key not available");
        res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: "OpenAI API key not configured",
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben."
        });
        return;
      }

      const { image } = req.body;
      
      if (!image) {
        res.status(400).json({ 
          message: "No image data provided",
          userFriendlyMessage: "Kein Bild wurde hochgeladen. Bitte wählen Sie ein Bild aus."
        });
        return;
      }

      // Clean base64 data - remove any data URL prefix if present
      let cleanBase64 = image;
      if (image.includes(',')) {
        cleanBase64 = image.split(',')[1];
      }

      // Validate base64 format
      if (!cleanBase64 || cleanBase64.length === 0) {
        res.status(400).json({ 
          message: "Invalid image data format",
          userFriendlyMessage: "Das Bildformat konnte nicht verarbeitet werden. Bitte versuchen Sie es mit einem anderen Bild."
        });
        return;
      }

      // Validate it's properly base64 encoded
      try {
        Buffer.from(cleanBase64, 'base64');
      } catch (e) {
        res.status(400).json({ 
          message: "Invalid base64 image data",
          userFriendlyMessage: "Das Bild konnte nicht gelesen werden. Bitte verwenden Sie ein gültiges Bildformat (JPG, PNG)."
        });
        return;
      }

      const extractedNutrition = await extractNutritionFromImage(cleanBase64);
      res.json({ nutrition: extractedNutrition });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorType = error instanceof Error ? error.constructor.name : typeof error;
      
      console.error("[NUTRITION EXTRACTION] Error:", error);
      console.error("[NUTRITION EXTRACTION] Error details", {
        errorMessage,
        errorStack,
        processingTimeMs: Date.now()
      });

      // Check if this is an API key related error
      if (errorMessage.includes("OpenAI API key")) {
        res.status(503).json({ 
          message: "Nährwert-Extraktion ist derzeit nicht verfügbar. Bitte geben Sie die Nährwerte manuell ein.",
          error: errorMessage,
          userFriendlyMessage: "Die automatische Bildanalyse ist in der aktuellen Umgebung nicht verfügbar. Sie können die Nährwerte manuell in die Felder eingeben."
        });
      } else {
        res.status(500).json({ 
          message: "Error extracting nutrition", 
          error: errorMessage,
          userFriendlyMessage: "Die Nährwerte konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein oder versuchen Sie es mit einem klareren Bild.",
          debug: {
            processingTimeMs: Date.now(),
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

  const httpServer = createServer(app);
  return httpServer;
}
