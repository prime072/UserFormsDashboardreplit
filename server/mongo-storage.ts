import { type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse } from "@shared/schema";
import mongoose from "mongoose";
import { type IStorage } from "./storage";

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  firstName: String,
  lastName: String,
  phone: String,
  company: String,
  photo: String,
  password: String,
  username: String,
  status: { type: String, default: "active" },
  totalForms: { type: Number, default: 0 },
  totalResponses: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const formSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: String,
  title: String,
  status: { type: String, default: "Active" },
  visibility: { type: String, enum: ["public", "private"], default: "public" },
  fields: mongoose.Schema.Types.Mixed,
  outputFormats: { type: Array, default: ["thank_you"] },
  tableConfig: { type: Array, default: [] },
  gridConfig: mongoose.Schema.Types.Mixed,
  gridConfigs: { type: Array, default: [] },
  whatsappFormat: { type: String, default: "" },
  allowEditing: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const privateUserSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: String,
  name: String,
  email: String,
  password: String,
  accessibleForms: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const responseSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  formId: String,
  data: mongoose.Schema.Types.Mixed,
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const userDatabaseSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: String,
  name: String,
  description: String,
  config: mongoose.Schema.Types.Mixed,
  data: { type: Array, default: [] },
  columnNames: { type: Array, default: [] },
  sourceType: { type: String, default: "manual" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
const FormModel = mongoose.models.Form || mongoose.model("Form", formSchema);
const PrivateUserModel = mongoose.models.PrivateUser || mongoose.model("PrivateUser", privateUserSchema);
const ResponseModel = mongoose.models.Response || mongoose.model("Response", responseSchema);
const UserDatabaseModel = mongoose.models.UserDatabase || mongoose.model("UserDatabase", userDatabaseSchema);

class MongoStorage implements IStorage {
  async connect() {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(process.env.MONGODB_URI || "");
  }

  async getFormsByUserId(userId: string): Promise<Form[]> { return []; }
  async getForm(id: string): Promise<Form | undefined> { return undefined; }
  async createForm(form: InsertForm): Promise<Form> { return {} as Form; }
  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined> { return undefined; }
  async deleteForm(id: string): Promise<boolean> { return false; }
  async getResponseCount(formId: string): Promise<number> { return 0; }
  async getUserDatabasesByUserId(userId: string): Promise<any[]> { return []; }
  async getUserDatabase(id: string): Promise<any | undefined> { return undefined; }
  async createUserDatabase(dbData: any): Promise<any> { return {} as any; }
  async updateUserDatabase(id: string, updates: any): Promise<any | undefined> { return undefined; }
  async deleteUserDatabase(id: string): Promise<boolean> { return false; }
}

export const mongoStorage = new MongoStorage();
