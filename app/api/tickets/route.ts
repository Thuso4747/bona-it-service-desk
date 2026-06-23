import { NextResponse } from "next/server";
import { tickets, Ticket } from "@/lib/tickets";

// GET all tickets
export async function GET() {
  return NextResponse.json({
    success: true,
    data: tickets,
  });
}

// CREATE a new ticket
export async function POST(request: Request) {
  const body = await request.json();

  const newTicket: Ticket = {
    id: Date.now().toString(),
    token: Math.random().toString(36).substring(2, 8).toUpperCase(),
    name: body.name,
    email: body.email,
    issue: body.issue,
    status: "Open",
    assignedTo: null,
    createdAt: new Date().toISOString(),
  };

  tickets.push(newTicket);

  return NextResponse.json({
    success: true,
    message: "Ticket created successfully",
    data: newTicket,
  });
}