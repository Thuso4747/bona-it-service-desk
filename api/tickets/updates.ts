import pg from "pg";
import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  // 1. Handle PATCH requests only
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { ticketId, newStatus } = req.body;

    // 2. Validate ticketId must be a number
    if (ticketId === undefined || ticketId === null || typeof ticketId !== "number" || isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "ticketId must be a valid number",
      });
    }

    // 3. Validate newStatus must be CREATED, PROCESSING, or COMPLETED
    const validStatuses = ["CREATED", "PROCESSING", "COMPLETED"];
    if (!newStatus || typeof newStatus !== "string" || !validStatuses.includes(newStatus.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const normalizedStatus = newStatus.toUpperCase();

    // 4. Connect to Neon using process.env.DATABASE_URL only
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return res.status(500).json({
        success: false,
        message: "DATABASE_URL environment variable is missing",
      });
    }

    // Initialize PostgreSQL client/pool
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("sslmode=require") || DATABASE_URL.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
    });

    try {
      // 5. Update ticket
      await pool.query(
        `UPDATE "Ticket"
         SET status = $1, "updatedDate" = NOW()
         WHERE id = $2`,
        [normalizedStatus, ticketId]
      );

      // 6. Fetch the updated ticket joined with User email/name
      const result = await pool.query(
        `SELECT t.*, u.name as "userName", u.email as "userEmail"
         FROM "Ticket" t
         JOIN "User" u ON t."submittedBy" = u.id
         WHERE t.id = $1`,
        [ticketId]
      );

      const ticket = result.rows[0];
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found after update",
        });
      }

      // 7. Send Mailtrap email using Mailtrap settings
      const MAILTRAP_HOST = process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io";
      const MAILTRAP_PORT = Number(process.env.MAILTRAP_PORT) || 2525;
      const MAILTRAP_USER = process.env.MAILTRAP_USER || "";
      const MAILTRAP_PASS = process.env.MAILTRAP_PASS || "";

      let emailSent = false;
      let emailError = null;

      if (MAILTRAP_USER && MAILTRAP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: MAILTRAP_HOST,
            port: MAILTRAP_PORT,
            auth: {
              user: MAILTRAP_USER,
              pass: MAILTRAP_PASS,
            },
          });

          let statusText = "A Bona IT Support Agent is now working on your request.";
          if (normalizedStatus === "COMPLETED") {
            statusText = "Your ticket has been resolved and closed.";
          }

          const info = await transporter.sendMail({
            from: "Bona IT Support <support@bonait.local>",
            to: ticket.userEmail,
            subject: `Update for ${ticket.ticketRef} - ${ticket.title}`,
            text: `Hello ${ticket.userName},\n\nYour ticket ${ticket.ticketRef} has been updated.\n\nCurrent status: ${normalizedStatus}.\n\n${statusText}\n\nThank you,\nBona IT Support`,
          });

          console.log(`[Email Sent] Message ID: ${info.messageId} to ${ticket.userEmail}`);
          emailSent = true;
        } catch (err: any) {
          console.error("Email sending failed in updates.ts:", err.message);
          emailError = err.message || "Failed to send email";
        }
      } else {
        console.warn("Mailtrap credentials missing, skipping email sending.");
        emailError = "Mailtrap credentials are not configured";
      }

      // 8. Return JSON
      return res.status(200).json({
        success: true,
        ticketRef: ticket.ticketRef,
        status: normalizedStatus,
        emailSent,
        emailError,
      });

    } finally {
      // Clean up the pool connection
      await pool.end();
    }

  } catch (error: any) {
    console.error("Error in patch-ticket serverless function:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
