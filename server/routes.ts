import express, { type Request, type Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertFormSchema, insertResponseSchema } from "@shared/schema";
import { z } from "zod";

function getUserId(req: Request): string {
  return req.headers["x-user-id"] as string || "anonymous";
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const userId = getUserId(req);
  if (!userId || userId === "anonymous") {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: express.Express): Promise<void> {
  app.get("/api/forms", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const forms = await storage.getFormsByUserId(userId);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.get("/api/forms/:id", async (req, res) => {
    try {
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post("/api/forms", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { visibility, confirmationStyle, confirmationText, gridConfig, gridConfigs, whatsappFormat, allowEditing, canPrivateUserViewResponses, ...bodyRest } = req.body;
      const validatedData = insertFormSchema.parse({
        ...bodyRest,
        userId,
      });
      const formDataWithExtras = {
        ...validatedData,
        visibility: visibility || "public",
        confirmationStyle: confirmationStyle || "table",
        confirmationText,
        gridConfig,
        gridConfigs,
        whatsappFormat,
        allowEditing,
        canPrivateUserViewResponses,
      };
      const form = await storage.createForm(formDataWithExtras as any);
      res.status(201).json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  app.get("/api/forms-database", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const forms = await storage.getFormsByUserId(userId);
      const formsWithCount = await Promise.all(
        forms.map(async (form: any) => {
          const count = await storage.getResponseCount(form.id);
          return { ...form, responses: count };
        })
      );
      res.json(formsWithCount);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forms database" });
    }
  });

  app.get("/api/user-databases", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const dbs = await storage.getUserDatabasesByUserId(userId);
      res.json(dbs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch databases" });
    }
  });

  app.post("/api/user-databases", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const db = await storage.createUserDatabase({ ...req.body, userId });
      res.status(201).json(db);
    } catch (error) {
      res.status(500).json({ message: "Failed to create database" });
    }
  });
}
