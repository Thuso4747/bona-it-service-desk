import pg from "pg";

export default async function handler(req: any, res: any) {
  // Handle GET requests only
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { token } = req.query;
    const cleanToken = typeof token === "string" ? token.trim() : (Array.isArray(token) ? token[0].trim() : "");

    if (!cleanToken) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    // Normalize input to see if it is a ticket reference:
    // Remove all spaces
    let normalizedRef = cleanToken.replace(/\s+/g, "").toUpperCase();

    // If it doesn't start with "TKT-" but is an 8-char hex, pre-pend "TKT-"
    if (!normalizedRef.startsWith("TKT-") && normalizedRef.length === 8 && /^[0-9A-F]+$/.test(normalizedRef)) {
      normalizedRef = "TKT-" + normalizedRef;
    }

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
      // Query the Ticket table joined with User
      const queryText = `
        SELECT t.*, u.name as "submittedUserName", u.email as "submittedUserEmail"
        FROM "Ticket" t
        JOIN "User" u ON t."submittedBy" = u.id
        WHERE t."trackingToken" = $1
        OR UPPER(t."ticketRef") = $1
        OR UPPER(t."ticketRef") = $2
      `;

      const result = await pool.query(queryText, [cleanToken, normalizedRef]);
      const ticket = result.rows[0];

      if (!ticket) {
        return res.status(404).json({ success: false, message: "Ticket not found with that token or reference." });
      }

      return res.status(200).json({
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
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("Error in status tracking serverless function:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
