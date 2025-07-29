import { type User, type InsertUser, type ProductInfoSession, type InsertProductInfoSession, type ProductInfo } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Product Info Session methods
  createProductInfoSession(sessionData: ProductInfo): Promise<ProductInfoSession>;
  getProductInfoSession(id: string): Promise<ProductInfoSession | undefined>;
  updateProductInfoSession(id: string, sessionData: ProductInfo): Promise<ProductInfoSession>;
  deleteProductInfoSession(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private productInfoSessions: Map<string, ProductInfoSession>;

  constructor() {
    this.users = new Map();
    this.productInfoSessions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createProductInfoSession(sessionData: ProductInfo): Promise<ProductInfoSession> {
    const id = randomUUID();
    const now = new Date();
    const session: ProductInfoSession = {
      id,
      sessionData,
      createdAt: now,
      updatedAt: now,
    };
    this.productInfoSessions.set(id, session);
    return session;
  }

  async getProductInfoSession(id: string): Promise<ProductInfoSession | undefined> {
    return this.productInfoSessions.get(id);
  }

  async updateProductInfoSession(id: string, sessionData: ProductInfo): Promise<ProductInfoSession> {
    const existing = this.productInfoSessions.get(id);
    if (!existing) {
      throw new Error("Session not found");
    }
    
    const updated: ProductInfoSession = {
      ...existing,
      sessionData,
      updatedAt: new Date(),
    };
    this.productInfoSessions.set(id, updated);
    return updated;
  }

  async deleteProductInfoSession(id: string): Promise<void> {
    this.productInfoSessions.delete(id);
  }
}

export const storage = new MemStorage();
