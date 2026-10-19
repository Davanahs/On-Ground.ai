import { localDateStr } from '../../utils/date.js';
import { useState } from 'react';
import { useTasks } from '../../data/hooks.js';
import { TaskCard } from '../dashboard/TaskCard.jsx';

export function CalendarView({ onInitiateCall, onLogOutcome, onOpenAIPractice, onShowToast, fullPage = false }) {
  const tasks = useTasks();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => localDateStr());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // First day of month (0 = Sun, 1 = Mon...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  const todayStr = localDateStr();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(localDateStr(now));
  };

  // Map pending tasks by dueDate
  const pendingTasksByDate = {};
  tasks.forEach((t) => {
    if (t.type !== 'completed' && t.dueDate) {
      if (!pendingTasksByDate[t.dueDate]) pendingTasksByDate[t.dueDate] = [];
      pendingTasksByDate[t.dueDate].push(t);
    }
  });

  // Selected date's tasks (all tasks including completed)
  const selectedDateTasks = tasks.filter((t) => t.dueDate === selectedDateStr);

  const monthLabel = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={`calendar-view-container ${fullPage ? 'full-page' : ''}`}>
      <div className="calendar-card glass-card">
        <div className="calendar-header">
          <h3>Calendar Schedule</h3>
          <div className="calendar-controls">
            <button
              className="btn btn-secondary btn-icon"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="calendar-month-title">{monthLabel}</span>
            <button
              className="btn btn-secondary btn-icon"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              ›
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleToday}
              aria-label="Jump to Today"
            >
              Today
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="cal-day-header">
              {d}
            </div>
          ))}

          {/* Empty padding cells before 1st of month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="cal-day-cell empty" />
          ))}

          {/* Days of month */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            // Format YYYY-MM-DD
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(dayNum).padStart(2, '0');
            const dateValStr = `${year}-${mStr}-${dStr}`;

            const isToday = dateValStr === todayStr;
            const isSelected = dateValStr === selectedDateStr;
            const hasPendingTasks = !!pendingTasksByDate[dateValStr];

            return (
              <button
                key={dayNum}
                className={`cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDateStr(dateValStr)}
                aria-label={`Select date ${dateValStr}`}
              >
                <span className="day-number">{dayNum}</span>
                {hasPendingTasks && (
                  <span className="task-dot" title="Pending tasks due on this date" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Task List Detail Pane */}
      <div className="selected-date-tasks glass-card">
        <h4>Tasks Due On {selectedDateStr} ({selectedDateTasks.length})</h4>
        {selectedDateTasks.length === 0 ? (
          <p className="no-tasks-text">No tasks scheduled for {selectedDateStr}.</p>
        ) : (
          <div className="calendar-task-list">
            {selectedDateTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onInitiateCall={onInitiateCall}
                onLogOutcome={onLogOutcome}
                onOpenAIPractice={onOpenAIPractice}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
