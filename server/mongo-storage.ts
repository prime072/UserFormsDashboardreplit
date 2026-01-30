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
});

const UserModel = mongoose.model("User", userSchema, "users");
const FormModel = mongoose.model("Form", formSchema, "forms");
const ResponseModel = mongoose.model("Response", responseSchema, "responses");
const PrivateUserModel = mongoose.model("PrivateUser", privateUserSchema, "private_users");

export class MongoDBStorage implements IStorage {
  private connected = false;

  async connect() {
    if (this.connected) return;
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    try {
      await mongoose.connect(mongoUri);
      this.connected = true;
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOne({ id }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOne({ $or: [{ username }, { email: username }] }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOne({ email }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as User;
  }

  async updateUser(id: string, updates: any): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as User;
  }

  async updateUserMetrics(id: string): Promise<User | undefined> {
    await this.connect();
    const userForms = await FormModel.countDocuments({ userId: id });
    const formIds = (await FormModel.find({ userId: id }, { id: 1 }).lean()).map((f: any) => f.id);
    const totalResponses = formIds.length > 0 ? await ResponseModel.countDocuments({ formId: { $in: formIds } }) : 0;
    
    const doc = await UserModel.findOneAndUpdate(
      { id },
      { totalForms: userForms, totalResponses, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as User;
  }

  async getAllUsers(): Promise<User[]> {
    await this.connect();
    const docs = await UserModel.find({}).lean();
    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest as User;
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.connect();
    // Get all user's forms first (before deleting them)
    const userForms = await FormModel.find({ userId: id });
    const formIds = userForms.map((f: any) => f.id);
    
    // Delete all responses for user's forms
    if (formIds.length > 0) {
      await ResponseModel.deleteMany({ formId: { $in: formIds } });
    }
    
    // Delete all user's forms
    await FormModel.deleteMany({ userId: id });
    
    // Delete the user
    await UserModel.deleteOne({ id });
    
    return true;
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.connect();
    const id = Math.random().toString(36).substr(2, 9);
    const email = (user as any).email || (user as any).username;
    const firstName = email?.split("@")[0] || "";
    const newUser = {
      id,
      email,
      firstName,
      lastName: "",
      phone: "",
      company: "",
      photo: "",
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const doc = await UserModel.create(newUser);
    const { _id, ...rest } = doc.toObject() as any;
    return rest as User;
  }

  // Form methods
  async getForm(id: string): Promise<Form | undefined> {
    await this.connect();
    const doc = await FormModel.findOne({ id }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as Form;
  }

  async getFormsByUserId(userId: string): Promise<Form[]> {
    await this.connect();
    const docs = await FormModel.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest as Form;
    });
  }

  async createForm(form: InsertForm): Promise<Form> {
    await this.connect();
    const id = Math.random().toString(36).substr(2, 9);
    const newForm = {
      id,
      ...form,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    const doc = await FormModel.create(newForm);
    const rest = (doc as any).toObject ? (doc as any).toObject() : (doc as any)[0].toObject();
    delete rest._id;
    return rest as Form;
  }

  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined> {
    await this.connect();
    
    // Get the old form to compare fields
    const oldForm = await FormModel.findOne({ id }).lean();
    if (!oldForm) {
      const doc = await FormModel.findOneAndUpdate(
        { id },
        { ...updates, updatedAt: new Date() },
        { new: true }
      ).lean();
      if (!doc) return undefined;
      const { _id, ...rest } = doc as any;
      return rest as Form;
    }

    // If fields are being updated, handle response updates
    if (updates.fields && Array.isArray(updates.fields)) {
      const oldFields = oldForm.fields || [];
      const newFields = updates.fields;
      
      // Get all responses for this form
      const responses = await ResponseModel.find({ formId: id });
      
      // For each response, add default values for new fields
      for (const response of responses) {
        const updatedData = { ...response.data };
        
        // Add empty/default values for new fields
        newFields.forEach((newField: any) => {
          const oldField = oldFields.find((f: any) => f.id === newField.id);
          if (!oldField && updatedData[newField.id] === undefined) {
            updatedData[newField.id] = newField.type === 'checkbox' ? false : '';
          }
        });
        
        // Update response with new field defaults
        await ResponseModel.findOneAndUpdate(
          { id: response.id },
          { data: updatedData }
        );
      }
    }

    const doc = await FormModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as Form;
  }

  async deleteForm(id: string): Promise<boolean> {
    await this.connect();
    const result = await FormModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Response methods
  async createResponse(response: InsertResponse): Promise<Response> {
    await this.connect();
    const id = Math.random().toString(36).substr(2, 9);
    const newResponse = {
      id,
      ...response,
      submittedAt: new Date(),
    };
    const doc = await ResponseModel.create(newResponse);
    const { _id, ...rest } = doc.toObject() as any;
    return rest as Response;
  }

  async getResponse(id: string): Promise<Response | undefined> {
    await this.connect();
    const doc = await ResponseModel.findOne({ id }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest as Response;
  }

  async getResponsesByFormId(formId: string): Promise<Response[]> {
    await this.connect();
    const docs = await ResponseModel.find({ formId })
      .sort({ submittedAt: -1 })
      .lean();
    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest as Response;
    });
  }

  async getResponseCount(formId: string): Promise<number> {
    await this.connect();
    return await ResponseModel.countDocuments({ formId });
  }

  async getResponseCountByFormIds(formIds: string[]): Promise<number> {
    await this.connect();
    if (formIds.length === 0) return 0;
    return await ResponseModel.countDocuments({ formId: { $in: formIds } });
  }

  // Private User methods
  async createPrivateUser(userId: string, name: string, email: string, password: string): Promise<any> {
    await this.connect();
    const id = Math.random().toString(36).substr(2, 9);
    const doc = await PrivateUserModel.create({
      id,
      userId,
      name,
      email,
      password,
      accessibleForms: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { _id, ...rest } = doc.toObject();
    return rest;
  }

  async getPrivateUsersByUserId(userId: string): Promise<any[]> {
    await this.connect();
    const docs = await PrivateUserModel.find({ userId }).lean();
    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest;
    });
  }

  async getPrivateUser(id: string): Promise<any> {
    await this.connect();
    const doc = await PrivateUserModel.findOne({ id }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest;
  }

  async getPrivateUserByName(name: string): Promise<any> {
    await this.connect();
    const doc = await PrivateUserModel.findOne({ name }).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest;
  }

  async updatePrivateUser(id: string, updates: any): Promise<any> {
    await this.connect();
    const doc = await PrivateUserModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest;
  }

  async deletePrivateUser(id: string): Promise<boolean> {
    await this.connect();
    const result = await PrivateUserModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async updatePrivateUserAccess(privateUserId: string, formIds: string[]): Promise<any> {
    await this.connect();
    const doc = await PrivateUserModel.findOneAndUpdate(
      { id: privateUserId },
      { accessibleForms: formIds, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!doc) return undefined;
    const { _id, ...rest } = doc as any;
    return rest;
  }
}

export const mongoStorage = new MongoDBStorage();
