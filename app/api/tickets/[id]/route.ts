import { NextResponse } from "next/server";
import { tickets } from "@/lib/tickets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  return NextResponse.json({
    success: true,
    data: ticket,
  });
}