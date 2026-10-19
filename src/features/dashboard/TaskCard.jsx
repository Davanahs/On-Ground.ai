import { CallActions } from '../calls/CallActions.jsx';

export function TaskCard({ task, onInitiateCall, onLogOutcome, onOpenAIPractice, onShowToast }) {
  const isCompleted = task.type === 'completed';

  const copyNumber = (phone) => {
    navigator.clipboard.writeText(phone);
    if (onShowToast) onShowToast(`Copied ${phone} to clipboard!`);
  };

  const formatINR = (val) => {
    if (!val) return '';
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  return (
    <div className={`task-card glass-card ${isCompleted ? 'completed-card' : ''}`}>
      <div className="task-header">
        <div className="task-lead-info">
          <h4 className="lead-name">{task.name}</h4>
          <span className="lead-phone">{task.phone}</span>
        </div>
        <div className="task-badges">
          {task.type === 'missed' && (
            <span className="pill pill-missed">Missed ({task.attempts || 1}x)</span>
          )}
          {task.type === 'followup' && (
            <span className="pill pill-followup">Follow-up</span>
          )}
          {task.type === 'completed' && (
            <span className="pill pill-completed">Completed</span>
          )}
        </div>
      </div>

      <div className="task-meta">
        <span className="task-product">{task.product}</span>
        {task.value && <span className="task-value">{formatINR(task.value)}</span>}
        <span className="task-due">Due: {task.dueDate}</span>
      </div>

      {task.note && <p className="task-note">“{task.note}”</p>}

      {!isCompleted ? (
        <div className="task-actions-stack">
          <CallActions
            customerPhone={task.phone}
            customerName={task.name}
            task={task}
            onOpenOutcome={onLogOutcome}
            onOpenAIPractice={onOpenAIPractice}
            onShowToast={onShowToast}
            isCompact
          />

          <div className="task-secondary-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => copyNumber(task.phone)}
              aria-label={`Copy phone number for ${task.name}`}
              title="Copy phone number for laptop dialer"
            >
              📋 Copy Number
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onLogOutcome(task)}
              aria-label={`Log call outcome for ${task.name}`}
              title="Log outcome manually"
            >
              📝 Log Outcome
            </button>
          </div>
        </div>
      ) : (
        <div className="task-completed-label">
          <span>✅ Task Finalized</span>
        </div>
      )}
    </div>
  );
}
