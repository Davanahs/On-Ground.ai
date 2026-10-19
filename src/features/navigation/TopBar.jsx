import { useState } from 'react';
import { db } from '../../data/db.js';
import { useSettings } from '../../data/hooks.js';

export function TopBar({ searchQuery, onSearchChange, onShowToast }) {
  const settings = useSettings();
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [agentPhoneInput, setAgentPhoneInput] = useState(settings.agentPhone || '+919999900000');

  const handleReset = () => {
    if (window.confirm('Reset all demo data back to initial seed state?')) {
      db.reset();
      if (onShowToast) onShowToast('Demo data reset to default seed!');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    db.updateSettings({ agentPhone: agentPhoneInput });
    setIsEditingSettings(false);
    if (onShowToast) onShowToast(`Updated agent phone number to ${agentPhoneInput}`);
  };

  return (
    <header className="top-bar">
      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search leads, tasks, phone numbers..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search leads and tasks"
        />
      </div>

      <div className="top-bar-actions">
        <button
          className="btn btn-secondary btn-sm reset-btn"
          onClick={handleReset}
          aria-label="Reset demo data to default state"
          title="Reset local data to initial seed"
        >
          🔄 Reset demo data
        </button>

        <div
          className="agent-status-badge clickable"
          onClick={() => setIsEditingSettings(true)}
          title="Click to edit agent phone number setting"
        >
          <span className="status-dot online">●</span>
          <span className="agent-name">John Doe ({settings.agentPhone})</span>
        </div>
      </div>

      {isEditingSettings && (
        <div className="modal-overlay" onClick={() => setIsEditingSettings(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Agent Phone Number Setting</h3>
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setIsEditingSettings(false)}
                aria-label="Close settings modal"
              >
                ✕
              </button>
            </div>
            <p className="task-subinfo">
              Used as your <b>Agent Phone Number</b> for Twilio call bridging ("Call me, then connect").
            </p>

            <form onSubmit={handleSaveSettings} className="outcome-form">
              <div className="form-group">
                <label className="form-label" htmlFor="agent-phone">Your E.164 Phone Number</label>
                <input
                  id="agent-phone"
                  type="text"
                  placeholder="+919999900000"
                  value={agentPhoneInput}
                  onChange={(e) => setAgentPhoneInput(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingSettings(false)}
                  aria-label="Cancel editing settings"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-green"
                  aria-label="Save phone number setting"
                >
                  Save Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
