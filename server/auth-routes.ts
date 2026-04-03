import { type Express } from "express";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export function registerAuthRoutes(app: Express) {
  // Sign up / Register
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName } = signupSchema.parse(req.body);

      // Check if user already exists by email
      const existingUser = await (storage as any).getUserByEmail?.(email);
      if (existingUser) {
        return res.status(409).json({ 
          error: "This email is already registered. Please log in." 
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user with MongoDB storage
      const newUser = await storage.createUser({
        email,
        username: email,
        firstName,
        lastName: "",
        phone: "",
        company: "",
        photo: "",
        password: hashedPassword,
      } as any);

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: (newUser as any).firstName || "",
        lastName: (newUser as any).lastName || "",
        phone: (newUser as any).phone || "",
        company: (newUser as any).company || "",
        photo: (newUser as any).photo || "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "Validation error" });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Signup failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email only
      const user = await (storage as any).getUserByEmail?.(email);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, (user as any).password || "");
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update and fetch metrics
      const userWithMetrics = await (storage as any).updateUserMetrics?.(user.id);
      const responseUser = userWithMetrics || user;

      res.json({
        id: responseUser.id,
        email: responseUser.email,
        firstName: responseUser.firstName,
        lastName: responseUser.lastName,
        phone: responseUser.phone,
        company: responseUser.company,
        photo: responseUser.photo,
        status: responseUser.status,
        totalForms: responseUser.totalForms || 0,
        totalResponses: responseUser.totalResponses || 0,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "Validation error" });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Update user profile
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updates = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        company: req.body.company,
        photo: req.body.photo,
      };

      const user = await (storage as any).updateUser?.(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Delete user account
  app.delete("/api/auth/account", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await (storage as any).deleteUser?.(userId);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
}
