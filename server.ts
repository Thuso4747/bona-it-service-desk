import express from "express";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import pg from "pg";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Database configuration with fallback to the user's provided credentials
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Yzwl1HsCV3Ux@ep-broad-wave-asgfcopw.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Mailtrap SMTP configuration with fallback
const MAILTRAP_HOST = process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io";
const MAILTRAP_PORT = Number(process.env.MAILTRAP_PORT) || 2525;
const MAILTRAP_USER = process.env.MAILTRAP_USER || "5b1160ea8a504e";
const MAILTRAP_PASS = process.env.MAILTRAP_PASS || "7e4aea7d6a522b";

// Initialize PostgreSQL Pool
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("sslmode=require") || DATABASE_URL.includes("neon.tech") 
    ? { rejectUnauthorized: false } 
    : false,
});

// Helper function to send email via Mailtrap
async function sendEmail(to: string, subject: string, text: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: MAILTRAP_HOST,
      port: MAILTRAP_PORT,
      auth: {
        user: MAILTRAP_USER,
        pass: MAILTRAP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: "Bona IT Support <support@bonait.local>",
      to,
      subject,
      text,
    });
    console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Email sending failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Database schema initialization
async function initDb() {
  try {
    console.log("Initializing PostgreSQL database tables...");
    
    // Create User table if not exists (Prisma naming standard)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        "userRef" TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'CLIENT',
        password TEXT NOT NULL DEFAULT ''
      );
    `);

    // Create Ticket table if not exists (Prisma naming standard)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Ticket" (
        id SERIAL PRIMARY KEY,
        "ticketRef" TEXT UNIQUE NOT NULL,
        "trackingToken" TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        "reportType" TEXT NOT NULL DEFAULT 'OTHER',
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CREATED',
        "creationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT NOW(),
        "submittedBy" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "assignedTo" INTEGER,
        "resolvedBy" INTEGER
      );
    `);

    console.log("Database tables verified successfully.");

    // Seed admin if not exists
    const adminCheck = await pool.query('SELECT * FROM "User" WHERE email = $1', ['admin@portal.com']);
    if (adminCheck.rows.length === 0) {
      const userHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      await pool.query(`
        INSERT INTO "User" ("userRef", name, email, role, password)
        VALUES ($1, $2, $3, $4, $5)
      `, [`USR-${userHex}`, "Admin Agent", "admin@portal.com", "AGENT", "admin123"]);
      console.log("Seeded default admin agent.");
    }
  } catch (err: any) {
    console.error("Database initialization failed:", err.message);
  }
}

// Initialize tables immediately
initDb();

// ==========================================
// API ROUTES
// ==========================================

// Auth.1 POST /api/auth/login - Universal and client login verification
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const result = await pool.query('SELECT * FROM "User" WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Direct password match (clear-text in development for ease of use)
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    res.json({
      success: true,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: error.message || "Authentication failed" });
  }
});

// Auth.2 POST /api/auth/signup - Register user with password
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const checkUser = await pool.query('SELECT * FROM "User" WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const userHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const userRef = `USR-${userHex}`;
    const fullName = `${firstName} ${lastName}`.trim();

    const newUser = await pool.query(`
      INSERT INTO "User" ("userRef", name, email, role, password)
      VALUES ($1, $2, $3, 'CLIENT', $4)
      RETURNING *
    `, [userRef, fullName, trimmedEmail, password]);

    const user = newUser.rows[0];
    res.json({
      success: true,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
});

// 1. GET /api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", databaseConnected: true });
});

// 2. GET /api/tickets - Fetch all tickets with join on User
app.get("/api/tickets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t."ticketRef",
        t."trackingToken",
        t.title,
        t."reportType",
        t.description,
        t.status,
        t."creationDate",
        t."updatedDate",
        t."assignedTo",
        t."resolvedBy",
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        u."userRef" as "userRef"
      FROM "Ticket" t
      JOIN "User" u ON t."submittedBy" = u.id
      ORDER BY t.id DESC
    `);
    
    // Map response back to frontend interface
    const tickets = result.rows.map(row => ({
      id: row.id,
      ticketRef: row.ticketRef,
      trackingToken: row.trackingToken,
      title: row.title,
      reportType: row.reportType,
      description: row.description,
      status: row.status,
      creationDate: row.creationDate,
      updatedDate: row.updatedDate,
      assignedTo: row.assignedTo,
      resolvedBy: row.resolvedBy,
      submittedBy: {
        id: row.userId,
        name: row.userName,
        email: row.userEmail,
        userRef: row.userRef
      }
    }));

    res.json({ success: true, tickets });
  } catch (error: any) {
    console.error("Fetch tickets error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET /api/users - Fetch all registered users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "User" ORDER BY id DESC');
    res.json({ success: true, users: result.rows });
  } catch (error: any) {
    console.error("Fetch users error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to dynamically extract ticket subject and reportType from mail description when appropriate
function extractSubjectAndReportType(title: string | undefined, reportType: string | undefined, description: string) {
  let finalTitle = (title || "").trim();
  let finalReportType = (reportType || "").trim();

  // If the description starts with [Subject: ...] and we don't have a valid custom subject (or it is generic "OTHER")
  if (description && description.startsWith("[Subject:")) {
    const closeBracketIdx = description.indexOf("]");
    if (closeBracketIdx !== -1) {
      const extracted = description.substring(9, closeBracketIdx).trim();
      if (extracted) {
        if (!finalTitle || finalTitle.toUpperCase() === "OTHER") {
          finalTitle = extracted;
        }
        if (!finalReportType || finalReportType.toUpperCase() === "OTHER") {
          finalReportType = extracted.toUpperCase();
        }
      }
    }
  }

  if (!finalTitle) finalTitle = "Other";
  if (!finalReportType) finalReportType = "OTHER";

  return { title: finalTitle, reportType: finalReportType };
}

// 4. POST /api/tickets - Main customer submission endpoint (matches provided Next.js code)
app.post("/api/tickets", async (req, res) => {
  try {
    const body = req.body;
    const name = body.name?.trim();
    const email = body.email?.trim();
    const description = (body.description || body.issue || "").trim();
    
    // Auto-resolve title and reportType from description if they are generic or empty
    let { title, reportType } = extractSubjectAndReportType(
      body.title || body.subject || body.reportType,
      body.reportType,
      description
    );

    if (!name || !email || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email and email content (description or issue) are required" 
      });
    }

    // Acknowledge user find or creation
    let userResult = await pool.query('SELECT * FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);
    let user = userResult.rows[0];

    if (!user) {
      const userHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      const userRef = `USR-${userHex}`;
      const newUserRes = await pool.query(`
        INSERT INTO "User" ("userRef", name, email, role, password)
        VALUES ($1, $2, $3, 'CLIENT', '')
        RETURNING *
      `, [userRef, name, email]);
      user = newUserRes.rows[0];
    }

    const ticketRef = `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const trackingToken = crypto.randomUUID();

    const countRes = await pool.query('SELECT COUNT(*) FROM "Ticket"');
    let nextId = Number(countRes.rows[0].count) + 1;
    const existingIdsRes = await pool.query('SELECT id FROM "Ticket"');
    const existingIds = new Set(existingIdsRes.rows.map((r: any) => r.id));
    while (existingIds.has(nextId)) {
      nextId++;
    }

    const newTicketRes = await pool.query(`
      INSERT INTO "Ticket" (id, "ticketRef", "trackingToken", title, "reportType", description, status, "submittedBy", "updatedDate")
      VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7, NOW())
      RETURNING *
    `, [nextId, ticketRef, trackingToken, title, reportType, description, user.id]);

    const ticket = newTicketRes.rows[0];

    // Send customer auto-reply email via Mailtrap SMTP
    const emailRes = await sendEmail(
      email,
      `${ticketRef} Ticket Received`,
      `Your ticket has been created.\n\nReference: ${ticketRef}\nTracking Token: ${trackingToken}\nStatus: CREATED`
    );

    res.json({
      success: true,
      token: trackingToken,
      ticketRef,
      status: "CREATED",
      emailSent: emailRes.success,
      emailError: emailRes.error || null
    });
  } catch (error: any) {
    console.error("Ticket creation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create ticket" });
  }
});

// 5. POST /api/webhooks/tickets - Identical support webhook ingestion (matches provided Next.js code)
app.post("/api/webhooks/tickets", async (req, res) => {
  try {
    const body = req.body;
    const name = body.name?.trim();
    const email = body.email?.trim();
    const description = (body.description || body.issue || "").trim();
    
    // Auto-resolve title and reportType from description if they are generic or empty
    let { title, reportType } = extractSubjectAndReportType(
      body.title || body.subject || body.reportType,
      body.reportType,
      description
    );

    if (!name || !email || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email and email content (description or issue) are required" 
      });
    }

    let userResult = await pool.query('SELECT * FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);
    let user = userResult.rows[0];

    if (!user) {
      const userHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      const userRef = `USR-${userHex}`;
      const newUserRes = await pool.query(`
        INSERT INTO "User" ("userRef", name, email, role, password)
        VALUES ($1, $2, $3, 'CLIENT', '')
        RETURNING *
      `, [userRef, name, email]);
      user = newUserRes.rows[0];
    }

    const ticketRef = `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const trackingToken = crypto.randomUUID();

    const countRes = await pool.query('SELECT COUNT(*) FROM "Ticket"');
    let nextId = Number(countRes.rows[0].count) + 1;
    const existingIdsRes = await pool.query('SELECT id FROM "Ticket"');
    const existingIds = new Set(existingIdsRes.rows.map((r: any) => r.id));
    while (existingIds.has(nextId)) {
      nextId++;
    }

    await pool.query(`
      INSERT INTO "Ticket" (id, "ticketRef", "trackingToken", title, "reportType", description, status, "submittedBy", "updatedDate")
      VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7, NOW())
    `, [nextId, ticketRef, trackingToken, title, reportType, description, user.id]);

    // Send customer webhook auto-reply via Mailtrap
    const emailRes = await sendEmail(
      email,
      `${ticketRef} Ticket Received`,
      `Your ticket has been created.\n\nReference: ${ticketRef}\nTracking Token: ${trackingToken}\nStatus: CREATED`
    );

    res.json({
      success: true,
      token: trackingToken,
      ticketRef,
      status: "CREATED",
      emailSent: emailRes.success
    });
  } catch (error: any) {
    console.error("Webhook ingestion error:", error);
    res.status(500).json({ success: false, message: error.message || "Webhook ticket creation failed" });
  }
});

// 6. GET /api/tickets/status/:token and /api/tickets/stats/:token - Get ticket stats by tracking token or ticket reference (matches provided Next.js code)
app.get(["/api/tickets/status/:token", "/api/tickets/stats/:token"], async (req, res) => {
  try {
    const { token } = req.params;
    const cleanToken = (token || "").trim();

    // Normalize input to see if it is a ticket reference:
    // Remove all spaces, e.g. "TKT - ABC" -> "TKT-ABC"
    let normalizedRef = cleanToken.replace(/\s+/g, '').toUpperCase();
    
    // If it doesn't start with "TKT-" but is an 8-char hex, pre-pend "TKT-"
    if (!normalizedRef.startsWith("TKT-") && normalizedRef.length === 8 && /^[0-9A-F]+$/.test(normalizedRef)) {
      normalizedRef = "TKT-" + normalizedRef;
    }

    const result = await pool.query(`
      SELECT t.*, u.name as "submittedUserName", u.email as "submittedUserEmail"
      FROM "Ticket" t
      JOIN "User" u ON t."submittedBy" = u.id
      WHERE t."trackingToken" = $1 OR UPPER(t."ticketRef") = $1 OR UPPER(t."ticketRef") = $2
    `, [cleanToken, normalizedRef]);

    const ticket = result.rows[0];

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found with that token or reference." });
    }

    res.json({
      success: true,
      token: ticket.trackingToken,
      ticketRef: ticket.ticketRef,
      title: ticket.title,
      status: ticket.status,
      creationDate: ticket.creationDate,
      updatedDate: ticket.updatedDate,
      submittedBy: {
        name: ticket.submittedUserName,
        email: ticket.submittedUserEmail,
      },
    });
  } catch (error: any) {
    console.error("Fetch ticket status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. PATCH /api/tickets/updates and /api/updates - Support agent updates ticket status & fires mail (matches provided Next.js code)
app.patch(["/api/tickets/updates", "/api/updates"], async (req, res) => {
  try {
    const body = req.body;
    const ticketId = Number(body.ticketId);
    const newStatus = body.newStatus?.trim().toUpperCase();

    if (!ticketId || !newStatus) {
      return res.status(400).json({ 
        success: false, 
        message: "ticketId and newStatus are required" 
      });
    }

    const validStatuses = ["CREATED", "PROCESSING", "COMPLETED"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Update ticket
    await pool.query(`
      UPDATE "Ticket" 
      SET status = $1, "updatedDate" = NOW() 
      WHERE id = $2
    `, [newStatus, ticketId]);

    // Fetch updated ticket and client details
    const result = await pool.query(`
      SELECT t.*, u.name as "userName", u.email as "userEmail"
      FROM "Ticket" t
      JOIN "User" u ON t."submittedBy" = u.id
      WHERE t.id = $1
    `, [ticketId]);

    const ticket = result.rows[0];

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found after update" });
    }

    const clientEmail = ticket.userEmail;
    const clientName = ticket.userName;

    let statusText = "A Bona IT Support Agent is now working on your request.";
    if (newStatus === "COMPLETED") {
      statusText = "Your ticket has been resolved and closed.";
    }

    // Send update email via Mailtrap SMTP
    const emailRes = await sendEmail(
      clientEmail,
      `Update for ${ticket.ticketRef} - ${ticket.title}`,
      `Hello ${clientName},\n\nYour ticket ${ticket.ticketRef} has been updated.\n\nCurrent status: ${newStatus}.\n\n${statusText}\n\nThank you,\nBona IT Support`
    );

    res.json({
      success: true,
      token: ticket.trackingToken,
      ticketRef: ticket.ticketRef,
      status: newStatus,
      emailSent: emailRes.success,
      emailError: emailRes.error || null,
    });
  } catch (error: any) {
    console.error("Update ticket error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update ticket" });
  }
});

// 7.5. PATCH /api/tickets/:id - Update ticket details (title, description, etc.)
app.patch("/api/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    let finalTitle = (title || "").trim();
    let finalReportType = undefined;
    
    if (description && (!finalTitle || finalTitle.toUpperCase() === 'OTHER') && description.startsWith('[Subject:')) {
      const closeBracketIdx = description.indexOf(']');
      if (closeBracketIdx !== -1) {
        finalTitle = description.substring(9, closeBracketIdx).trim();
        finalReportType = finalTitle.toUpperCase();
      }
    } else if (finalTitle) {
      finalReportType = finalTitle.toUpperCase();
    }

    await pool.query(
      `UPDATE "Ticket" 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description),
           "reportType" = COALESCE($3, "reportType"),
           "updatedDate" = NOW()
       WHERE id = $4`,
      [finalTitle || null, description || null, finalReportType || null, Number(id)]
    );

    // Fetch updated ticket and client details for email notification
    const result = await pool.query(`
      SELECT t.*, u.name as "userName", u.email as "userEmail"
      FROM "Ticket" t
      JOIN "User" u ON t."submittedBy" = u.id
      WHERE t.id = $1
    `, [Number(id)]);

    const ticket = result.rows[0];
    let emailSent = false;
    let emailError = null;

    if (ticket) {
      const clientEmail = ticket.userEmail;
      const clientName = ticket.userName;

      // Send details update email via Mailtrap SMTP
      const emailRes = await sendEmail(
        clientEmail,
        `Ticket Details Updated - ${ticket.ticketRef}`,
        `Hello ${clientName},\n\nYour ticket ${ticket.ticketRef} details have been updated by a Bona IT Support Agent.\n\nNew Title: ${ticket.title}\nNew Description: ${ticket.description}\n\nThank you,\nBona IT Support`
      );
      emailSent = emailRes.success;
      emailError = emailRes.error || null;
    }

    res.json({ success: true, message: "Ticket details updated successfully", emailSent, emailError });
  } catch (error: any) {
    console.error("Update ticket details error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. DELETE /api/tickets/:id - Delete ticket
app.delete("/api/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM "Ticket" WHERE id = $1', [id]);
    res.json({ success: true, message: "Ticket deleted successfully" });
  } catch (error: any) {
    console.error("Delete ticket error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. PATCH /api/users/:id - Update user details
app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    await pool.query(
      `UPDATE "User" 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           role = COALESCE($3, role), 
           password = COALESCE($4, password) 
       WHERE id = $5`,
      [name, email, role, password, id]
    );
    res.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 10. DELETE /api/users/:id - Delete user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM "User" WHERE id = $1', [id]);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// VITE DEV SERVER / STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
