import { useState } from 'react';
import { useLeads } from '../../data/hooks.js';
import { CallActions } from './CallActions.jsx';

export function CallsToMake({ onInitiateCall, onSelectLead, onOpenAIPractice, onShowToast }) {
  const leads = useLeads();
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.ceil(leads.length / pageSize);

  const paginatedLeads = leads.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const copyNumber = (phone) => {
    navigator.clipboard.writeText(phone);
    if (onShowToast) onShowToast(`Copied ${phone} to clipboard!`);
  };

  const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN');

  return (
    <div className="calls-table-container glass-card">
      <div className="section-header">
        <h3>Calls to Make — Active Leads Directory</h3>
        <span className="section-count">{leads.length} leads total</span>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead Name</th>
              <th>Phone Number</th>
              <th>ICP Score</th>
              <th>Priority</th>
              <th>Product Interest</th>
              <th>Call Options & Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((lead) => (
              <tr key={lead.id} className="table-row">
                <td className="font-semibold">{lead.name}</td>
                <td>{lead.phone}</td>
                <td>
                  <span className="score-badge">{lead.score}%</span>
                </td>
                <td>
                  <span className={`pill pill-${lead.status.toLowerCase()}`}>{lead.status}</span>
                </td>
                <td className="text-muted">
                  {lead.product} ({formatINR(lead.value)})
                </td>
                <td>
                  <div className="action-button-group vertical">
                    <CallActions
                      customerPhone={lead.phone}
                      customerName={lead.name}
                      task={{
                        id: 'task_' + lead.id,
                        name: lead.name,
                        phone: lead.phone,
                        product: lead.product,
                        type: 'missed',
                        value: lead.value
                      }}
                      onOpenOutcome={onInitiateCall}
                      onOpenAIPractice={onOpenAIPractice}
                      onShowToast={onShowToast}
                      isCompact
                    />
                    <div className="aux-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyNumber(lead.phone)}
                        aria-label={`Copy phone number for ${lead.name}`}
                      >
                        📋 Copy
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSelectLead(lead)}
                        aria-label={`View dossier for ${lead.name}`}
                      >
                        👤 Dossier
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              className={`btn btn-sm ${currentPage === idx ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentPage(idx)}
              aria-label={`Page ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
          <button
            className="btn btn-secondary btn-sm"
            disabled={currentPage === totalPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
