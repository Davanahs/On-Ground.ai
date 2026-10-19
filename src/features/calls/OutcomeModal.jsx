import { useState } from 'react';
import { db } from '../../data/db.js';
import { tomorrowStr } from '../../data/seed.js';

export function OutcomeModal({ task, onClose, onShowToast }) {
  const [outcome, setOutcome] = useState('spoke_followup'); // 'spoke_followup' | 'spoke_done' | 'no_answer'
  const [dueDate, setDueDate] = useState(tomorrowStr);
  const [note, setNote] = useState('');

  if (!task) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (outcome === 'spoke_followup' && !dueDate) {
      alert('Please select a due date for the follow-up.');
      return;
    }

    db.logCallOutcome(task.id, {
      outcome,
      note,
      dueDate,
      fallbackTask: task
    });

    if (onShowToast) {
      const msg =
        outcome === 'spoke_done'
          ? 'Task marked as Completed!'
          : outcome === 'spoke_followup'
          ? 'Task updated to Follow-up!'
          : 'Recorded No Answer. Task rescheduled for tomorrow.';
      onShowToast(msg);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Call Outcome — {task.name}</h3>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            aria-label="Close call outcome sheet"
          >
            ✕
          </button>
        </div>

        <p className="task-subinfo">
          Phone: {task.phone} &bull; Product: {task.product}
        </p>

        <form onSubmit={handleSubmit} className="outcome-form">
          <div className="form-group">
            <label className="form-label">Call Result</label>
            <div className="outcome-options">
              <label className={`outcome-chip ${outcome === 'spoke_followup' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="outcome"
                  value="spoke_followup"
                  checked={outcome === 'spoke_followup'}
                  onChange={() => setOutcome('spoke_followup')}
                />
                <span>💬 Spoke — Follow-up needed</span>
              </label>

              <label className={`outcome-chip ${outcome === 'spoke_done' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="outcome"
                  value="spoke_done"
                  checked={outcome === 'spoke_done'}
                  onChange={() => setOutcome('spoke_done')}
                />
                <span>✅ Spoke — All done</span>
              </label>

              <label className={`outcome-chip ${outcome === 'no_answer' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="outcome"
                  value="no_answer"
                  checked={outcome === 'no_answer'}
                  onChange={() => setOutcome('no_answer')}
                />
                <span>📵 No answer / Unreachable</span>
              </label>
            </div>
          </div>

          {outcome === 'spoke_followup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="due-date-input">Next Follow-up Due Date *</label>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="note-input">Call Notes & Summary</label>
            <textarea
              id="note-input"
              rows="3"
              placeholder={
                outcome === 'spoke_followup'
                  ? 'E.g. Discussed 0% EMI pricing, send quote on WhatsApp...'
                  : outcome === 'spoke_done'
                  ? 'E.g. Order placed successfully, payment received...'
                  : 'E.g. Phone rang out, attempt #2...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              aria-label="Cancel call outcome logging"
            >
              Didn't call / Cancel
            </button>
            <button
              type="submit"
              className="btn btn-green"
              aria-label="Save call outcome"
            >
              Save Outcome
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
