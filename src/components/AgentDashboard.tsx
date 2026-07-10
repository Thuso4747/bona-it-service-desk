import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Grid, LayoutGrid, Settings, GitBranch, Activity, Database, Terminal, Table, 
  ShieldAlert, Key, ChevronDown, ChevronRight, RefreshCw, MoreHorizontal, Sparkles, 
  User, Check, Clock, AlertTriangle, LogOut, Trash2, Edit3, Filter, HelpCircle, X, ChevronLeft,
  Mail, Save, Menu
} from 'lucide-react';
import { Ticket, UserAccount } from '../types';

// Helpers to cleanly parse subject and body
function getDisplayTitle(ticket: any): string {
  if (!ticket) return 'Other';
  const rawTitle = ticket.title || '';
  if ((!rawTitle || rawTitle.toUpperCase() === 'OTHER') && ticket.description && ticket.description.startsWith('[Subject:')) {
    const closeBracketIdx = ticket.description.indexOf(']');
    if (closeBracketIdx !== -1) {
      return ticket.description.substring(9, closeBracketIdx).trim();
    }
  }
  return rawTitle || 'Other';
}

function cleanDescription(desc: string): string {
  if (!desc) return '';
  if (desc.startsWith('[Subject:')) {
    const closeBracketIdx = desc.indexOf(']');
    if (closeBracketIdx !== -1) {
      return desc.substring(closeBracketIdx + 1).trim();
    }
  }
  return desc;
}

interface AgentDashboardProps {
  onSignOut: () => void;
  currentUserEmail?: string;
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  pendingStatusChanges: Record<number, 'CREATED' | 'PROCESSING' | 'COMPLETED'>;
  setPendingStatusChanges: React.Dispatch<React.SetStateAction<Record<number, 'CREATED' | 'PROCESSING' | 'COMPLETED'>>>;
  pendingUserRoleChanges: Record<number, 'CLIENT' | 'AGENT'>;
  setPendingUserRoleChanges: React.Dispatch<React.SetStateAction<Record<number, 'CLIENT' | 'AGENT'>>>;
  selectedTicketId: number | null;
  setSelectedTicketId: (id: number | null) => void;
  selectedUserId: number | null;
  setSelectedUserId: (id: number | null) => void;
  refreshData: () => Promise<void>;
}

export default function AgentDashboard({ 
  onSignOut, 
  currentUserEmail,
  tickets,
  setTickets,
  users,
  setUsers,
  pendingStatusChanges,
  setPendingStatusChanges,
  pendingUserRoleChanges,
  setPendingUserRoleChanges,
  selectedTicketId,
  setSelectedTicketId,
  selectedUserId,
  setSelectedUserId,
  refreshData
}: AgentDashboardProps) {
  // Current active table in the Neon Console replica
  const [activeTable, setActiveTable] = useState<'Ticket' | 'User'>('Ticket');

  // Mobile sidebar toggle state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // State for search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Add Record States
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  
  // New Ticket Form Fields
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketStatus, setNewTicketStatus] = useState<'CREATED' | 'PROCESSING' | 'COMPLETED'>('CREATED');

  // New User Form Fields
  const [newUserRef, setNewUserRef] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'CLIENT' | 'AGENT'>('CLIENT');

  // Sparkles / AI Chat panel state
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiReplies, setAiReplies] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([
    { sender: 'ai', text: "Hello! I am your AI Schema Companion. I can help analyze your DB tables, generate dummy records, or update ticket statuses. Try asking: 'Auto-complete processing tickets' or 'Count client users'." }
  ]);

  // Bulk selector states
  const [selectedTicketRows, setSelectedTicketRows] = useState<number[]>([]);
  const [selectedUserRows, setSelectedUserRows] = useState<number[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Filtering list based on search
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(t => 
      t.ticketRef.toLowerCase().includes(q) || 
      t.title.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.userRef.toLowerCase().includes(q) || 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Handle adding record
  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTable === 'Ticket') {
      if (!newTicketTitle.trim() || !newTicketDesc.trim()) return;
      let nextId = 1;
      const existingIds = new Set(tickets.map(t => t.id));
      while (existingIds.has(nextId)) {
        nextId++;
      }
      const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
      const newTicket: Ticket = {
        id: nextId,
        ticketRef: `TKT-${randomHex}`,
        title: newTicketTitle,
        reportType: 'OTHER',
        description: newTicketDesc,
        status: newTicketStatus,
        creationDate: new Date().toISOString(),
        updatedDate: new Date().toISOString()
      };
      setTickets([...tickets, newTicket]);
      setNewTicketTitle('');
      setNewTicketDesc('');
      setNewTicketStatus('CREATED');
    } else {
      if (!newUserName.trim() || !newUserEmail.trim()) return;
      const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
      const newUser: UserAccount = {
        id: nextId,
        userRef: `USR-${randomHex}`,
        name: newUserName,
        email: newUserEmail,
        role: newUserRole
      };
      setUsers([...users, newUser]);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('CLIENT');
    }
    setIsAddRecordOpen(false);
  };

  // AI interactive processing logic
  const handleAiCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;
    
    const userMsg = aiMessage.trim();
    const newChat = [...aiReplies, { sender: 'user' as const, text: userMsg }];
    setAiReplies(newChat);
    setAiMessage('');

    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let responseText = "I couldn't quite process that command. Try asking 'Auto-complete processing tickets' or 'Generate 2 dummy clients'.";

      if (lower.includes('auto-complete') || lower.includes('complete processing')) {
        let count = 0;
        const updated = tickets.map(t => {
          if (t.status === 'PROCESSING') {
            count++;
            return { ...t, status: 'COMPLETED' as const };
          }
          return t;
        });
        setTickets(updated);
        responseText = `⚡ AI Action Executed: Checked and auto-completed ${count} ticket(s) currently marked as 'PROCESSING'. Your schema tables have been refreshed dynamically.`;
      } else if (lower.includes('count') && lower.includes('client')) {
        const clientCount = users.filter(u => u.role === 'CLIENT').length;
        responseText = `📊 Table Metrics: There are currently ${clientCount} clients registered in the 'User' schema table.`;
      } else if (lower.includes('dummy') || lower.includes('add dummy') || lower.includes('generate')) {
        // Generate new record
        let nextId = 1;
        const existingIds = new Set(tickets.map(t => t.id));
        while (existingIds.has(nextId)) {
          nextId++;
        }
        const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
        const dummyTicket: Ticket = {
          id: nextId,
          ticketRef: `TKT-${randomHex}`,
          title: 'Complaint - AI Auto-generated Help Ticket',
          reportType: 'AI_INGESTED',
          description: 'This is a simulation test ticket injected via the Neon Ask AI coprocessor system.',
          status: 'CREATED',
          creationDate: new Date().toISOString(),
          updatedDate: new Date().toISOString()
        };
        setTickets(prev => [...prev, dummyTicket]);
        responseText = `✨ DB Record Inserted: Generated a new ticket "${dummyTicket.ticketRef}" and added it directly to the local memory database store!`;
      }

      setAiReplies(prev => [...prev, { sender: 'ai', text: responseText }]);
    }, 800);
  };

  // Checkbox bulk togglers
  const handleToggleAllTickets = () => {
    if (selectedTicketRows.length === filteredTickets.length) {
      setSelectedTicketRows([]);
    } else {
      setSelectedTicketRows(filteredTickets.map(t => t.id));
    }
  };

  const handleToggleTicketRow = (id: number) => {
    if (selectedTicketRows.includes(id)) {
      setSelectedTicketRows(selectedTicketRows.filter(r => r !== id));
    } else {
      setSelectedTicketRows([...selectedTicketRows, id]);
    }
  };

  const handleToggleAllUsers = () => {
    if (selectedUserRows.length === filteredUsers.length) {
      setSelectedUserRows([]);
    } else {
      setSelectedUserRows(filteredUsers.map(u => u.id));
    }
  };

  const handleToggleUserRow = (id: number) => {
    if (selectedUserRows.includes(id)) {
      setSelectedUserRows(selectedUserRows.filter(r => r !== id));
    } else {
      setSelectedUserRows([...selectedUserRows, id]);
    }
  };

  // Find selected inspector objects
  const activeTicketInspector = tickets.find(t => t.id === selectedTicketId);
  const activeUserInspector = users.find(u => u.id === selectedUserId);

  // Update in place with backend synchronization upon manual save
  const updateTicketStatus = (id: number, status: 'CREATED' | 'PROCESSING' | 'COMPLETED') => {
    // Optimistically update frontend state
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setPendingStatusChanges(prev => ({ ...prev, [id]: status }));
  };

  const handleSaveChanges = async () => {
    const entries = Object.entries(pendingStatusChanges);
    if (entries.length === 0) return;

    for (const [idStr, status] of entries) {
      const id = Number(idStr);
      try {
        const response = await fetch('/api/tickets/updates', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: id,
            newStatus: status
          })
        });
        const data = await response.json();
        if (!data.success) {
          console.warn("Server failed to update ticket:", data.message);
        }
      } catch (e) {
        console.warn("Offline fallback activated for ticket status update:", e);
      }
    }
    setPendingStatusChanges({});

    // Refresh tickets from backend using the unified prop function
    await refreshData();
  };

  const updateUserRole = (id: number, role: 'CLIENT' | 'AGENT') => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    setPendingUserRoleChanges(prev => ({ ...prev, [id]: role }));
  };

  const handleSelectTicket = async (id: number) => {
    setSaveError(null);
    // If switching or selecting another ticket, discard uncommitted pending status change
    if (selectedTicketId) {
      setPendingStatusChanges(prev => {
        const copy = { ...prev };
        delete copy[selectedTicketId];
        return copy;
      });
    }
    if (selectedUserId) {
      setPendingUserRoleChanges(prev => {
        const copy = { ...prev };
        delete copy[selectedUserId];
        return copy;
      });
    }
    setSelectedTicketId(id);
    setSelectedUserId(null);
    await refreshData();
  };

  const handleSelectUser = async (id: number) => {
    setSaveError(null);
    if (selectedTicketId) {
      setPendingStatusChanges(prev => {
        const copy = { ...prev };
        delete copy[selectedTicketId];
        return copy;
      });
    }
    if (selectedUserId) {
      setPendingUserRoleChanges(prev => {
        const copy = { ...prev };
        delete copy[selectedUserId];
        return copy;
      });
    }
    setSelectedUserId(id);
    setSelectedTicketId(null);
    await refreshData();
  };

  const handleCloseInspector = async () => {
    setSaveError(null);
    if (selectedTicketId) {
      setPendingStatusChanges(prev => {
        const copy = { ...prev };
        delete copy[selectedTicketId];
        return copy;
      });
    }
    if (selectedUserId) {
      setPendingUserRoleChanges(prev => {
        const copy = { ...prev };
        delete copy[selectedUserId];
        return copy;
      });
    }
    setSelectedTicketId(null);
    setSelectedUserId(null);
    await refreshData();
  };

  const handleSaveUserChanges = async () => {
    const entries = Object.entries(pendingUserRoleChanges);
    if (entries.length === 0) return;

    for (const [idStr, role] of entries) {
      const id = Number(idStr);
      try {
        const response = await fetch('/api/users/role', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: id,
            role: role
          })
        });
        const data = await response.json();
        if (!data.success) {
          console.warn("Server failed to update user role:", data.message);
        }
      } catch (e) {
        console.warn("Offline fallback activated for user role update:", e);
      }
    }
    setPendingUserRoleChanges({});
    await refreshData();
  };

  // Delete handler with backend synchronization
  const handleDeleteTicket = async (id: number) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setSelectedTicketId(null);

    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!data.success) {
        console.warn("Server failed to delete ticket:", data.message);
      }
    } catch (e) {
      console.warn("Offline fallback activated for ticket deletion:", e);
    }
  };

  const handleDeleteUser = async (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setSelectedUserId(null);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!data.success) {
        console.warn("Server failed to delete user:", data.message);
      }
    } catch (e) {
      console.warn("Offline fallback activated for user deletion:", e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans select-none overflow-hidden">
      
      {/* TWO PANEL OR THREE PANEL WORKING DESKTOP CONTAINER */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        
        {/* Mobile Sidebar Overlay Backdrop */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-30 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* CONSOLIDATED LEFT SIDE BAR: AGENT DESK */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 flex flex-col bg-white shrink-0 select-none text-slate-700 text-xs transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          
          {/* Brand header & Active Agent info */}
          <div className="h-12 border-b border-slate-100/10 bg-[#1b3bb6] flex items-center px-4 shrink-0">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-xs font-bold text-white tracking-wider uppercase">Bona IT Agent Desk</h1>
                <p className="text-[9px] text-blue-100/80 font-medium -mt-0.5">Agent Workspace</p>
              </div>
            </div>
          </div>

          {/* Schema tables list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5 text-slate-400 text-[10px] font-bold tracking-wider uppercase">
              Tables
            </div>
            
            {/* Ticket Table */}
            <button
              onClick={() => {
                setActiveTable('Ticket');
                setSelectedTicketId(null);
                setSelectedUserId(null);
                setSearchQuery('');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-[12px] rounded-lg transition-colors cursor-pointer text-left
                ${activeTable === 'Ticket' 
                  ? 'bg-slate-100 font-semibold text-slate-900 border border-slate-200/50' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">Tickets</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold
                ${activeTable === 'Ticket' ? 'bg-[#1b3bb6]/10 text-[#1b3bb6]' : 'bg-slate-100 text-slate-500'}`}>
                {tickets.length}
              </span>
            </button>

            {/* User Table */}
            <button
              onClick={() => {
                setActiveTable('User');
                setSelectedTicketId(null);
                setSelectedUserId(null);
                setSearchQuery('');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-[12px] rounded-lg transition-colors cursor-pointer text-left
                ${activeTable === 'User' 
                  ? 'bg-slate-100 font-semibold text-slate-900 border border-slate-200/50' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">Users</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold
                ${activeTable === 'User' ? 'bg-[#1b3bb6]/10 text-[#1b3bb6]' : 'bg-slate-100 text-slate-500'}`}>
                {users.length}
              </span>
            </button>
          </div>

          {/* Bottom section with Sign Out */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/40">
            <button
              onClick={() => {
                setIsMobileSidebarOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 border border-transparent hover:border-rose-100 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* 4. RIGHT CONTENT MAIN VIEW: DATABASE EXCEL SHEET TABLE VIEW */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
          
          {/* Main Action top-bar */}
          <div className="h-12 border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 bg-slate-50/50 text-xs text-slate-600 shrink-0 select-none">
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 md:hidden cursor-pointer shrink-0"
                title="Open menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <span className="font-mono text-xs text-[#1b3bb6] font-bold uppercase tracking-wider shrink-0">{activeTable === 'Ticket' ? 'Tickets' : 'Users'}</span>
              <span className="text-slate-200 text-lg font-light shrink-0">/</span>
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTable === 'Ticket' ? 'tickets' : 'records'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2 h-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b3bb6] focus:ring-1 focus:ring-[#1b3bb6]/10 transition-all w-36 sm:w-52 shadow-sm"
                />
              </div>
            </div>

              {/* Save Changes and AI Companion block (Moved to detail inspector drawer) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              </div>
            </div>

          {/* REAL SHEET-LIKE EXCEL GRID TABLE */}
          <div className="flex-1 overflow-auto bg-slate-50/50">
            <table className="hidden md:table w-full border-collapse text-[13px] text-left min-w-[850px]">
              
              {/* Header */}
              <thead className="bg-[#fafafa] border-b border-slate-200 sticky top-0 text-[11px] font-mono text-slate-500 select-none z-10">
                <tr>
                  {/* Index Column */}
                  <th className="w-12 border-r border-slate-200 text-center px-2 py-1.5 bg-[#f1f5f9]/30">id <span className="text-slate-400">serial</span></th>
                  
                  {activeTable === 'Ticket' ? (
                    <>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">ticketRef <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">emailSubject / reportType <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">description <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">status <span className="text-slate-400 font-normal">TicketState</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">creationDate <span className="text-slate-400 font-normal">timestamp</span></th>
                      <th className="px-4 py-1.5 bg-white font-semibold text-slate-700">updatedDate <span className="text-slate-400 font-normal">timestamp</span></th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">userRef <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">name <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">email <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 border-r border-slate-200 bg-white font-semibold text-slate-700">password <span className="text-slate-400 font-normal">text</span></th>
                      <th className="px-4 py-1.5 bg-white font-semibold text-slate-700">role <span className="text-slate-400 font-normal">Role</span></th>
                    </>
                  )}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="bg-white divide-y divide-slate-100 font-sans">
                {activeTable === 'Ticket' ? (
                  filteredTickets.length > 0 ? (
                    filteredTickets.map((t) => (
                      <tr 
                        key={t.id} 
                        onClick={() => handleSelectTicket(t.id)}
                        className={`hover:bg-slate-50/70 transition-colors group cursor-pointer 
                          ${selectedTicketId === t.id ? 'bg-[#1b3bb6]/5 hover:bg-[#1b3bb6]/10' : ''}`}
                      >
                        {/* Serial Id */}
                        <td className="border-r border-slate-100 text-center text-slate-400 px-2 py-2.5 font-mono text-xs bg-slate-50/10">
                          {t.id}
                        </td>
                        
                        {/* Ref (Monospace font for code) */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-mono text-xs text-slate-600 font-semibold">
                          {t.ticketRef}
                        </td>

                        {/* reportType */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-medium text-slate-800 max-w-[180px] truncate">
                          {getDisplayTitle(t)}
                        </td>

                        {/* Description */}
                        <td className="px-4 py-2.5 border-r border-slate-100 text-slate-500 max-w-[220px] truncate font-light">
                          {cleanDescription(t.description)}
                        </td>

                        {/* Status state tag */}
                        <td className="px-4 py-2.5 border-r border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold
                              ${t.status?.toUpperCase() === 'CREATED' ? 'text-blue-600' : ''}
                              ${t.status?.toUpperCase() === 'PROCESSING' ? 'text-amber-600' : ''}
                              ${t.status?.toUpperCase() === 'COMPLETED' ? 'text-emerald-600' : ''}
                            `}>
                              {t.status?.toUpperCase() === 'CREATED' ? 'Created' : 
                               t.status?.toUpperCase() === 'PROCESSING' ? 'Processing' : 
                               t.status?.toUpperCase() === 'COMPLETED' ? 'Complete' : t.status}
                            </span>
                          </div>
                        </td>

                        {/* creationDate */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-mono text-xs text-slate-500">
                          {t.creationDate ? new Date(t.creationDate).toLocaleString() : 'N/A'}
                        </td>

                        {/* updatedDate */}
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                          {t.updatedDate ? new Date(t.updatedDate).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-light">
                        No tickets matching search filter.
                      </td>
                    </tr>
                  )
                ) : (
                  filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr 
                        key={u.id}
                        onClick={() => handleSelectUser(u.id)}
                        className={`hover:bg-slate-50/70 transition-colors group cursor-pointer 
                          ${selectedUserId === u.id ? 'bg-[#1b3bb6]/5 hover:bg-[#1b3bb6]/10' : ''}`}
                      >
                        {/* Serial Id */}
                        <td className="border-r border-slate-100 text-center text-slate-400 px-2 py-2.5 font-mono text-xs bg-slate-50/10">
                          {u.id}
                        </td>
                        
                        {/* userRef */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-mono text-xs text-slate-600 font-semibold">
                          {u.userRef}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-medium text-slate-800">
                          {u.name}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-mono text-xs text-slate-500">
                          {u.email}
                        </td>

                        {/* Password */}
                        <td className="px-4 py-2.5 border-r border-slate-100 font-mono text-xs text-slate-400 select-all opacity-85" title="Read-only user password">
                          {u.password || '••••••••'}
                        </td>

                        {/* Role state tag */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded-md border bg-slate-50 border-slate-200 text-slate-600">
                              {u.role}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-light">
                        No clients matching search filter.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {/* Mobile Stacked Vertical Card View */}
            {activeTable === 'Ticket' ? (
              <div className="block md:hidden bg-white divide-y divide-slate-100">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => { setSelectedTicketId(t.id); setSelectedUserId(null); }}
                      className={`p-4 transition-all relative cursor-pointer border-b border-slate-100 last:border-b-0
                        ${selectedTicketId === t.id ? 'bg-blue-50/15' : 'hover:bg-slate-50/40'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="font-mono text-xs text-slate-400"># {t.id}</span>
                        </div>
                        
                        <span className={`text-[11px] font-bold uppercase tracking-wider
                          ${t.status?.toUpperCase() === 'CREATED' ? 'text-blue-600' : ''}
                          ${t.status?.toUpperCase() === 'PROCESSING' ? 'text-amber-600' : ''}
                          ${t.status?.toUpperCase() === 'COMPLETED' ? 'text-emerald-600' : ''}
                        `}>
                          {t.status?.toUpperCase() === 'CREATED' ? 'Created' : 
                           t.status?.toUpperCase() === 'PROCESSING' ? 'Processing' : 
                           t.status?.toUpperCase() === 'COMPLETED' ? 'Complete' : t.status}
                        </span>
                      </div>

                      <div className="space-y-1 mb-2.5">
                        <div className="text-[10px] font-mono font-medium text-[#1b3bb6] bg-blue-50/75 px-1.5 py-0.5 rounded inline-block">
                          {t.ticketRef}
                        </div>
                        <h4 className="font-semibold text-slate-800 text-[13px]">
                          {getDisplayTitle(t)}
                        </h4>
                        <p className="text-slate-500 text-xs line-clamp-2 font-light">
                          {cleanDescription(t.description)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                          <div>Created: {t.creationDate ? new Date(t.creationDate).toLocaleString() : 'N/A'}</div>
                          <div>Updated: {t.updatedDate ? new Date(t.updatedDate).toLocaleString() : 'N/A'}</div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => { setSelectedTicketId(t.id); setSelectedUserId(null); }}
                            className="p-1.5 px-3 bg-[#1b3bb6] hover:bg-[#152fa2] text-white rounded-lg flex items-center gap-1 text-[11px] font-semibold cursor-pointer shadow-sm transition-colors"
                            title="View details"
                          >
                            <span>View More</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 font-light text-xs bg-white">
                    No tickets matching search filter.
                  </div>
                )}
              </div>
            ) : (
              <div className="block md:hidden bg-white divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <div 
                      key={u.id}
                      onClick={() => { setSelectedUserId(u.id); setSelectedTicketId(null); }}
                      className={`p-4 transition-all relative cursor-pointer border-b border-slate-100 last:border-b-0
                        ${selectedUserId === u.id ? 'bg-blue-50/15' : 'hover:bg-slate-50/40'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="font-mono text-xs text-slate-400"># {u.id}</span>
                        </div>
                        
                        <span className={`text-[11px] font-mono font-bold tracking-wider uppercase
                          ${u.role?.toUpperCase() === 'AGENT' ? 'text-[#1b3bb6]' : 'text-slate-500'}
                        `}>
                          {u.role}
                        </span>
                      </div>

                      <div className="space-y-1 mb-2.5">
                        <div className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                          {u.userRef}
                        </div>
                        <h4 className="font-semibold text-slate-800 text-[13px]">
                          {u.name}
                        </h4>
                        <div className="text-slate-600 text-xs font-mono break-all">
                          {u.email}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono">
                          Password: {u.password || '••••••••'}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => { setSelectedUserId(u.id); setSelectedTicketId(null); }}
                          className="p-1.5 px-3 bg-[#1b3bb6] hover:bg-[#152fa2] text-white rounded-lg flex items-center gap-1 text-[11px] font-semibold cursor-pointer shadow-sm transition-colors"
                          title="View details"
                        >
                          <span>View More</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 font-light text-xs bg-white">
                    No clients matching search filter.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. SLIDING SIDE-DRAWER DETAIL INSPECTOR */}
          {(activeTicketInspector || activeUserInspector) && (
            <div className="absolute top-0 right-0 h-full w-full sm:w-80 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col justify-between transition-transform animate-[slideIn_0.2s_ease-out]">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  {activeTicketInspector ? (
                    <span className="text-xs font-bold font-mono text-[#1b3bb6] bg-blue-50 px-2.5 py-1 rounded border border-blue-100/60">
                      {activeTicketInspector.ticketRef}
                    </span>
                  ) : (
                    <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100/60">
                      {activeUserInspector?.userRef || activeUserInspector?.email || `User #${activeUserInspector?.id}`}
                    </span>
                  )}
                  <button 
                    onClick={handleCloseInspector}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {activeTicketInspector ? (
                  <>
                    <h3 className="text-sm font-bold text-slate-900">Ticket Inspector</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ticket Serial id: {activeTicketInspector.id}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-slate-900">User Inspector</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Database Record Serial id: {activeUserInspector?.id}</p>
                  </>
                )}
              </div>

              {/* Scrollable details editable block */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">
                {activeTicketInspector && (
                  <>
                    {saveError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 space-y-1 animate-fade-in">
                        <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Update Failed</span>
                        </div>
                        <p className="text-[11px] leading-relaxed break-words">{saveError}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Title</span>
                      <input 
                        type="text" 
                        value={getDisplayTitle(activeTicketInspector)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTickets(tickets.map(t => t.id === activeTicketInspector.id ? { ...t, title: val } : t));
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-[#1b3bb6] outline-none transition-colors text-[13px] font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Description</span>
                      <textarea 
                        rows={4}
                        value={cleanDescription(activeTicketInspector.description)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTickets(tickets.map(t => t.id === activeTicketInspector.id ? { ...t, description: val } : t));
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-[#1b3bb6] outline-none transition-colors text-[12px] font-normal resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Status</span>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {['CREATED', 'PROCESSING', 'COMPLETED'].map((st) => (
                          <button
                            key={st}
                            onClick={() => updateTicketStatus(activeTicketInspector.id, st as any)}
                            className={`py-1.5 px-2 border rounded-md text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer
                              ${activeTicketInspector.status === st 
                                ? 'bg-slate-900 border-slate-950 text-white shadow-sm' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>


                  </>
                )}

                {activeUserInspector && (
                  <>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Full Name</span>
                      <input 
                        type="text" 
                        value={activeUserInspector.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUsers(prev => prev.map(u => u.id === activeUserInspector.id ? { ...u, name: val } : u));
                          setPendingUserRoleChanges(prev => ({ ...prev, [activeUserInspector.id]: activeUserInspector.role }));
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-[#1b3bb6] outline-none transition-colors text-[13px] font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Email Address</span>
                      <input 
                        type="email" 
                        value={activeUserInspector.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUsers(prev => prev.map(u => u.id === activeUserInspector.id ? { ...u, email: val } : u));
                          setPendingUserRoleChanges(prev => ({ ...prev, [activeUserInspector.id]: activeUserInspector.role }));
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-[#1b3bb6] outline-none transition-colors text-[13px] font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Password (Read-Only)</span>
                      <input 
                        type="text" 
                        value={activeUserInspector.password || ''}
                        readOnly
                        disabled
                        className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 font-mono text-[13px] cursor-not-allowed select-all"
                        title="Administrators cannot modify user passwords"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold tracking-wider uppercase block text-[9px]">Role type</span>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {['CLIENT', 'AGENT'].map((rl) => (
                          <button
                            key={rl}
                            onClick={() => updateUserRole(activeUserInspector.id, rl as any)}
                            className={`py-1.5 px-2 border rounded-md text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer
                              ${activeUserInspector.role === rl 
                                ? 'bg-slate-900 border-slate-950 text-white shadow-sm' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                          >
                            {rl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer footer delete and save */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
                {activeTicketInspector && (() => {
                  const pendingVal = pendingStatusChanges[activeTicketInspector.id] !== undefined 
                    ? pendingStatusChanges[activeTicketInspector.id] 
                    : pendingStatusChanges[String(activeTicketInspector.id)];
                  const hasTicketChanges = pendingVal !== undefined && pendingVal.toUpperCase() !== (activeTicketInspector.dbStatus || activeTicketInspector.status)?.toUpperCase();

                  return (
                    <button 
                      disabled={!hasTicketChanges}
                      onClick={async () => {
                        setSaveError(null);
                        const selectedStatus = pendingVal || activeTicketInspector.status;
                        const ticketId = Number(activeTicketInspector.id);
                        const newStatus = selectedStatus.toUpperCase();

                        console.log("PATCH status update payload", { ticketId, newStatus });

                        try {
                          const response = await fetch('/api/tickets/updates', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ticketId: ticketId,
                              newStatus: newStatus
                            })
                          });

                          console.log("PATCH status update response status", response.status);

                          if (!response.ok) {
                            const contentType = response.headers.get("content-type");
                            let errorMessage = "Failed to update ticket status on the backend.";
                            if (contentType && contentType.includes("application/json")) {
                              try {
                                const errorData = await response.json();
                                errorMessage = errorData.message || errorData.error || errorMessage;
                              } catch (err) {
                                // Ignore parsing error
                              }
                            } else {
                              try {
                                const text = await response.text();
                                errorMessage = text.substring(0, 150) || `HTTP error ${response.status}: ${response.statusText}`;
                              } catch (err) {
                                errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
                              }
                            }
                            setSaveError(errorMessage);
                            return; // Do not clear pending status or refresh if it failed
                          }

                          const data = await response.json();
                          if (data && data.success === false) {
                            setSaveError(data.message || "The database could not complete the operation.");
                            return;
                          }

                          // Clear pending change on success
                          setPendingStatusChanges(prev => {
                            const copy = { ...prev };
                            delete copy[activeTicketInspector.id];
                            delete copy[String(activeTicketInspector.id)];
                            return copy;
                          });

                          // Force database sync & table update
                          await refreshData();

                          // Close inspector after saving
                          setSelectedTicketId(null);

                        } catch (e: any) {
                          setSaveError(e?.message || "A network or unexpected error occurred while saving.");
                          return;
                        }
                      }}
                      className={`w-full py-2 font-semibold rounded-lg text-center flex items-center justify-center text-xs transition-all shadow-sm
                        ${hasTicketChanges 
                          ? 'bg-[#1b3bb6] hover:bg-[#152fa2] text-white cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                    >
                      <span>Save Changes</span>
                    </button>
                  );
                })()}

                {activeUserInspector && (() => {
                  const pendingRoleVal = pendingUserRoleChanges[activeUserInspector.id] !== undefined 
                    ? pendingUserRoleChanges[activeUserInspector.id] 
                    : pendingUserRoleChanges[String(activeUserInspector.id)];
                  const hasUserChanges = pendingRoleVal !== undefined && pendingRoleVal.toUpperCase() !== (activeUserInspector.dbRole || activeUserInspector.role)?.toUpperCase();

                  return (
                    <button 
                      disabled={!hasUserChanges}
                      onClick={async () => {
                        // 1. Save role change first if pending exists
                        if (pendingRoleVal !== undefined) {
                          try {
                            await fetch('/api/users/role', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                userId: activeUserInspector.id,
                                role: pendingRoleVal
                              })
                            });
                          } catch (e) {
                            console.warn("Role patch failed:", e);
                          }
                          // Clear pending change
                          setPendingUserRoleChanges(prev => {
                            const copy = { ...prev };
                            delete copy[activeUserInspector.id];
                            delete copy[String(activeUserInspector.id)];
                            return copy;
                          });
                        }

                        // 2. Also save other user fields (name, email, password)
                        try {
                          await fetch(`/api/users/${activeUserInspector.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: activeUserInspector.name,
                              email: activeUserInspector.email,
                              password: activeUserInspector.password,
                              role: activeUserInspector.role
                            })
                          });
                        } catch (e) {
                          console.warn("User details patch failed:", e);
                        }

                        // 3. Force database sync & table update
                        await refreshData();

                        // 4. Close drawer after saving
                        setSelectedUserId(null);
                      }}
                      className={`w-full py-2 font-semibold rounded-lg text-center flex items-center justify-center text-xs transition-all shadow-sm
                        ${hasUserChanges 
                          ? 'bg-[#1b3bb6] hover:bg-[#152fa2] text-white cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                    >
                      <span>Save Changes</span>
                    </button>
                  );
                })()}

                <button 
                  onClick={() => {
                    if (activeTicketInspector) {
                      handleDeleteTicket(activeTicketInspector.id);
                    } else if (activeUserInspector) {
                      handleDeleteUser(activeUserInspector.id);
                    }
                  }}
                  className="w-full py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold rounded-lg text-center flex items-center justify-center cursor-pointer text-xs transition-colors"
                >
                  <span>Delete Record Row</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. ASK AI FLOATING COPILOT SIDE BAR */}
          {isAiPanelOpen && (
            <div className="absolute top-0 right-0 h-full w-full sm:w-80 bg-white border-l border-blue-100 shadow-2xl z-30 flex flex-col justify-between transition-transform animate-[slideIn_0.2s_ease-out]">
              <div className="p-4 border-b border-blue-100 bg-blue-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-800">
                    <Sparkles className="w-4 h-4 text-[#1b3bb6] fill-[#1b3bb6] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Neon Ask AI Coprocessor</span>
                  </div>
                  <button 
                    onClick={() => setIsAiPanelOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-blue-100/30 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-blue-700/80 mt-1">Run conversational natural language updates directly against table records.</p>
              </div>

              {/* Chat replies */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {aiReplies.map((chat, idx) => (
                  <div key={idx} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider mb-0.5">
                      {chat.sender === 'user' ? 'You' : 'Neon Copilot'}
                    </span>
                    <div className={`p-3 rounded-2xl max-w-[90%] leading-relaxed font-sans
                      ${chat.sender === 'user' 
                        ? 'bg-[#1b3bb6] text-white' 
                        : 'bg-slate-50 border border-slate-100 text-slate-700'}`}>
                      {chat.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions panel */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-col gap-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Suggested queries</span>
                <div className="flex flex-wrap gap-1">
                  <button 
                    onClick={() => {
                      setAiMessage("Auto-complete processing tickets");
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-[10px] font-medium cursor-pointer"
                  >
                    ⚡ Auto-complete tickets
                  </button>
                  <button 
                    onClick={() => {
                      setAiMessage("Generate dummy client record");
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-[10px] font-medium cursor-pointer"
                  >
                    ⚡ Ingest dummy ticket
                  </button>
                  <button 
                    onClick={() => {
                      setAiMessage("Count client users");
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-[10px] font-medium cursor-pointer"
                  >
                    📊 Count active clients
                  </button>
                </div>
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleAiCommand} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Ask companion or enter action..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:border-[#1b3bb6] focus:ring-1 focus:ring-[#1b3bb6]/20 outline-none"
                />
                <button 
                  type="submit" 
                  className="px-3 bg-[#1b3bb6] hover:bg-[#16309c] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          )}



        </main>
      </div>

    </div>
  );
}
