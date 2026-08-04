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

function isAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
  const adminSession = req.headers["x-admin-session"] as string;
  if (!adminSession) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: express.Express): Promise<void> {

  app.get("/api/admin/users", isAdminAuthenticated, async (req, res) => {
    try {
      const users = await (storage as any).getAllUsers?.();
      res.json(users || []);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const updates = {
        status: req.body.status,
        totalForms: req.body.totalForms,
        totalResponses: req.body.totalResponses,
      };
      const user = await (storage as any).updateUser?.(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating admin user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const deleted = await (storage as any).deleteUser?.(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting admin user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Form Routes
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
        allowEditing: allowEditing ?? true,
        canPrivateUserViewResponses: canPrivateUserViewResponses || "false",
      } as any;
      const form = await storage.createForm(formDataWithExtras);
      res.status(201).json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  app.patch("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const form = await storage.getForm(req.params.id);
      if (!form || form.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { visibility, confirmationStyle, confirmationText, gridConfig, gridConfigs, whatsappFormat, allowEditing, canPrivateUserViewResponses, ...bodyRest } = req.body;
      const validatedData = insertFormSchema.partial().parse(bodyRest);
      const updateDataWithExtras = {
        ...validatedData,
        ...(visibility !== undefined && { visibility }),
        ...(confirmationStyle !== undefined && { confirmationStyle }),
        ...(confirmationText !== undefined && { confirmationText }),
        ...(gridConfig !== undefined && { gridConfig }),
        ...(gridConfigs !== undefined && { gridConfigs }),
        ...(whatsappFormat !== undefined && { whatsappFormat }),
        ...(allowEditing !== undefined && { allowEditing }),
        ...(canPrivateUserViewResponses !== undefined && { canPrivateUserViewResponses }),
      } as any;
      const updatedForm = await storage.updateForm(req.params.id, updateDataWithExtras);
      res.json(updatedForm);
    } catch (error) {
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.delete("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const form = await storage.getForm(req.params.id);
      if (!form || form.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteForm(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  app.get("/api/forms/:id/responses", async (req, res) => {
    try {
      const formId = req.params.id;
      const userId = req.headers["x-user-id"] as string;
      const privateUserId = req.headers["x-private-user-id"] as string;

      const form = await storage.getForm(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });

      let allowed = false;
      if (userId && form.userId === userId) allowed = true;
      else if (privateUserId) {
        const privateUser = await (storage as any).getPrivateUser?.(privateUserId);
        if (privateUser && privateUser.accessibleForms.includes(formId) && form.canPrivateUserViewResponses === "true") {
          allowed = true;
        }
      }

      if (!allowed) return res.status(403).json({ message: "Forbidden" });
      
      const responses = await storage.getResponsesByFormId(formId);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses/:id", async (req, res) => {
    try {
      const response = await storage.getResponse(req.params.id);
      if (!response) return res.status(404).json({ message: "Response not found" });
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.patch("/api/responses/:id", async (req, res) => {
    try {
      const response = await storage.updateResponse(req.params.id, req.body.data);
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to update response" });
    }
  });

  app.delete("/api/responses/:id", async (req, res) => {
    try {
      await storage.deleteResponse(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete response" });
    }
  });

  app.get("/api/forms/:id/data", async (req, res) => {
    try {
      const responses = await storage.getResponsesByFormId(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form data" });
    }
  });

  app.post("/api/responses", async (req, res) => {
    try {
      const validatedData = insertResponseSchema.parse(req.body);
      const response = await storage.createResponse(validatedData);
      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  app.get("/api/user/responses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const forms = await storage.getFormsByUserId(userId);
      const allResponses = [];
      for (const form of forms) {
        const responses = await storage.getResponsesByFormId(form.id);
        allResponses.push(...responses);
      }
      res.json(allResponses);
    } catch (error) {
      console.error("Error fetching user responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/user/total-responses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const forms = await storage.getFormsByUserId(userId);
      let totalCount = 0;
      for (const form of forms) {
        const count = await storage.getResponseCount(form.id);
        totalCount += count;
      }
      res.json({ totalResponses: totalCount });
    } catch (error) {
      console.error("Error fetching total responses:", error);
      res.status(500).json({ message: "Failed to fetch total responses" });
    }
  });

  app.get("/api/forms/:id/stats", async (req, res) => {
    try {
      const formId = req.params.id;
      const form = await storage.getForm(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });
      
      const responseCount = await storage.getResponseCount(formId);
      res.json({
        formId,
        responseCount,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching form stats:", error);
      res.status(500).json({ message: "Failed to fetch form stats" });
    }
  });

  // User Database routes (Excel-uploaded databases)
  app.get("/api/user-databases", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const databases = await storage.getUserDatabasesByUserId(userId);
      res.json(databases);
    } catch (error) {
      console.error("Error fetching user databases:", error);
      res.status(500).json({ message: "Failed to fetch user databases" });
    }
  });

  app.get("/api/user-databases/:id", async (req, res) => {
    try {
      const database = await storage.getUserDatabase(req.params.id);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      res.json(database);
    } catch (error) {
      console.error("Error fetching user database:", error);
      res.status(500).json({ message: "Failed to fetch user database" });
    }
  });

  app.post("/api/user-databases", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { name, description, config, data } = req.body;
      if (!name || !config || !data) {
        return res.status(400).json({ message: "Missing required fields: name, config, data" });
      }

      // Uploading a database creates a real form (a "form database") whose
      // fields mirror the uploaded columns, with each row saved as a response.
      const headers: string[] = Array.isArray(config?.columns)
        ? config.columns
        : Object.keys(config?.columns || {});

      const form = await storage.createForm({
        userId,
        title: name,
        status: "Active",
        visibility: "public",
        canPrivateUserViewResponses: "false",
        fields: headers.map((header: string, index: number) => ({
          id: `excel_${index}_${header.replace(/[^a-zA-Z0-9]/g, "_")}`,
          type: "text",
          label: header,
          required: false,
          options: [],
        })),
        outputFormats: ["thank_you"],
        confirmationStyle: "table",
        confirmationText: "",
        tableConfig: [],
        gridConfig: null,
        gridConfigs: [],
        whatsappFormat: "",
        allowEditing: true,
      } as any);

      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        await storage.createResponse({
          formId: form.id,
          data: row,
        } as any);
      }

      res.status(201).json({
        id: form.id,
        userId,
        name,
        description,
        config,
        data: { formId: form.id, rows: rows.length },
      });
    } catch (error) {
      console.error("Error creating database from upload:", error);
      res.status(500).json({ message: "Failed to create database" });
    }
  });

  app.patch("/api/user-databases/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getUserDatabase(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { name, description, config, data } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (config !== undefined) updates.config = config;
      if (data !== undefined) updates.data = data;
      const database = await storage.updateUserDatabase(req.params.id, updates);
      res.json(database);
    } catch (error) {
      console.error("Error updating user database:", error);
      res.status(500).json({ message: "Failed to update user database" });
    }
  });

  app.delete("/api/user-databases/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getUserDatabase(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteUserDatabase(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user database:", error);
      res.status(500).json({ message: "Failed to delete user database" });
    }
  });

  app.get("/api/forms-database", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const forms = await storage.getFormsByUserId(userId);
      const formsWithCount = await Promise.all(
        forms.map(async (form) => {
          const count = await storage.getResponseCount(form.id);
          return { ...form, responses: count };
        })
      );
      res.json(formsWithCount);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forms database" });
    }
  });

  app.get("/api/responses/:id", async (req, res) => {
    try {
      const response = await storage.getResponse(req.params.id);
      if (!response) return res.status(404).json({ message: "Response not found" });
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.patch("/api/responses/:id", async (req, res) => {
    try {
      const response = await storage.updateResponse(req.params.id, req.body.data);
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to update response" });
    }
  });

  app.delete("/api/responses/:id", async (req, res) => {
    try {
      await storage.deleteResponse(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete response" });
    }
  });
}
