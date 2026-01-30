import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("Active"),
  visibility: text("visibility").notNull().default("public"),
  fields: jsonb("fields").notNull(),
  outputFormats: jsonb("output_formats").notNull().default(sql`'["thank_you"]'::jsonb`),
  confirmationStyle: text("confirmation_style").notNull().default("table"),
  confirmationText: text("confirmation_text"),
  tableConfig: jsonb("table_config"),
  gridConfig: jsonb("grid_config"),
  whatsappFormat: text("whatsapp_format"),
  allowEditing: text("allow_editing").default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull(),
  data: jsonb("data").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  submittedAt: true,
});

export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;
