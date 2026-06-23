import { NextResponse } from "next/server";
import { tickets } from "@/lib/tickets";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return NextResponse.json(
      {
        success: false,
        message: "Ticket not found",
      },
      { status: 404 }
    );
  }

  ticket.assignedTo = body.assignedTo;

  return NextResponse.json({
    success: true,
    message: "Ticket assigned successfully",
    data: ticket,
  });
}