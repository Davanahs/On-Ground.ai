import { useState } from 'react';
import { TaskCard } from './TaskCard.jsx';

export function TaskSection({ title, icon, tasks, type, onInitiateCall, onLogOutcome, onOpenAIPractice, onShowToast, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const filteredTasks = tasks.filter((t) => t.type === type);

  return (
    <div className="task-section-container glass-card">
      <div className="section-header clickable" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="section-title">
          <span className="section-icon">{icon}</span>
          <h3>{title}</h3>
          <span className="section-count">({filteredTasks.length})</span>
        </div>
        <span className="section-toggle-icon">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <>
          {filteredTasks.length === 0 ? (
            <div className="empty-section-msg">
              <p>No {title.toLowerCase()} in queue.</p>
            </div>
          ) : (
            <div className="task-list-grid">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onInitiateCall={onInitiateCall}
                  onLogOutcome={onLogOutcome}
                  onOpenAIPractice={onOpenAIPractice}
                  onShowToast={onShowToast}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

