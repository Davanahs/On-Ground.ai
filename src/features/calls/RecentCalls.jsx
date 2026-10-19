import { useState } from 'react';
import { useCalls } from '../../data/hooks.js';

export function RecentCalls() {
  const calls = useCalls();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getPillClass = (type) => {
    if (type === 'Missed') return 'pill-missed';
    if (type === 'AI Call' || type === 'AI Practice' || type === 'AI Browser Call' || type === 'AI Phone Call (PSTN)') return 'pill-ai';
    if (type === 'Follow-up') return 'pill-followup';
    return 'pill-completed';
  };

  return (
    <div className="recent-calls-container glass-card">
      <div className="section-header">
        <div>
          <h3>Recent Call History & Automatic AI Summaries</h3>
          <p className="section-subtitle">
            All calls are automatically analyzed for customer needs, buying signals, and full transcripts.
          </p>
        </div>
        <span className="section-count">{calls.length} logged sessions</span>
      </div>

      {calls.length === 0 ? (
        <div className="empty-section-msg">No calls recorded yet. Complete a call above to view stored logs!</div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="table-wrapper desktop-only-table">
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
                        <span className={`pill ${getPillClass(c.type)}`}>
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

          {/* MOBILE STRUCTURED CARDS VIEW */}
          <div className="mobile-recent-cards-list">
            {calls.map((c) => {
              const isExpanded = expandedId === c.id;
              const hasTranscript = c.transcript && c.transcript.length > 0;

              return (
                <div key={c.id} className="mobile-call-record-card glass-card">
                  <div className="mobile-record-header" onClick={() => toggleExpand(c.id)}>
                    <div className="mobile-record-caller">
                      <h4 className="caller-name">{c.leadName || 'Contact'}</h4>
                      <span className="caller-phone">{c.phone}</span>
                    </div>
                    <span className={`pill ${getPillClass(c.type)}`}>{c.type}</span>
                  </div>

                  <div className="mobile-record-meta">
                    <span>🕒 {c.timestamp || 'Today'}</span>
                    <span>⏱️ {c.duration || '00:30'}</span>
                  </div>

                  <p className="mobile-record-note">
                    {c.summary || c.note || 'Call completed and logged.'}
                  </p>

                  <button
                    type="button"
                    className="mobile-expand-btn btn btn-secondary btn-sm w-full"
                    onClick={() => toggleExpand(c.id)}
                  >
                    {isExpanded ? '▲ Hide AI Summary & Transcript' : '▼ View AI Summary & Transcript'}
                  </button>

                  {isExpanded && (
                    <div className="mobile-expanded-content">
                      <div className="insight-chip-block">
                        <b>Customer Needs:</b>
                        <span>{(c.needs || ['General inquiry']).join(', ')}</span>
                      </div>

                      {c.buyingSignals && c.buyingSignals.length > 0 && (
                        <div className="insight-chip-block">
                          <b>Buying Signals:</b>
                          <span>{c.buyingSignals.join(', ')}</span>
                        </div>
                      )}

                      {c.suggestedNextAction && (
                        <div className="insight-chip-block highlight">
                          <b>Next Action:</b>
                          <span>{c.suggestedNextAction}</span>
                        </div>
                      )}

                      {hasTranscript && (
                        <div className="mobile-transcript-box">
                          <h5>Line-by-Line Transcript</h5>
                          {c.transcript.map((line, idx) => (
                            <div
                              key={idx}
                              className={`transcript-bubble ${line.startsWith('Agent') ? 'agent' : 'customer'}`}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
