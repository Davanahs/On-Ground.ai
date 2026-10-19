import { useState } from 'react';
import { useCalls } from '../../data/hooks.js';

export function RecentCalls() {
  const calls = useCalls();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="recent-calls-container glass-card">
      <div className="section-header">
        <h3>Recent Call History & Automatic AI Summaries</h3>
        <span className="section-count">{calls.length} logged sessions</span>
      </div>

      {calls.length === 0 ? (
        <div className="empty-section-msg">No calls recorded yet.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Caller / Contact</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Notes & AI Insights</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const isExpanded = expandedId === c.id;
                const hasTranscript = c.transcript && c.transcript.length > 0;

                return (
                  <tr
                    key={c.id}
                    className={`table-row clickable ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleExpand(c.id)}
                  >
                    <td>
                      <span
                        className={`pill ${
                          c.type === 'Missed'
                            ? 'pill-missed'
                            : c.type === 'AI Call' || c.type === 'AI Practice'
                            ? 'pill-ai'
                            : c.type === 'Follow-up'
                            ? 'pill-followup'
                            : 'pill-completed'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="font-semibold">
                      {c.leadName || c.phone}
                      <br />
                      <span className="text-muted text-xs">{c.phone}</span>
                    </td>
                    <td>{c.timestamp}</td>
                    <td>{c.duration}</td>
                    <td>
                      <div className="recent-note-row">
                        <span>{c.summary || c.note || 'No notes'}</span>
                        <span className="transcript-badge">
                          {isExpanded ? '▲ Hide Details' : '▼ View AI Summary & Transcript'}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="insights-panel glass-card" onClick={(e) => e.stopPropagation()}>
                          <div className="insights-grid">
                            <div className="insight-block">
                              <h5>📝 Call Summary</h5>
                              <p>{c.summary || c.note || 'Session logged.'}</p>
                            </div>

                            <div className="insight-block">
                              <h5>💡 Customer Needs</h5>
                              <ul>
                                {(c.needs || ['General inquiry']).map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="insight-block">
                              <h5>🚀 Buying Signals & Objections</h5>
                              <p>
                                <b>Signals:</b> {(c.buyingSignals || []).join(', ') || 'None'}
                              </p>
                              <p>
                                <b>Objections:</b> {(c.objections || []).join(', ') || 'None'}
                              </p>
                            </div>

                            <div className="insight-block">
                              <h5>➡️ Suggested Next Action</h5>
                              <p>{c.suggestedNextAction || 'Follow up with lead.'}</p>
                              {c.dueDate && <p className="text-xs text-muted">Due date: {c.dueDate}</p>}
                            </div>
                          </div>

                          {hasTranscript && (
                            <div className="transcript-box">
                              <h5>Line-by-Line Transcript</h5>
                              {c.transcript.map((line, idx) => (
                                <div key={idx} className="transcript-line">
                                  {line}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
