import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const productInfoSessions = pgTable("product_info_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionData: json("session_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Info Schema
export const productInfoSchema = z.object({
  productNumber: z.string(),
  productName: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  packageSize: z.string().optional(),
  servingSize: z.string().optional(),
  preparedBy: z.string().optional(),
  jobTitle: z.string().optional(),
  currentStep: z.number().min(1).max(5).default(1),
  
  // Images
  productImage: z.string().optional(),
  ingredientImage: z.string().optional(),
  nutritionImage: z.string().optional(),
  
  // Extracted ingredients
  ingredients: z.array(z.object({
    name: z.string(),
    percentage: z.number().optional(),
    origin: z.string().optional(),
    isMarkedAsBase: z.boolean().optional().default(false),
  })).optional(),
  baseProductIngredients: z.array(z.object({
    name: z.string(),
    percentage: z.number().optional(),
    origin: z.string().optional(),
  })).optional(),
  
  // Extracted nutrition (per 100g)
  nutrition: z.object({
    energy: z.object({
      kj: z.number(),
      kcal: z.number(),
    }),
    fat: z.number(),
    saturatedFat: z.number(),
    carbohydrates: z.number(),
    sugars: z.number(),
    fiber: z.number(),
    protein: z.number(),
    salt: z.number(),
    fruitVegLegumeContent: z.number().default(0),
  }).optional(),
  
  // Additional fields
  nutriScore: z.string().optional(),
  allergyAdvice: z.string().optional(),
  storageConditions: z.string().optional(),
  preparation: z.string().optional(),
  productType: z.string().optional(),
  shelfLifeMonths: z.number().optional(),
  declarations: z.object({
    highFiber: z.boolean().optional().default(false),
    highProtein: z.boolean().optional().default(false),
    wholegrain: z.boolean().optional().default(false),
    other: z.string().optional(),
  }).optional(),
});

export const insertProductInfoSessionSchema = createInsertSchema(productInfoSessions).pick({
  sessionData: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ProductInfo = z.infer<typeof productInfoSchema>;
export type InsertProductInfoSession = z.infer<typeof insertProductInfoSessionSchema>;
export type ProductInfoSession = typeof productInfoSessions.$inferSelect;
