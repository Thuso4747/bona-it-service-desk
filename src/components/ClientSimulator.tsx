import React, { useState, useEffect } from 'react';
import { Ticket, UserAccount } from '../types';
import { Mail, CheckCircle, ArrowRight, Database, Sparkles, LayoutDashboard, ChevronDown, Clock, RefreshCw, AlertCircle, ArrowLeft, LogOut, Search, X } from 'lucide-react';

interface ClientSimulatorProps {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  onGoToAgent: () => void;
  currentUserEmail?: string;
  onSignOut?: () => void;
}

// Helpers to cleanly parse subject and body, eliminating any "OTHER" fallback confusion for older / legacy formats
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

export default function ClientSimulator({
  tickets,
  setTickets,
  users,
  setUsers,
  onGoToAgent,
  currentUserEmail,
  onSignOut
}: ClientSimulatorProps) {
  // Find currently logged-in user if any
  const loggedInUser = currentUserEmail 
    ? users.find(u => u.email.toLowerCase() === currentUserEmail.toLowerCase()) 
    : null;

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('Complaint');
  const [body, setBody] = useState('');
  
  // Sync name and email automatically upon sign-in/sign-up when loggedInUser changes
  useEffect(() => {
    if (loggedInUser) {
      setSenderName(loggedInUser.name);
      setSenderEmail(loggedInUser.email);
    } else {
      setSenderName('');
      setSenderEmail('');
    }
  }, [loggedInUser]);

  // Success indicator state
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [activeTab, setActiveTab] = useState<'submit' | 'tickets'>('submit');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [trackingTokenInput, setTrackingTokenInput] = useState('');
  const [trackedTicket, setTrackedTicket] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Filter tickets belonging to the current client email
  const myTickets = tickets.filter(t => 
    t.submittedByEmail?.toLowerCase() === senderEmail.trim().toLowerCase()
  );

  // Show track-by-token feature if they have any tickets in their history
  useEffect(() => {
    if (myTickets.length > 0) {
      setHasSubmitted(true);
    }
  }, [myTickets.length]);

  const handleRefreshTickets = async () => {
    setIsRefreshing(true);
    try {
      const ticketsRes = await fetch('/api/tickets');
      const ticketsData = await ticketsRes.json();
      if (ticketsData.success && Array.isArray(ticketsData.tickets)) {
        const mapped = ticketsData.tickets.map((t: any) => ({
          id: t.id,
          ticketRef: t.ticketRef,
          title: t.title,
          description: t.description,
          status: t.status,
          reportType: t.reportType,
          submittedByEmail: t.submittedBy?.email,
          submittedByName: t.submittedBy?.name
        }));
        setTickets(mapped);
      }
    } catch (e) {
      console.warn("Could not fetch fresh tickets", e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCheckStatus = async () => {
    if (!trackingTokenInput.trim()) return;
    setIsCheckingStatus(true);
    setTrackError('');
    setTrackedTicket(null);
    try {
      const response = await fetch(`/api/tickets/status/${trackingTokenInput.trim()}`);
      const data = await response.json();
      if (data.success) {
        setTrackedTicket(data);
      } else {
        setTrackError(data.message || "Ticket not found for this token.");
      }
    } catch (e) {
      setTrackError("Failed to check ticket status. Please check your connection.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !body.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: senderName.trim(),
          email: senderEmail.trim(),
          title: subject.trim(),
          issue: body.trim(),
          description: body.trim(),
          reportType: subject.toUpperCase()
        })
      });

      const data = await response.json();
      if (data.success) {
        // Fetch fresh tickets and users from backend to stay in absolute perfect sync
        const ticketsRes = await fetch('/api/tickets');
        const ticketsData = await ticketsRes.json();
        if (ticketsData.success && Array.isArray(ticketsData.tickets)) {
          const mapped = ticketsData.tickets.map((t: any) => ({
            id: t.id,
            ticketRef: t.ticketRef,
            title: t.title,
            description: t.description,
            status: t.status,
            reportType: t.reportType,
            submittedByEmail: t.submittedBy?.email,
            submittedByName: t.submittedBy?.name
          }));
          setTickets(mapped);
        }

        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (usersData.success && Array.isArray(usersData.users)) {
          const mapped = usersData.users.map((u: any) => ({
            id: u.id,
            userRef: u.userRef,
            name: u.name,
            email: u.email,
            role: u.role
          }));
          setUsers(mapped);
        }

        setIsSubmittedSuccessfully(true);
        setHasSubmitted(true);
        setTimeout(() => setIsSubmittedSuccessfully(false), 2000);

        // Reset non-user fields
        setSubject('Complaint');
        setBody('');
      } else {
        alert(data.message || "Failed to submit ticket.");
      }
    } catch (err) {
      console.error("Backend submission failed:", err);
      alert("Error: Backend offline or connection failed.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-start font-sans relative px-4 select-none animate-fade-in py-12">
      
      <div className="w-full max-w-2xl mx-auto font-sans">
        
        {/* Title area matches user request exactly */}
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-[#1b3bb6] tracking-tight">
            Bona IT Ticket Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Submit support tickets and track their real-time resolution status
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit mx-auto border border-slate-200/50">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-white text-[#1b3bb6] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Submit a Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'tickets'
                ? 'bg-white text-[#1b3bb6] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>View my tickets</span>
          </button>
        </div>

        {activeTab === 'submit' ? (
          <div className="space-y-6">
            {/* Logged in indicator & Sign Out on form */}
            {currentUserEmail && onSignOut && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-lg text-xs">
                <span className="text-slate-600 font-medium">
                  Logged in as <strong className="text-slate-800">{currentUserEmail}</strong>
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="font-bold text-red-600 hover:text-red-700 hover:underline transition-all cursor-pointer"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Input Form Box */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sender Name</label>
                <input
                  type="text"
                  required
                  placeholder="Sender Name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b3bb6] focus:ring-2 focus:ring-[#1b3bb6]/5 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sender Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Sender Email Address"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b3bb6] focus:ring-2 focus:ring-[#1b3bb6]/5 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Subject</label>
                <div className="relative">
                  <select
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-[#1b3bb6] focus:ring-2 focus:ring-[#1b3bb6]/5 transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="Complaint">Complaint</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Suggestion">Suggestion</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Body Text Content</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Email Body Text Content"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b3bb6] focus:ring-2 focus:ring-[#1b3bb6]/5 transition-all shadow-sm resize-none"
                />
              </div>

              {/* Submit Action Button matches user request exactly */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittedSuccessfully}
                  className={`w-full py-3 px-6 font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all duration-150 text-center cursor-pointer flex items-center justify-center gap-2 ${
                    isSubmittedSuccessfully
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1b3bb6] hover:bg-[#16309c] active:bg-[#102475] text-white'
                  }`}
                >
                  {isSubmittedSuccessfully ? (
                    <span>Ticket Successfully Submitted</span>
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            {/* Tracking Token Search Panel */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Track Ticket by Token / Reference
              </h4>
              <p className="text-xs text-slate-500">
                Enter tracking token or ticket reference to track ticket details
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste tracking token or TKT-XXXXXX..."
                  value={trackingTokenInput}
                  onChange={(e) => setTrackingTokenInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b3bb6] focus:ring-1 focus:ring-[#1b3bb6]/5 bg-white"
                />
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus || !trackingTokenInput.trim()}
                  className="px-4 py-2 bg-[#1b3bb6] hover:bg-[#16309c] text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCheckingStatus ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span>Track</span>
                </button>
              </div>

              {trackError && (
                <div className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              {trackedTicket && (
                <div className="bg-white border border-slate-100 rounded-lg p-3.5 mt-2 space-y-2.5 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tracking Result</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTrackedTicket(null);
                          setTrackingTokenInput('');
                        }}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded transition-colors cursor-pointer"
                        title="Close tracking"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className={`text-xs font-bold ${
                      trackedTicket.status?.toUpperCase() === 'CREATED' ? 'text-blue-600' :
                      trackedTicket.status?.toUpperCase() === 'PROCESSING' ? 'text-amber-600' :
                      trackedTicket.status?.toUpperCase() === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                      {trackedTicket.status?.toUpperCase() === 'CREATED' ? 'Created' :
                       trackedTicket.status?.toUpperCase() === 'PROCESSING' ? 'Processing' :
                       trackedTicket.status?.toUpperCase() === 'COMPLETED' ? 'Complete' : (trackedTicket.status || 'Created')}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-600">
                    <div>
                      <span className="font-bold text-slate-700">Reference:</span>{' '}
                      <span className="font-mono text-[#1b3bb6] font-bold">{trackedTicket.ticketRef}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Subject:</span>{' '}
                      <span className="text-slate-800 font-medium">{trackedTicket.title}</span>
                    </div>
                    {trackedTicket.creationDate && (
                      <div>
                        <span className="font-bold text-slate-700">Created:</span>{' '}
                        <span>{new Date(trackedTicket.creationDate).toLocaleString()}</span>
                      </div>
                    )}
                    {trackedTicket.updatedDate && (
                      <div>
                        <span className="font-bold text-slate-700">Last Action:</span>{' '}
                        <span>{new Date(trackedTicket.updatedDate).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {myTickets.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-sm font-medium text-slate-600">No tickets found</p>
                <p className="text-xs text-slate-400 mt-1">
                  No tickets have been submitted under <span className="font-semibold text-slate-500">{senderEmail || 'this email address'}</span> yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1b3bb6] hover:underline cursor-pointer"
                >
                  <span>Go submit a ticket now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Ticket Submission History</h3>
                {myTickets.map((ticket) => {
                  const lookupStatus = (ticket.status || '').toUpperCase();
                  const statusColors = {
                    CREATED: { textClass: 'text-blue-600', text: 'Created' },
                    PROCESSING: { textClass: 'text-amber-600', text: 'Processing' },
                    COMPLETED: { textClass: 'text-emerald-600', text: 'Complete' },
                  }[lookupStatus as 'CREATED' | 'PROCESSING' | 'COMPLETED'] || { textClass: 'text-slate-600', text: ticket.status };

                  return (
                    <div key={ticket.id} className="py-5 border-b border-slate-100 space-y-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="text-xs text-slate-500 font-medium space-y-1">
                            <div>
                              <span className="font-bold text-slate-700">Ticket Ref:</span>{' '}
                              <span className="font-mono text-[11px] font-bold text-[#1b3bb6] bg-blue-50 px-2 py-0.5 rounded border border-blue-100/60 inline-block">
                                {ticket.ticketRef}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-700">Email Subject:</span>{' '}
                              <span className="text-slate-800 font-semibold">{getDisplayTitle(ticket)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium self-start mt-0.5 whitespace-nowrap">
                          <span className="font-bold text-slate-700">Status: </span>
                          <span className={`font-bold ${statusColors.textClass}`}>
                            {statusColors.text}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-700">Email Content:</span>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">
                          {cleanDescription(ticket.description)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
