import pg from "pg";

export default async function handler(req: any, res: any) {
  // Handles DELETE requests only
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { id: rawId } = req.query;
    
    // Validate id
    if (rawId === undefined || rawId === null) {
      return res.status(400).json({
        success: false,
        message: "Ticket id is required",
      });
    }

    const id = Number(rawId);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "id must be a valid number",
      });
    }

    // Connect to Neon using process.env.DATABASE_URL only
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
      // Execute the query: DELETE FROM "Ticket" WHERE id = $1 RETURNING id, "ticketRef"
      const result = await pool.query(
        `DELETE FROM "Ticket"
         WHERE id = $1
         RETURNING id, "ticketRef"`,
        [id]
      );

      const deletedTicket = result.rows[0];

      if (!deletedTicket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      return res.status(200).json({
        success: true,
        deletedTicketId: id,
        ticketRef: deletedTicket.ticketRef,
      });

    } finally {
      // Clean up the pool connection
      await pool.end();
    }

  } catch (error: any) {
    console.error("Error in delete-ticket serverless function:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
