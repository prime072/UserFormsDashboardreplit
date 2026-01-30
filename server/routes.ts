import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFormSchema, insertResponseSchema } from "@shared/schema";
import { z } from "zod";
import { registerAuthRoutes } from "./auth-routes";

function isAuthenticated(req: any, res: any, next: any) {
  // Accept requests with x-user-id header
  const userId = req.headers["x-user-id"];
  if (userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function getUserId(req: any): string {
  return req.headers["x-user-id"] || "";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register authentication routes
  registerAuthRoutes(app);
  
  // Form routes
  // Get live total responses from MongoDB
  app.get("/api/user/total-responses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userForms = await storage.getFormsByUserId(userId);
      const formIds = userForms.map(f => f.id);
      const totalResponses = formIds.length > 0 ? await (storage as any).getResponseCountByFormIds?.(formIds) || 0 : 0;
      res.json({ totalResponses });
    } catch (error) {
      console.error("Error fetching total responses:", error);
      res.status(500).json({ message: "Failed to fetch total responses" });
    }
  });

  app.get("/api/forms", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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

  app.get("/api/forms/:id/data", async (req, res) => {
    try {
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      const responses = await storage.getResponsesByFormId(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching form data:", error);
      res.status(500).json({ message: "Failed to fetch form data" });
    }
  });

  app.post("/api/forms", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { visibility, confirmationStyle, confirmationText, gridConfig, whatsappFormat, allowEditing, ...bodyRest } = req.body;
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
        whatsappFormat,
        allowEditing: allowEditing ?? true,
      } as any;
      const form = await storage.createForm(formDataWithExtras);
      // Update user metrics
      await (storage as any).updateUserMetrics?.(userId);
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
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { visibility, confirmationStyle, confirmationText, gridConfig, whatsappFormat, allowEditing, ...bodyRest } = req.body;
      const validatedData = insertFormSchema.partial().parse(bodyRest);
      const updateDataWithExtras = {
        ...validatedData,
        ...(visibility !== undefined && { visibility }),
        ...(confirmationStyle !== undefined && { confirmationStyle }),
        ...(confirmationText !== undefined && { confirmationText }),
        ...(gridConfig !== undefined && { gridConfig }),
        ...(whatsappFormat !== undefined && { whatsappFormat }),
        ...(allowEditing !== undefined && { allowEditing }),
      } as any;
      const updatedForm = await storage.updateForm(req.params.id, updateDataWithExtras);
      res.json(updatedForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.delete("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteForm(req.params.id);
      // Update user metrics
      await (storage as any).updateUserMetrics?.(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  // Response routes
  app.post("/api/responses", async (req, res) => {
    try {
      const validatedData = insertResponseSchema.parse(req.body);
      
      const form = await storage.getForm(validatedData.formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      const response = await storage.createResponse(validatedData);
      // Update user metrics
      await (storage as any).updateUserMetrics?.(form.userId);
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      console.error("Error creating response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  // Get all responses for all user's forms
  app.get("/api/user/responses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userForms = await storage.getFormsByUserId(userId);
      const formIds = userForms.map(f => f.id);

      const allResponses: any[] = [];
      for (const formId of formIds) {
        const responses = await storage.getResponsesByFormId(formId);
        allResponses.push(...responses);
      }

      res.json(allResponses);
    } catch (error) {
      console.error("Error fetching all responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses/:id", async (req, res) => {
    try {
      const response = await (storage as any).getResponse?.(req.params.id);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      res.json(response);
    } catch (error) {
      console.error("Error fetching response:", error);
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.get("/api/forms/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const responses = await storage.getResponsesByFormId(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/forms/:id/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const responseCount = await storage.getResponseCount(req.params.id);
      res.json({ responseCount });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminSession = req.headers["x-admin-session"];
      if (!adminSession) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const allUsers = await (storage as any).getAllUsers?.();
      if (!allUsers) {
        return res.json([]);
      }

      // Fetch forms and responses for each user
      const usersWithData = await Promise.all(
        allUsers.map(async (user: any) => {
          const userForms = await storage.getFormsByUserId(user.id);
          return {
            ...user,
            formsCount: userForms.length,
          };
        })
      );

      res.json(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const adminSession = req.headers["x-admin-session"];
      if (!adminSession) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const allUsers = await (storage as any).getAllUsers?.();
      const userCount = allUsers?.length || 0;

      res.json({
        totalUsers: userCount,
        totalForms: 0,
        totalResponses: 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
