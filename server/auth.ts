import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "aims-default-secret-change-in-production";

function generateJwt(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      name: string;
      role: "doctor" | "admin" | "assistant" | "patient" | "administrator";
      email: string;
      phone: string | null;
      specialty: string | null;
      licenseNumber: string | null;
      avatar: string | null;
      bio: string | null;
      isActive: boolean | null;
      createdAt: Date | null;
      lastLogin: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    if (!stored || !stored.includes('.')) {
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    return false;
  }
}

export function setupAuth(app: Express) {
  const SESSION_SECRET = process.env.SESSION_SECRET || "medical-platform-secret-key";
  
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let user = await storage.getUserByUsername(username);
        if (!user) {
          const users = await storage.getUsers();
          user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        }
        
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        
        if (!passwordMatch) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        if (user.isActive === false) {
          return done(null, false, { 
            message: 'Your account has been deactivated. Please contact admin.' 
          });
        }
        
        await storage.updateUser(user.id, { lastLogin: new Date() });
        return done(null, user as Express.User);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, user as Express.User);
      } else {
        done(new Error("User not found"));
      }
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email, name, role = 'doctor' } = req.body;
      
      if (!username || !password || !email || !name) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        email,
        name,
        role,
        isActive: false
      });

      req.login(user as Express.User, (err) => {
        if (err) return res.status(500).json({ message: "Login error after registration" });
        
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      req.login(user, (err: Error | null) => {
        if (err) {
          return next(err);
        }
        const { password, ...userWithoutPassword } = user;
        const token = generateJwt(user as unknown as User);
        return res.status(200).json({ ...userWithoutPassword, token });
      });
    })(req, res, next);
  });

  // JWT-based /api/user endpoint - supports both session AND Bearer token
  app.get("/api/user", (req, res) => {
    // First try JWT Bearer token (used by frontend)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        // Get fresh user data from DB
        storage.getUser(decoded.id).then(user => {
          if (!user) return res.status(401).json({ message: "User not found" });
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        }).catch(() => res.status(500).json({ message: "Failed to fetch user" }));
        return;
      } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }
    // Fallback: session-based auth
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });

  // Demo login - allows quick access with specific roles for testing
  app.post("/api/login/demo", async (req, res) => {
    try {
      const { role } = req.body;
      const validRoles = ['administrator', 'admin', 'doctor', 'assistant', 'patient'];
      
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be one of: " + validRoles.join(', ') });
      }

      const users = await storage.getUsers();
      let targetUser = users.find((user) => user.role === role && user.isActive !== false);
      
      if (!targetUser) {
        // Fallback: find any active user if specific role not found
        targetUser = users.find((user) => user.isActive !== false);
      }

      if (!targetUser) {
        return res.status(404).json({ message: `No active ${role} user found` });
      }

      await storage.updateUser(targetUser.id, { lastLogin: new Date() });

      req.login(targetUser as Express.User, (err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: "Failed to establish demo session" });
        }

        const { password, ...userWithoutPassword } = targetUser as User;
        const token = generateJwt(targetUser as User);
        return res.status(200).json({
          ...userWithoutPassword,
          token,
          demo: true,
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Unable to complete demo login" });
    }
  });

  // Legacy bypass endpoint - now uses demo endpoint logic
  app.post("/api/login/bypass", async (req, res) => {
    try {
      const { username, role } = req.body ?? {};
      let targetUser: User | undefined;

      if (typeof username === "string" && username.trim().length > 0) {
        targetUser = await storage.getUserByUsername(username.trim());
      }

      if (!targetUser && typeof role === "string") {
        const users = await storage.getUsers();
        targetUser = users.find((user) => user.role === role && user.isActive !== false);
      }

      if (!targetUser) {
        const users = await storage.getUsers();
        targetUser =
          users.find((user) => user.role === "doctor" && user.isActive !== false) ??
          users.find((user) => ["administrator", "admin"].includes(user.role) && user.isActive !== false) ??
          users.find((user) => user.isActive !== false) ??
          users[0];
      }

      if (!targetUser) {
        return res.status(404).json({ message: "No eligible users available" });
      }

      await storage.updateUser(targetUser.id, { lastLogin: new Date() });

      req.login(targetUser as Express.User, (err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: "Failed to establish session" });
        }

        const { password, ...userWithoutPassword } = targetUser as User;
        const token = generateJwt(targetUser as User);
        return res.status(200).json({
          ...userWithoutPassword,
          token,
          bypass: true,
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Unable to complete bypass login" });
    }
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // JWT-aware auth middleware for protected routes
  const jwtOrSessionAuth = async (req: Request, res: Response, next: NextFunction) => {
    // Check JWT Bearer token first (used by frontend)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await storage.getUser(decoded.id);
        if (user) {
          (req as any).user = user;
          return next();
        }
      } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }
    // Fallback: session-based auth
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Authentication required" });
  };

  app.use([
    "/api/patients",
    "/api/appointments",
    "/api/medical-notes",
    "/api/quick-notes",
    "/api/consultation-notes",
    "/api/telemedicine",
    "/api/invoices"
  ], jwtOrSessionAuth);

  return jwtOrSessionAuth;
}

export { jwtOrSessionAuth };
