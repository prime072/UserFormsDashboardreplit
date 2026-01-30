import { type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, forms, responses } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers?(): Promise<User[]>;
  deleteUser?(id: string): Promise<boolean>;
  
  // Form methods
  getForm(id: string): Promise<Form | undefined>;
  getFormsByUserId(userId: string): Promise<Form[]>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: string): Promise<boolean>;
  
  // Response methods
  createResponse(response: InsertResponse): Promise<Response>;
  getResponse?(id: string): Promise<Response | undefined>;
  getResponsesByFormId(formId: string): Promise<Response[]>;
  getResponseCount(formId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Form methods
  async getForm(id: string): Promise<Form | undefined> {
    const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
    return result[0];
  }

  async getFormsByUserId(userId: string): Promise<Form[]> {
    return await db
      .select()
      .from(forms)
      .where(eq(forms.userId, userId))
      .orderBy(desc(forms.updatedAt));
  }

  async createForm(form: InsertForm): Promise<Form> {
    const result = await db.insert(forms).values(form).returning();
    return result[0];
  }

  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined> {
    const result = await db
      .update(forms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return result[0];
  }

  async deleteForm(id: string): Promise<boolean> {
    const result = await db.delete(forms).where(eq(forms.id, id)).returning();
    return result.length > 0;
  }

  // Response methods
  async createResponse(response: InsertResponse): Promise<Response> {
    const result = await db.insert(responses).values(response).returning();
    return result[0];
  }

  async getResponsesByFormId(formId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.formId, formId))
      .orderBy(desc(responses.submittedAt));
  }

  async getResponseCount(formId: string): Promise<number> {
    const result = await db
      .select()
      .from(responses)
      .where(eq(responses.formId, formId));
    return result.length;
  }
}

// Use MongoDB if MONGODB_URI is set, otherwise use PostgreSQL
import { mongoStorage } from "./mongo-storage";

// Ensure MongoDB is connected if URI is provided
if (process.env.MONGODB_URI) {
  mongoStorage.connect().catch(err => {
    console.error("Failed to connect to MongoDB on startup:", err);
  });
}

const storage = process.env.MONGODB_URI ? mongoStorage : new DatabaseStorage();

export { storage };
