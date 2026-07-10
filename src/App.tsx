import React, { useState, useEffect } from 'react';
import { AppView, Ticket, UserAccount } from './types';
import AuthPortal from './components/AuthPortal';
import AgentDashboard from './components/AgentDashboard';
import ClientSimulator from './components/ClientSimulator';

export default function App() {
  const [view, setView] = useState<AppView>(() => {
    // Detect initial route
    if (
      window.location.pathname === '/tickets/simulate-test' || 
      window.location.hash === '#/tickets/simulate-test'
    ) {
      return 'client-simulator';
    }
    return 'auth';
  });

  const [userEmail, setUserEmail] = useState<string>('');

  // Lifted state for Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Lifted state for User Accounts
  const [users, setUsers] = useState<UserAccount[]>([]);

  // Lifted pending changes states to prevent background poll overwrites
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<number, 'CREATED' | 'PROCESSING' | 'COMPLETED'>>({});
  const [pendingUserRoleChanges, setPendingUserRoleChanges] = useState<Record<number, 'CLIENT' | 'AGENT'>>({});

  // Selection states lifted from AgentDashboard to allow safe preservation of current ticket/user properties
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Use refs to access latest pending changes and current selections inside polling setInterval to avoid stale closures
  const pendingStatusChangesRef = React.useRef(pendingStatusChanges);
  pendingStatusChangesRef.current = pendingStatusChanges;

  const pendingUserRoleChangesRef = React.useRef(pendingUserRoleChanges);
  pendingUserRoleChangesRef.current = pendingUserRoleChanges;

  const selectedTicketIdRef = React.useRef(selectedTicketId);
  selectedTicketIdRef.current = selectedTicketId;

  const selectedUserIdRef = React.useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;

  const ticketsRef = React.useRef(tickets);
  ticketsRef.current = tickets;

  const usersRef = React.useRef(users);
  usersRef.current = users;

  const lastManualUpdateRef = React.useRef(0);

  // Single-use helper to completely refresh tables after a save (clears active transitions with latest DB state)
  const refreshData = async () => {
    lastManualUpdateRef.current = Date.now();
    try {
      const response = await fetch('/api/tickets');
      const data = await response.json();
      if (data.success && Array.isArray(data.tickets)) {
        const mapped = data.tickets.map((t: any) => ({
          id: t.id,
          ticketRef: t.ticketRef,
          title: t.title,
          description: t.description,
          status: t.status,
          dbStatus: t.status,
          reportType: t.reportType,
          submittedByEmail: t.submittedBy?.email,
          submittedByName: t.submittedBy?.name,
          creationDate: t.creationDate,
          updatedDate: t.updatedDate,
          trackingToken: t.trackingToken
        }));
        setTickets(mapped);
      }
    } catch (e) {
      console.warn("Failed to refresh tickets:", e);
    }

    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        const mapped = data.users.map((u: any) => ({
          id: u.id,
          userRef: u.userRef,
          name: u.name,
          email: u.email,
          role: u.role,
          dbRole: u.role,
          password: u.password
        }));
        setUsers(mapped);
      }
    } catch (e) {
      console.warn("Failed to refresh users:", e);
    }
  };

  // Sync tickets and users with Postgres backend upon mount and poll for real-time changes
  useEffect(() => {
    const fetchBackendData = async () => {
      const startTime = Date.now();
      try {
        const response = await fetch('/api/tickets');
        const data = await response.json();
        if (startTime < lastManualUpdateRef.current) {
          return;
        }
        if (data.success && Array.isArray(data.tickets)) {
          const mapped = data.tickets.map((t: any) => {
            const localTicket = ticketsRef.current.find((lt: any) => Number(lt.id) === Number(t.id));
            const hasPendingStatus = pendingStatusChangesRef.current[t.id] !== undefined || pendingStatusChangesRef.current[String(t.id)] !== undefined;
            const isSelected = Number(selectedTicketIdRef.current) === Number(t.id);
            // If ticket is currently selected (or has pending status changes), preserve active client-side properties
            if (localTicket && (hasPendingStatus || isSelected)) {
              const pendingStatus = pendingStatusChangesRef.current[t.id] || pendingStatusChangesRef.current[String(t.id)];
              return {
                id: t.id,
                ticketRef: t.ticketRef,
                title: localTicket.title,
                description: localTicket.description,
                status: pendingStatus !== undefined ? pendingStatus : t.status,
                dbStatus: t.status,
                reportType: t.reportType,
                submittedByEmail: t.submittedBy?.email,
                submittedByName: t.submittedBy?.name,
                creationDate: t.creationDate,
                updatedDate: t.updatedDate,
                trackingToken: t.trackingToken
              };
            }
            const pendingStatus = pendingStatusChangesRef.current[t.id] || pendingStatusChangesRef.current[String(t.id)];
            return {
              id: t.id,
              ticketRef: t.ticketRef,
              title: t.title,
              description: t.description,
              status: pendingStatus !== undefined ? pendingStatus : t.status,
              dbStatus: t.status,
              reportType: t.reportType,
              submittedByEmail: t.submittedBy?.email,
              submittedByName: t.submittedBy?.name,
              creationDate: t.creationDate,
              updatedDate: t.updatedDate,
              trackingToken: t.trackingToken
            };
          });
          setTickets(mapped);
        }
      } catch (e) {
        console.warn("Backend API offline or not ready. Falling back to local state.", e);
      }

      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (startTime < lastManualUpdateRef.current) {
          return;
        }
        if (data.success && Array.isArray(data.users)) {
          const mapped = data.users.map((u: any) => {
            const localUser = usersRef.current.find((lu: any) => Number(lu.id) === Number(u.id));
            const hasPendingRole = pendingUserRoleChangesRef.current[u.id] !== undefined || pendingUserRoleChangesRef.current[String(u.id)] !== undefined;
            const isSelected = Number(selectedUserIdRef.current) === Number(u.id);
            // If user row is actively selected, preserve name, email, and password during input session
            if (localUser && (hasPendingRole || isSelected)) {
              const pendingRole = pendingUserRoleChangesRef.current[u.id] || pendingUserRoleChangesRef.current[String(u.id)];
              return {
                id: u.id,
                userRef: u.userRef,
                name: localUser.name,
                email: localUser.email,
                role: pendingRole !== undefined ? pendingRole : localUser.role,
                dbRole: u.role,
                password: localUser.password
              };
            }
            const pendingRole = pendingUserRoleChangesRef.current[u.id] || pendingUserRoleChangesRef.current[String(u.id)];
            return {
              id: u.id,
              userRef: u.userRef,
              name: u.name,
              email: u.email,
              role: pendingRole !== undefined ? pendingRole : u.role,
              dbRole: u.role,
              password: u.password
            };
          });
          setUsers(mapped);
        }
      } catch (e) {
        console.warn("Backend API offline or not ready. Falling back to local state.", e);
      }
    };
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 3000);
    return () => clearInterval(interval);
  }, []);



  // Sync back & forward path history manually for a nice experience
  useEffect(() => {
    const handleLocationChange = () => {
      if (
        window.location.pathname === '/tickets/simulate-test' ||
        window.location.hash === '#/tickets/simulate-test'
      ) {
        setView('client-simulator');
      } else if (view === 'client-simulator') {
        setView(userEmail ? 'agent-dashboard' : 'auth');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [view, userEmail]);

  const handleAuthSuccess = (email: string, signUpName?: string, role?: 'CLIENT' | 'AGENT', isSignUp?: boolean) => {
    setUserEmail(email);
    
    // Automatically register or update the user in the database list
    setUsers(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        if (signUpName) {
          return prev.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, name: signUpName, role: role || u.role } : u);
        }
        if (role) {
          return prev.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, role } : u);
        }
        return prev;
      }
      
      const nextId = prev.length > 0 ? Math.max(...prev.map(u => u.id)) + 1 : 1;
      const userHex = Math.random().toString(16).substring(2, 10).toUpperCase();
      const userRef = `USR-${userHex}`;
      
      const name = signUpName || email.split('@')[0];
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      
      const resolvedRole = role || (email.toLowerCase() === 'admin@portal.com' ? 'AGENT' : 'CLIENT');
      
      return [...prev, {
        id: nextId,
        userRef,
        name: capitalizedName,
        email: email,
        role: resolvedRole
      }];
    });

    const isAdmin = email.toLowerCase() === 'admin@portal.com' || role === 'AGENT';

    if (isSignUp || !isAdmin) {
      window.history.pushState(null, '', '/tickets/simulate-test');
      setView('client-simulator');
    } else {
      setView('agent-dashboard');
      if (window.location.pathname === '/tickets/simulate-test') {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const handleSignOut = () => {
    setUserEmail('');
    setView('auth');
    if (window.location.pathname === '/tickets/simulate-test') {
      window.history.pushState(null, '', '/');
    }
  };

  const navigateToSimulator = () => {
    window.history.pushState(null, '', '/tickets/simulate-test');
    setView('client-simulator');
  };

  const navigateToAgentDesk = () => {
    window.history.pushState(null, '', '/');
    setView(userEmail ? 'agent-dashboard' : 'auth');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/25">
      {view === 'auth' && (
        <AuthPortal onSuccess={handleAuthSuccess} onGoToSimulator={navigateToSimulator} />
      )}
      
      {view === 'agent-dashboard' && (
        <AgentDashboard 
          onSignOut={handleSignOut} 
          currentUserEmail={userEmail}
          tickets={tickets}
          setTickets={setTickets}
          users={users}
          setUsers={setUsers}
          pendingStatusChanges={pendingStatusChanges}
          setPendingStatusChanges={setPendingStatusChanges}
          pendingUserRoleChanges={pendingUserRoleChanges}
          setPendingUserRoleChanges={setPendingUserRoleChanges}
          selectedTicketId={selectedTicketId}
          setSelectedTicketId={setSelectedTicketId}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          refreshData={refreshData}
        />
      )}

      {view === 'client-simulator' && (
        <ClientSimulator
          tickets={tickets}
          setTickets={setTickets}
          users={users}
          setUsers={setUsers}
          onGoToAgent={navigateToAgentDesk}
          currentUserEmail={userEmail}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
