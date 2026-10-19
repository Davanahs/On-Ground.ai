export function LeadModal({ lead, leadsList, onSelectLead, onClose, onInitiateCall }) {
  if (!lead) return null;

  const leadIndex = leadsList.findIndex((l) => l.id === lead.id);
  const totalLeads = leadsList.length;

  const handlePrev = () => {
    const prevIdx = (leadIndex - 1 + totalLeads) % totalLeads;
    onSelectLead(leadsList[prevIdx]);
  };

  const handleNext = () => {
    const nextIdx = (leadIndex + 1) % totalLeads;
    onSelectLead(leadsList[nextIdx]);
  };

  const formatINR = (n) => '₹' + Number(n).toLocaleString('en-IN');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="lead-modal-counter">Lead Dossier &bull; {leadIndex + 1} of {totalLeads}</span>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            aria-label="Close lead dossier modal"
          >
            ✕
          </button>
        </div>

        <div className="lead-title-row">
          <h3>{lead.name}</h3>
          <span className={`pill pill-${lead.status.toLowerCase()}`}>{lead.status} Priority</span>
        </div>

        <p className="lead-subtitle">
          Phone: <b>{lead.phone}</b> &bull; Product: <b>{lead.product}</b> &bull; Value: <b>{formatINR(lead.value)}</b>
        </p>

        <div className="score-bars">
          <div className="score-item">
            <div className="score-label">
              <span>ICP Profile Fit Score</span>
              <b>{lead.score}%</b>
            </div>
            <div className="score-track">
              <div className="score-fill" style={{ width: `${lead.score}%` }} />
            </div>
          </div>

          <div className="score-item">
            <div className="score-label">
              <span>Lead Intent Score</span>
              <b>{lead.intent}%</b>
            </div>
            <div className="score-track">
              <div className="score-fill intent" style={{ width: `${lead.intent}%` }} />
            </div>
          </div>
        </div>

        <div className="signals-section">
          <h4>Captured Customer Signals</h4>
          {lead.signals && lead.signals.length > 0 ? (
            lead.signals.map(([tag, desc], i) => (
              <div key={i} className="signal-item">
                <span className="signal-tag">{tag}</span>
                <p className="signal-desc">{desc}</p>
              </div>
            ))
          ) : (
            <p className="no-signals">No additional signals recorded.</p>
          )}
        </div>

        <div className="modal-actions space-between">
          <div className="nav-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePrev}
              aria-label="Previous lead dossier"
            >
              ‹ Prev Lead
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleNext}
              aria-label="Next lead dossier"
            >
              Next Lead ›
            </button>
          </div>

          <a
            href={`tel:${lead.phone.replace(/\s+/g, '')}`}
            className="btn btn-green"
            onClick={() => {
              onClose();
              onInitiateCall({
                id: 'lead_' + lead.id,
                name: lead.name,
                phone: lead.phone,
                product: lead.product,
                type: 'missed',
                value: lead.value
              });
            }}
            aria-label={`Call lead ${lead.name}`}
          >
            📞 Call Lead
          </a>
        </div>
      </div>
    </div>
  );
}
