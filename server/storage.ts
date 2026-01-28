import { type User, type InsertUser, type Form, type InsertForm, type Response, type Response as SelectResponse, type InsertResponse, type Project, type ProjectUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, forms, responses, projects, projectUsers } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers?(): Promise<User[]>;
  deleteUser?(id: string): Promise<boolean>;
  
  // Project methods
  createProject(project: any): Promise<Project>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  
  // Project User methods
  createProjectUser(projectUser: any): Promise<ProjectUser>;
  getProjectUsers(projectId: string): Promise<ProjectUser[]>;
  getProjectUser(projectId: string, userId: string): Promise<ProjectUser | undefined>;
  
  // Form methods
  getForm(id: string): Promise<Form | undefined>;
  getFormsByUserId(userId: string): Promise<Form[]>;
  getFormsByProjectId(projectId: string): Promise<Form[]>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: string): Promise<boolean>;
  
  // Response methods
  createResponse(response: InsertResponse): Promise<SelectResponse>;
  getResponse?(id: string): Promise<SelectResponse | undefined>;
  getResponsesByFormId(formId: string): Promise<SelectResponse[]>;
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

  // Project methods
  async createProject(project: any): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  // Project User methods
  async createProjectUser(projectUser: any): Promise<ProjectUser> {
    const result = await db.insert(projectUsers).values(projectUser).returning();
    return result[0];
  }

  async getProjectUsers(projectId: string): Promise<ProjectUser[]> {
    return await db.select().from(projectUsers).where(eq(projectUsers.projectId, projectId));
  }

  async getProjectUser(projectId: string, userId: string): Promise<ProjectUser | undefined> {
    const result = await db.select().from(projectUsers).where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId))).limit(1);
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

  async getFormsByProjectId(projectId: string): Promise<Form[]> {
    return await db
      .select()
      .from(forms)
      .where(eq(forms.projectId, projectId))
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
  async createResponse(response: InsertResponse): Promise<SelectResponse> {
    const result = await db.insert(responses).values(response).returning();
    return result[0];
  }

  async getResponsesByFormId(formId: string): Promise<SelectResponse[]> {
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
