import { type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse, type UserDatabase, type InsertUserDatabase } from "@shared/schema";
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
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.model("User", userSchema, "users");
const FormModel = mongoose.model("Form", formSchema, "forms");
const ResponseModel = mongoose.model("Response", responseSchema, "responses");
const PrivateUserModel = mongoose.model("PrivateUser", privateUserSchema, "private_users");
const UserDatabaseModel = mongoose.model("UserDatabase", userDatabaseSchema, "user_databases");

export class MongoDBStorage implements IStorage {
  private connected = false;

  async connect() {
    if (this.connected) return;
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI environment variable is not set");
    await mongoose.connect(mongoUri);
    this.connected = true;
  }

  async createUserDatabase(dbData: InsertUserDatabase): Promise<UserDatabase> {
    await this.connect();
    const id = Math.random().toString(36).substr(2, 9);
    const newDb = { id, ...dbData, createdAt: new Date(), updatedAt: new Date() };
    const doc = await UserDatabaseModel.create(newDb);
    const { _id, ...rest } = doc.toObject() as any;

    try {
      const formId = Math.random().toString(36).substr(2, 9);
      const headers = Array.isArray(dbData.config?.columns)
        ? dbData.config.columns
        : Object.keys(dbData.config?.columns || {});

      const dummyForm = {
        id: formId,
        userId: dbData.userId || "system",
        title: dbData.name,
        status: "Active",
        visibility: "public",
        fields: headers.map((header: string) => ({ id: header, label: header, type: "text" })),
        outputFormats: [],
        isDataForm: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      await FormModel.create(dummyForm);

      if (Array.isArray(dbData.data) && dbData.data.length > 0) {
        const responsePromises = dbData.data.map((rowData: any) => {
          const responseId = Math.random().toString(36).substr(2, 9);
          return ResponseModel.create({
            id: responseId,
            formId,
            data: rowData,
            submittedAt: new Date(),
            updatedAt: new Date(),
          });
        });
        await Promise.all(responsePromises);
      }
    } catch (error) {
      console.error("Error creating dummy form for database:", error);
    }

    return rest as UserDatabase;
  }
}

export const mongoStorage = new MongoDBStorage();