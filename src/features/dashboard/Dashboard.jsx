import { useTasks } from '../../data/hooks.js';
import { TaskSection } from './TaskSection.jsx';
import { KPIs } from './KPIs.jsx';
import { PerformanceChart } from './PerformanceChart.jsx';
import { QuickCall } from '../calls/QuickCall.jsx';
import { CalendarView } from '../calendar/CalendarView.jsx';

export function Dashboard({ onInitiateCall, onLogOutcome, onOpenAIPractice, onViewChange, onQuickDial, onShowToast }) {
  const tasks = useTasks();

  return (
    <div className="dashboard-container">
      <div className="dashboard-main-col">
        <div className="dashboard-welcome">
          <h2>Dashboard</h2>
          <p className="subtitle">
            Welcome back, <b>John Doe</b>. Here are your call tasks grouped by priority for today.
          </p>
        </div>

        <KPIs />

        {/* 3 CLEARLY SEPARATE TASK SECTIONS AS REQUIRED */}
        <div className="task-sections-stack">
          {/* SECTION 1: MISSED CALLS */}
          <TaskSection
            title="1. Missed Calls (Not Yet Returned)"
            icon="🚨"
            tasks={tasks}
            type="missed"
            onInitiateCall={onInitiateCall}
            onLogOutcome={onLogOutcome}
            onOpenAIPractice={onOpenAIPractice}
            onShowToast={onShowToast}
          />

          {/* SECTION 2: FOLLOW-UPS */}
          <TaskSection
            title="2. Follow-ups (Spoke, Next Step Pending)"
            icon="⌛"
            tasks={tasks}
            type="followup"
            onInitiateCall={onInitiateCall}
            onLogOutcome={onLogOutcome}
            onOpenAIPractice={onOpenAIPractice}
            onShowToast={onShowToast}
          />

          {/* SECTION 3: COMPLETED */}
          <TaskSection
            title="3. Completed Tasks"
            icon="✅"
            tasks={tasks}
            type="completed"
            onInitiateCall={onInitiateCall}
            onLogOutcome={onLogOutcome}
            onOpenAIPractice={onOpenAIPractice}
            onShowToast={onShowToast}
          />
        </div>

        <PerformanceChart />
      </div>

      <div className="dashboard-side-col">
        <QuickCall
          onQuickDial={onQuickDial}
          onOpenAIPractice={onOpenAIPractice}
          onViewChange={onViewChange}
          onShowToast={onShowToast}
        />
        <CalendarView
          onInitiateCall={onInitiateCall}
          onLogOutcome={onLogOutcome}
          onOpenAIPractice={onOpenAIPractice}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
}
