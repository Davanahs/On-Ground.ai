import { useTasks } from '../../data/hooks.js';
import { CallActions } from './CallActions.jsx';

export function IncomingCalls({ onInitiateCall, onLogOutcome, onOpenAIPractice, onShowToast }) {
  const tasks = useTasks();
  const missedTasks = tasks.filter((t) => t.type === 'missed');

  const totalValue = missedTasks.reduce((acc, t) => acc + (t.value || 0), 0);

  const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN');

  const copyNumber = (phone) => {
    navigator.clipboard.writeText(phone);
    if (onShowToast) onShowToast(`Copied ${phone} to clipboard!`);
  };

  return (
    <div className="incoming-calls-container glass-card">
      <div className="section-header">
        <div>
          <h3>Incoming / Missed Calls</h3>
          <p className="section-subtitle">
            <b>{missedTasks.length} pending callbacks</b> &bull; Total potential revenue: <b>{formatINR(totalValue)}</b>
          </p>
        </div>
      </div>

      {missedTasks.length === 0 ? (
        <div className="empty-section-msg">
          <p>🎉 All incoming calls have been returned!</p>
        </div>
      ) : (
        <div className="incoming-list">
          {missedTasks.map((task) => (
            <div key={task.id} className="incoming-card glass-card">
              <div className="incoming-info">
                <div className="caller-row">
                  <h4 className="caller-name">{task.name}</h4>
                  <span className="caller-phone">{task.phone}</span>
                </div>
                <div className="caller-meta">
                  <span>Product: {task.product}</span> &bull; <span>Value: {formatINR(task.value)}</span> &bull;{' '}
                  <span className="attempts-text">Attempts: {task.attempts || 1}</span>
                </div>
                {task.note && <p className="incoming-note">“{task.note}”</p>}
              </div>

              <div className="incoming-actions-stack">
                <CallActions
                  customerPhone={task.phone}
                  customerName={task.name}
                  task={task}
                  onOpenOutcome={onLogOutcome}
                  onOpenAIPractice={onOpenAIPractice}
                  onShowToast={onShowToast}
                />

                <div className="incoming-aux-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyNumber(task.phone)}
                    aria-label={`Copy phone number for ${task.name}`}
                  >
                    📋 Copy Number
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onLogOutcome(task)}
                    aria-label={`Log outcome for ${task.name}`}
                  >
                    📝 Log Outcome
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
