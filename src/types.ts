export interface Ticket {
  id: number;
  ticketRef: string;
  title: string;
  description: string;
  status: 'CREATED' | 'PROCESSING' | 'COMPLETED' | string;
  dbStatus?: string;
  reportType?: string;
  submittedByEmail?: string;
  submittedByName?: string;
  creationDate?: string;
  updatedDate?: string;
  trackingToken?: string;
  assignedTo?: number | null;
  resolvedBy?: number | null;
}

export interface UserAccount {
  id: number;
  userRef: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'AGENT';
  dbRole?: string;
  password?: string;
}

export type AppView = 'auth' | 'agent-dashboard' | 'client-simulator';
