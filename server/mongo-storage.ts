import { type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse, type UserDatabase, type InsertUserDatabase } from "@shared/schema";
import mongoose from "mongoose";
import { type IStorage } from "./storage";

// Storage layout
// ----------------------------------------------------------------------
// The `users` collection is the platform's account registry (identity
// only). Everything a user *owns* -- their forms, responses, uploaded
// databases, and private-user sub-accounts -- lives together in a single
// dedicated collection per user: `user_<userId>_data`. Each document in
// that collection carries a `kind` discriminator ("form" | "response" |
// "userDatabase" | "privateUser") so one user's directory holds every
// piece of their data, and no two users' data ever share a collection.
//
// Public routes (viewing/submitting a shared form, editing a response by
// id, private-user login by name) only have an id/name, not the owning
// user's id, so a small `resource_index` collection maps
// { id -> { kind, userId } } (and, for private users, { name -> userId })
// purely as a pointer table -- it stores no actual user data, only which
// per-user directory to look in.

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

const UserModel = mongoose.model("User", userSchema, "users");

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export class MongoDBStorage implements IStorage {
  private connected = false;
  private migrated = false;

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
      await this.migrateToPerUserCollections();
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  // ---- Per-user directory helpers ----------------------------------

  private userCollection(userId: string) {
    return mongoose.connection.db!.collection(`user_${userId}_data`);
  }

  private indexCollection() {
    return mongoose.connection.db!.collection("resource_index");
  }

  private async resolveOwner(id: string): Promise<string | undefined> {
    const entry = await this.indexCollection().findOne({ id });
    return entry?.userId as string | undefined;
  }

  private async indexPut(id: string, kind: string, userId: string, extra: Record<string, any> = {}) {
    await this.indexCollection().updateOne(
      { id },
      { $set: { id, kind, userId, ...extra } },
      { upsert: true },
    );
  }

  private async indexRemove(id: string | string[]) {
    const ids = Array.isArray(id) ? id : [id];
    await this.indexCollection().deleteMany({ id: { $in: ids } });
  }

  private strip<T = any>(doc: any): T | undefined {
    if (!doc) return undefined;
    const { _id, kind, ...rest } = doc;
    return rest as T;
  }

  // One-time migration: move any pre-existing shared collections (from
  // before per-user directories existed) into each owner's own directory.
  private async migrateToPerUserCollections() {
    if (this.migrated) return;
    const db = mongoose.connection.db!;
    const oldForms = db.collection("forms");
    const oldResponses = db.collection("responses");
    const oldPrivateUsers = db.collection("private_users");
    const oldUserDatabases = db.collection("user_databases");

    const [formsCount, responsesCount, privateUsersCount, userDatabasesCount] = await Promise.all([
      oldForms.countDocuments({}),
      oldResponses.countDocuments({}),
      oldPrivateUsers.countDocuments({}),
      oldUserDatabases.countDocuments({}),
    ]);

    if (formsCount + responsesCount + privateUsersCount + userDatabasesCount === 0) {
      this.migrated = true;
      return;
    }

    console.log(
      `Migrating legacy shared collections into per-user directories: ${formsCount} forms, ${responsesCount} responses, ${privateUsersCount} private users, ${userDatabasesCount} databases`,
    );

    const forms = await oldForms.find({}).toArray();
    for (const f of forms) {
      if (!f.userId) continue;
      const { _id, ...rest } = f as any;
      await this.userCollection(f.userId).updateOne(
        { id: f.id },
        { $setOnInsert: { ...rest, kind: "form" } },
        { upsert: true },
      );
      await this.indexPut(f.id, "form", f.userId);
    }

    const formOwner = new Map(forms.filter((f: any) => f.userId).map((f: any) => [f.id, f.userId]));

    const responses = await oldResponses.find({}).toArray();
    for (const r of responses as any[]) {
      const ownerId = formOwner.get(r.formId);
      if (!ownerId) continue;
      const { _id, ...rest } = r;
      await this.userCollection(ownerId).updateOne(
        { id: r.id },
        { $setOnInsert: { ...rest, kind: "response" } },
        { upsert: true },
      );
      await this.indexPut(r.id, "response", ownerId);
    }

    const privateUsers = await oldPrivateUsers.find({}).toArray();
    for (const p of privateUsers as any[]) {
      if (!p.userId) continue;
      const { _id, ...rest } = p;
      await this.userCollection(p.userId).updateOne(
        { id: p.id },
        { $setOnInsert: { ...rest, kind: "privateUser" } },
        { upsert: true },
      );
      await this.indexPut(p.id, "privateUser", p.userId, { name: p.name });
    }

    const userDatabases = await oldUserDatabases.find({}).toArray();
    for (const d of userDatabases as any[]) {
      if (!d.userId) continue;
      const { _id, ...rest } = d;
      await this.userCollection(d.userId).updateOne(
        { id: d.id },
        { $setOnInsert: { ...rest, kind: "userDatabase" } },
        { upsert: true },
      );
      await this.indexPut(d.id, "userDatabase", d.userId);
    }

    // Archive (don't delete) the old shared collections as a safety net.
    for (const name of ["forms", "responses", "private_users", "user_databases"]) {
      try {
        await db.renameCollection(name, `legacy_${name}`, { dropTarget: true });
      } catch (err) {
        console.error(`Failed to archive legacy collection ${name}:`, err);
      }
    }

    this.migrated = true;
    console.log("Migration to per-user data directories complete.");
  }

  // ---- User methods (account registry; not restructured) -----------

  async getUser(id: string): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOne({ id }).lean();
    return this.strip<User>(doc);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOne({ $or: [{ username }, { email: username }] }).lean();
    return this.strip<User>(doc);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOne({ $or: [{ email }, { username: email }] }).lean();
    return this.strip<User>(doc);
  }

  async updateUser(id: string, updates: any): Promise<User | undefined> {
    await this.connect();
    const doc = await UserModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true },
    ).lean();
    return this.strip<User>(doc);
  }

  async updateUserMetrics(id: string): Promise<User | undefined> {
    await this.connect();
    const col = this.userCollection(id);
    const [totalForms, totalResponses] = await Promise.all([
      col.countDocuments({ kind: "form" }),
      col.countDocuments({ kind: "response" }),
    ]);

    const doc = await UserModel.findOneAndUpdate(
      { id },
      { totalForms, totalResponses, updatedAt: new Date() },
      { new: true },
    ).lean();
    return this.strip<User>(doc);
  }

  async getAllUsers(): Promise<User[]> {
    await this.connect();
    const docs = await UserModel.find({}).lean();
    return docs.map((doc: any) => this.strip<User>(doc)!);
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.connect();
    // Remove the user's entire data directory and its index pointers.
    await this.userCollection(id).deleteMany({});
    await this.indexCollection().deleteMany({ userId: id });
    await UserModel.deleteOne({ id });
    return true;
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.connect();
    const id = generateId();
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
    return this.strip<User>(doc.toObject())!;
  }

  // ---- Form methods ---------------------------------------------------

  async getForm(id: string): Promise<Form | undefined> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const doc = await this.userCollection(userId).findOne({ id, kind: "form" });
    return this.strip<Form>(doc);
  }

  async getFormsByUserId(userId: string): Promise<Form[]> {
    await this.connect();
    const docs = await this.userCollection(userId)
      .find({ kind: "form" })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map((doc) => this.strip<Form>(doc)!);
  }

  async createForm(form: InsertForm): Promise<Form> {
    await this.connect();
    const id = generateId();
    const userId = (form as any).userId;
    const now = new Date();
    const doc = { id, kind: "form", ...form, createdAt: now, updatedAt: now };
    await this.userCollection(userId).insertOne(doc as any);
    await this.indexPut(id, "form", userId);
    return this.strip<Form>(doc)!;
  }

  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const col = this.userCollection(userId);

    const oldForm = await col.findOne({ id, kind: "form" });
    if (!oldForm) return undefined;

    // If fields are being updated, backfill defaults into existing responses.
    if (updates.fields && Array.isArray(updates.fields)) {
      const oldFields = oldForm.fields || [];
      const newFields = updates.fields;
      const responseDocs = await col.find({ kind: "response", formId: id }).toArray();

      for (const response of responseDocs) {
        const updatedData = { ...response.data };
        newFields.forEach((newField: any) => {
          const oldField = oldFields.find((f: any) => f.id === newField.id);
          if (!oldField && updatedData[newField.id] === undefined) {
            updatedData[newField.id] = newField.type === "checkbox" ? false : "";
          }
        });
        await col.updateOne({ id: response.id, kind: "response" }, { $set: { data: updatedData } });
      }
    }

    const result = await col.findOneAndUpdate(
      { id, kind: "form" },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return this.strip<Form>(result);
  }

  async deleteForm(id: string): Promise<boolean> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return false;
    const result = await this.userCollection(userId).deleteOne({ id, kind: "form" });
    if (result.deletedCount > 0) await this.indexRemove(id);
    return result.deletedCount > 0;
  }

  // ---- Response methods -----------------------------------------------

  async createResponse(response: InsertResponse): Promise<Response> {
    await this.connect();
    const formId = (response as any).formId;
    const userId = await this.resolveOwner(formId);
    if (!userId) {
      throw new Error("Cannot create response: owning form was not found");
    }
    const id = generateId();
    const doc = { id, kind: "response", ...response, submittedAt: new Date(), updatedAt: new Date() };
    await this.userCollection(userId).insertOne(doc as any);
    await this.indexPut(id, "response", userId);
    return this.strip<Response>(doc)!;
  }

  async getResponse(id: string): Promise<Response | undefined> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const doc = await this.userCollection(userId).findOne({ id, kind: "response" });
    return this.strip<Response>(doc);
  }

  async updateResponse(id: string, data: any): Promise<Response | undefined> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const result = await this.userCollection(userId).findOneAndUpdate(
      { id, kind: "response" },
      { $set: { data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return this.strip<Response>(result);
  }

  async deleteResponse(id: string): Promise<boolean> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return false;
    const result = await this.userCollection(userId).deleteOne({ id, kind: "response" });
    if (result.deletedCount > 0) await this.indexRemove(id);
    return result.deletedCount > 0;
  }

  async getResponsesByFormId(formId: string): Promise<Response[]> {
    await this.connect();
    const userId = await this.resolveOwner(formId);
    if (!userId) return [];
    const docs = await this.userCollection(userId)
      .find({ kind: "response", formId })
      .sort({ submittedAt: -1 })
      .toArray();
    return docs.map((doc) => this.strip<Response>(doc)!);
  }

  async getResponseCount(formId: string): Promise<number> {
    await this.connect();
    const userId = await this.resolveOwner(formId);
    if (!userId) return 0;
    return await this.userCollection(userId).countDocuments({ kind: "response", formId });
  }

  async getResponseCountByFormIds(formIds: string[]): Promise<number> {
    await this.connect();
    if (formIds.length === 0) return 0;
    const userId = await this.resolveOwner(formIds[0]);
    if (!userId) return 0;
    return await this.userCollection(userId).countDocuments({ kind: "response", formId: { $in: formIds } });
  }

  // ---- Private User methods --------------------------------------------

  async createPrivateUser(userId: string, name: string, email: string, password: string): Promise<any> {
    await this.connect();
    const id = generateId();
    const now = new Date();
    const doc = {
      id,
      kind: "privateUser",
      userId,
      name,
      email,
      password,
      accessibleForms: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.userCollection(userId).insertOne(doc as any);
    await this.indexPut(id, "privateUser", userId, { name });
    return this.strip(doc);
  }

  async getPrivateUsersByUserId(userId: string): Promise<any[]> {
    await this.connect();
    const docs = await this.userCollection(userId).find({ kind: "privateUser" }).toArray();
    return docs.map((doc) => this.strip(doc));
  }

  async getPrivateUser(id: string): Promise<any> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const doc = await this.userCollection(userId).findOne({ id, kind: "privateUser" });
    return this.strip(doc);
  }

  async getPrivateUserByName(name: string): Promise<any> {
    await this.connect();
    const entry = await this.indexCollection().findOne({ kind: "privateUser", name });
    if (!entry) return undefined;
    const doc = await this.userCollection(entry.userId as string).findOne({ id: entry.id, kind: "privateUser" });
    return this.strip(doc);
  }

  async updatePrivateUser(id: string, updates: any): Promise<any> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const result = await this.userCollection(userId).findOneAndUpdate(
      { id, kind: "privateUser" },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (updates?.name) {
      await this.indexCollection().updateOne({ id }, { $set: { name: updates.name } });
    }
    return this.strip(result);
  }

  async deletePrivateUser(id: string): Promise<boolean> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return false;
    const result = await this.userCollection(userId).deleteOne({ id, kind: "privateUser" });
    if (result.deletedCount > 0) await this.indexRemove(id);
    return result.deletedCount > 0;
  }

  async updatePrivateUserAccess(privateUserId: string, formIds: string[]): Promise<any> {
    await this.connect();
    const userId = await this.resolveOwner(privateUserId);
    if (!userId) return undefined;
    const result = await this.userCollection(userId).findOneAndUpdate(
      { id: privateUserId, kind: "privateUser" },
      { $set: { accessibleForms: formIds, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return this.strip(result);
  }

  // ---- User Database methods -------------------------------------------

  async getUserDatabase(id: string): Promise<UserDatabase | undefined> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const doc = await this.userCollection(userId).findOne({ id, kind: "userDatabase" });
    return this.strip<UserDatabase>(doc);
  }

  async getUserDatabasesByUserId(userId: string): Promise<UserDatabase[]> {
    await this.connect();
    const docs = await this.userCollection(userId)
      .find({ kind: "userDatabase" })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map((doc) => this.strip<UserDatabase>(doc)!);
  }

  async createUserDatabase(dbData: InsertUserDatabase): Promise<UserDatabase> {
    await this.connect();
    const id = generateId();
    const userId = (dbData as any).userId;
    const now = new Date();
    const doc = { id, kind: "userDatabase", ...dbData, createdAt: now, updatedAt: now };
    await this.userCollection(userId).insertOne(doc as any);
    await this.indexPut(id, "userDatabase", userId);
    return this.strip<UserDatabase>(doc)!;
  }

  async updateUserDatabase(id: string, updates: Partial<InsertUserDatabase>): Promise<UserDatabase | undefined> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return undefined;
    const result = await this.userCollection(userId).findOneAndUpdate(
      { id, kind: "userDatabase" },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return this.strip<UserDatabase>(result);
  }

  async deleteUserDatabase(id: string): Promise<boolean> {
    await this.connect();
    const userId = await this.resolveOwner(id);
    if (!userId) return false;
    const result = await this.userCollection(userId).deleteOne({ id, kind: "userDatabase" });
    if (result.deletedCount > 0) await this.indexRemove(id);
    return result.deletedCount > 0;
  }
}

export const mongoStorage = new MongoDBStorage();
