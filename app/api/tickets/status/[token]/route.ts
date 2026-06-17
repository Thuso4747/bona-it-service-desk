import { NextResponse } from "next/server";
import { tickets } from "@/lib/tickets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const ticket = tickets.find((t) => t.token === token);

  if (!ticket) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid token",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    ticketId: ticket.id,
    status: ticket.status,
  });
}