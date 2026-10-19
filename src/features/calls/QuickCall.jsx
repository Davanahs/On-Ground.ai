import { useState } from 'react';
import { CallActions } from './CallActions.jsx';
import { localDateStr } from '../../utils/date.js';
import { formatE164, validateE164 } from '../../utils/phone.js';
import { useCalls } from '../../data/hooks.js';
import { db } from '../../data/db.js';

const PRODUCT_OPTIONS = [
  { name: 'Ortho GRID Mattress', value: 120000 },
  { name: 'Smart Adjustable Mattress', value: 98000 },
  { name: 'Ergonomic Recliner', value: 85000 },
  { name: 'Duroflex Pro Comfort', value: 64000 },
  { name: 'Premium Pillow Set', value: 22000 },
  { name: 'General Enquiry', value: 30000 }
];

export function QuickCall({ onQuickDial, onOpenOutcome, onOpenAIPractice, onViewChange, onShowToast }) {
  const calls = useCalls();
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(PRODUCT_OPTIONS[0].name);
  const [note, setNote] = useState('');
  const [alsoSaveLead, setAlsoSaveLead] = useState(true);
  const [expandedCallId, setExpandedCallId] = useState(null);

  const formattedPhone = formatE164(phone);
  const isValid = validateE164(formattedPhone);

  const chosenProductObj = PRODUCT_OPTIONS.find((p) => p.name === selectedProduct) || PRODUCT_OPTIONS[0];

  const effectiveName = customerName.trim() || 'Manual Test Contact';

  // Construct task object for the call
  const currentTask = {
    id: 'test_call_' + Date.now(),
    name: effectiveName,
    phone: formattedPhone || phone.trim(),
    product: chosenProductObj.name,
    value: chosenProductObj.value,
    type: 'missed',
    dueDate: localDateStr(),
    note: note.trim() || 'Manual test call initiated from web dialer'
  };

  const handleSaveAsLead = (e) => {
    e.preventDefault();
    if (!isValid) {
      if (onShowToast) onShowToast('⚠️ Please enter a valid E.164 phone number (+91...)');
      return;
    }

    const lead = db.addLead({
      name: effectiveName,
      phone: formattedPhone,
      product: chosenProductObj.name,
      value: chosenProductObj.value,
      score: 90,
      status: 'High',
      signals: [
        ['Manual Entry', 'Direct contact added through web test dialer'],
        ['Product Interest', chosenProductObj.name]
      ]
    });

    db.addTask({
      leadId: lead.id,
      name: effectiveName,
      phone: formattedPhone,
      product: chosenProductObj.name,
      value: chosenProductObj.value,
      type: 'missed',
      dueDate: localDateStr(),
      note: note.trim() || 'Priority test contact added manually'
    });

    if (onShowToast) onShowToast(`✅ Added ${effectiveName} to Missed Calls priority queue!`);
  };

  return (
    <div className="quick-call-card glass-card test-dialer-card">
      <div className="test-dialer-header">
        <div>
          <h3>📞 Test Call Studio & Manual Dialer</h3>
          <p className="quick-call-sub">
            Manually enter a customer number to test calling directly from the website.
          </p>
        </div>
      </div>

      <div className="test-dialer-form">
        <div className="dialer-field">
          <label className="dialer-label" htmlFor="customer-phone-input">
            Customer Phone Number <span className="required-star">*</span>
          </label>
          <input
            id="customer-phone-input"
            type="tel"
            placeholder="+91 98765 00000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Customer phone number"
            className="dialer-input"
          />
          {phone.trim() && !isValid && (
            <span className="dialer-hint error">Format as E.164 (e.g. +91 98765 43210 or 10 digits)</span>
          )}
        </div>

        <div className="dialer-row">
          <div className="dialer-field flex-1">
            <label className="dialer-label" htmlFor="customer-name-input">Customer Name</label>
            <input
              id="customer-name-input"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              aria-label="Customer name"
              className="dialer-input"
            />
          </div>

          <div className="dialer-field flex-1">
            <label className="dialer-label" htmlFor="product-select">Product Interest</label>
            <select
              id="product-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="dialer-select"
            >
              {PRODUCT_OPTIONS.map((prod) => (
                <option key={prod.name} value={prod.name}>
                  {prod.name} (₹{prod.value.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dialer-field">
          <label className="dialer-label" htmlFor="test-note-input">Inquiry Note / Scenario (Optional)</label>
          <input
            id="test-note-input"
            type="text"
            placeholder="e.g. Wants 0% EMI quote for king size"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="dialer-input"
          />
        </div>

        {/* Call Actions */}
        <div className="dialer-actions-wrapper">
          {isValid ? (
            <div className="dialer-call-actions">
              <CallActions
                customerPhone={formattedPhone}
                customerName={effectiveName}
                task={currentTask}
                onOpenOutcome={onOpenOutcome}
                onOpenAIPractice={onOpenAIPractice}
                onShowToast={onShowToast}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm save-lead-btn"
                onClick={handleSaveAsLead}
                title="Add as a task in Missed Calls board"
              >
                ➕ Add to Dashboard Queue
              </button>
            </div>
          ) : (
            <div className="quick-call-placeholder">
              Enter customer phone number above to activate calling buttons
            </div>
          )}
        </div>
      </div>

      {/* Live Stored Call Records Section */}
      <div className="test-records-section">
        <div className="test-records-header">
          <h4>📊 Recent Call Records & Stored History</h4>
          <span className="record-count-badge">{calls.length} stored</span>
        </div>

        {calls.length === 0 ? (
          <div className="empty-test-records">No calls recorded yet. Complete a call above to view stored logs!</div>
        ) : (
          <div className="test-records-list">
            {calls.slice(0, 4).map((c) => {
              const isExpanded = expandedCallId === c.id;
              const hasTranscript = c.transcript && c.transcript.length > 0;

              return (
                <div key={c.id} className="test-record-card glass-card">
                  <div className="record-summary-row" onClick={() => setExpandedCallId(isExpanded ? null : c.id)}>
                    <div className="record-main-info">
                      <span className="record-name">{c.leadName || 'Contact'}</span>
                      <span className="record-phone">{c.phone}</span>
                    </div>

                    <div className="record-meta-info">
                      <span
                        className={`pill ${
                          c.type === 'Missed'
                            ? 'pill-missed'
                            : c.type === 'AI Call' || c.type === 'AI Practice'
                            ? 'pill-ai'
                            : 'pill-completed'
                        }`}
                      >
                        {c.type}
                      </span>
                      <span className="record-duration">⏱ {c.duration}</span>
                      <button
                        type="button"
                        className="btn-link record-expand-btn"
                        aria-label="Toggle transcript details"
                      >
                        {isExpanded ? '▲ Hide' : '▼ View'}
                      </button>
                    </div>
                  </div>

                  <div className="record-note-preview">
                    <span>{c.summary || c.note || 'Call completed'}</span>
                  </div>

                  {isExpanded && (
                    <div className="record-expanded-details">
                      {hasTranscript && (
                        <div className="record-transcript-box">
                          <div className="transcript-label">🗣️ Conversation Transcript:</div>
                          {c.transcript.map((line, idx) => (
                            <div key={idx} className="transcript-line">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}

                      {c.needs && c.needs.length > 0 && (
                        <div className="record-insight-chip">
                          <b>💡 Needs:</b> {c.needs.join(', ')}
                        </div>
                      )}

                      {c.buyingSignals && c.buyingSignals.length > 0 && (
                        <div className="record-insight-chip">
                          <b>🎯 Signals:</b> {c.buyingSignals.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {onViewChange && (
              <button
                type="button"
                className="btn btn-secondary btn-sm view-all-records-btn"
                onClick={() => onViewChange('recent')}
              >
                📜 View Full History in Recent Calls ({calls.length} Total) →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
