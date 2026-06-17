export type Ticket = {
  id: string;
  token: string;
  name: string;
  email: string;
  issue: string;
  status: "Open" | "In Progress" | "Resolved";
  assignedTo: string | null;
  createdAt: string;
};

export const tickets: Ticket[] = [];