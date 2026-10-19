import { useState, useEffect } from 'react';
import { Sidebar } from './features/navigation/Sidebar.jsx';
import { TopBar } from './features/navigation/TopBar.jsx';
import { Dashboard } from './features/dashboard/Dashboard.jsx';
import { CallsToMake } from './features/calls/CallsToMake.jsx';
import { IncomingCalls } from './features/calls/IncomingCalls.jsx';
import { RecentCalls } from './features/calls/RecentCalls.jsx';
import { CalendarView } from './features/calendar/CalendarView.jsx';
import { PulseView } from './features/pulse/PulseView.jsx';
import { OutcomeModal } from './features/calls/OutcomeModal.jsx';
import { LeadModal } from './features/calls/LeadModal.jsx';
import { AICallModal } from './features/calls/AICallModal.jsx';
import { useLeads } from './data/hooks.js';
import { startPending, peekPending, markHidden, takePending, MIN_AWAY_MS, MAX_AGE_MS } from './utils/pendingCall.js';

import './styles/styles.css';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeOutcomeTask, setActiveOutcomeTask] = useState(null);
  const [activeLeadDossier, setActiveLeadDossier] = useState(null);
  const [activeAICallLead, setActiveAICallLead] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const leads = useLeads();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle call initiation (click on tel: link or quick dial)
  const handleInitiateCall = (task) => {
    startPending(task);
    showToast(`Calling ${task.name || task.phone} - log the outcome when you're back`);
  };

  const handleOpenAICall = (leadOrTask) => {
    setActiveAICallLead(leadOrTask || leads[0] || { name: 'Direct Lead', product: 'Ortho GRID Mattress' });
  };

  // Listen for global call events
  useEffect(() => {
    const onVisibility = () => {
      const pending = peekPending();
      if (!pending) return;
      if (document.visibilityState === 'hidden') return markHidden();
      const away = pending.hiddenAt ? Date.now() - pending.hiddenAt : 0;
      const fresh = Date.now() - pending.startedAt < MAX_AGE_MS;
      takePending();
      if (fresh && away >= MIN_AWAY_MS) setActiveOutcomeTask(pending.task);
    };

    const onRequestOutcome = (e) => setActiveOutcomeTask(e.detail);
    const onRequestAICall = (e) => handleOpenAICall(e.detail);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('oncall:open-outcome', onRequestOutcome);
    window.addEventListener('oncall:open-ai-call', onRequestAICall);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('oncall:open-outcome', onRequestOutcome);
      window.removeEventListener('oncall:open-ai-call', onRequestAICall);
    };
  }, [leads]);

  return (
    <div className="app-shell">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenAIPractice={() => handleOpenAICall(leads[0])}
      />

      <main className="main-content">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShowToast={showToast}
        />

        {currentView === 'dashboard' && (
          <Dashboard
            onInitiateCall={handleInitiateCall}
            onLogOutcome={setActiveOutcomeTask}
            onOpenAIPractice={handleOpenAICall}
            onViewChange={setCurrentView}
            onShowToast={showToast}
          />
        )}

        {currentView === 'calls' && (
          <CallsToMake
            onInitiateCall={handleInitiateCall}
            onSelectLead={setActiveLeadDossier}
            onOpenAIPractice={handleOpenAICall}
            onShowToast={showToast}
          />
        )}

        {currentView === 'incoming' && (
          <IncomingCalls
            onInitiateCall={handleInitiateCall}
            onLogOutcome={setActiveOutcomeTask}
            onOpenAIPractice={handleOpenAICall}
            onShowToast={showToast}
          />
        )}

        {currentView === 'recent' && <RecentCalls />}

        {currentView === 'calendar' && (
          <CalendarView
            fullPage
            onInitiateCall={handleInitiateCall}
            onLogOutcome={setActiveOutcomeTask}
            onOpenAIPractice={handleOpenAICall}
            onShowToast={showToast}
          />
        )}

        {currentView === 'pulse' && <PulseView />}
      </main>

      {/* MODALS */}
      {activeOutcomeTask && (
        <OutcomeModal
          task={activeOutcomeTask}
          onClose={() => setActiveOutcomeTask(null)}
          onShowToast={showToast}
        />
      )}

      {activeLeadDossier && (
        <LeadModal
          lead={activeLeadDossier}
          leadsList={leads}
          onSelectLead={setActiveLeadDossier}
          onClose={() => setActiveLeadDossier(null)}
          onInitiateCall={handleInitiateCall}
        />
      )}

      {activeAICallLead && (
        <AICallModal
          lead={activeAICallLead}
          onClose={() => setActiveAICallLead(null)}
          onShowToast={showToast}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
