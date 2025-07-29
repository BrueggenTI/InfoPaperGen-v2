import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { productInfoSchema } from "@shared/schema";
import { extractIngredientsFromImage, extractNutritionFromImage } from "./services/openai";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
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
      if (!req.file) {
        res.status(400).json({ message: "No image file provided" });
        return;
      }

      const base64Image = req.file.buffer.toString("base64");
      const extractedIngredients = await extractIngredientsFromImage(base64Image);
      res.json(extractedIngredients);
    } catch (error) {
      res.status(500).json({ message: "Error extracting ingredients", error: (error as Error).message });
    }
  });

  // Extract nutrition from image
  app.post("/api/extract/nutrition", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No image file provided" });
        return;
      }

      const base64Image = req.file.buffer.toString("base64");
      const extractedNutrition = await extractNutritionFromImage(base64Image);
      res.json(extractedNutrition);
    } catch (error) {
      res.status(500).json({ message: "Error extracting nutrition", error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
