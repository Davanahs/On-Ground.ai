import { useState } from 'react';
import { db } from '../../data/db.js';
import { useSettings, useTasks } from '../../data/hooks.js';

export function TopBar({ searchQuery, onSearchChange, onShowToast, currentView, onViewChange }) {
  const settings = useSettings();
  const tasks = useTasks();
  const missedCount = tasks.filter((t) => t.type === 'missed').length;

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [agentPhoneInput, setAgentPhoneInput] = useState(settings.agentPhone || '+919999900000');

  const handleReset = () => {
    if (window.confirm('Reset all demo data back to initial seed state?')) {
      db.reset();
      if (onShowToast) onShowToast('Demo data reset to default seed!');
      setIsMobileMenuOpen(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    db.updateSettings({ agentPhone: agentPhoneInput });
    setIsEditingSettings(false);
    if (onShowToast) onShowToast(`Updated agent phone number to ${agentPhoneInput}`);
  };

  const handleNavigate = (viewId) => {
    if (onViewChange) onViewChange(viewId);
    setIsMobileMenuOpen(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'test-call', label: 'Test Call Studio (Manual Dialer)', icon: '➕', highlight: true },
    { id: 'calls', label: 'Calls to Make', icon: '📞' },
    { id: 'incoming', label: 'Incoming Calls', icon: '🔔', badge: missedCount },
    { id: 'recent', label: 'Recent Calls History', icon: '🕘' },
    { id: 'calendar', label: 'Calendar Schedule', icon: '📅' },
    { id: 'pulse', label: 'Pulse Insights', icon: '💬' }
  ];

  return (
    <header className="top-bar">
      {/* Mobile Menu Hamburger & Brand */}
      <div className="top-bar-left">
        <button
          type="button"
          className="mobile-menu-toggle btn btn-secondary btn-icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          title="Open Menu"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search leads, calls, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search leads and tasks"
          />
        </div>
      </div>

      <div className="top-bar-actions">
        {/* Quick Test Call / Manual Dial button */}
        <button
          type="button"
          className={`btn ${currentView === 'test-call' ? 'btn-green' : 'btn-secondary'} btn-sm quick-test-call-btn`}
          onClick={() => handleNavigate('test-call')}
          title="Manually enter phone number and test calls"
        >
          ➕ Test Call
        </button>

        <button
          className="btn btn-secondary btn-sm reset-btn hide-on-mobile"
          onClick={handleReset}
          aria-label="Reset demo data to default state"
          title="Reset local data to initial seed"
        >
          🔄 Reset
        </button>

        <div
          className="agent-status-badge clickable"
          onClick={() => setIsEditingSettings(true)}
          title="Click to edit agent phone number setting"
        >
          <span className="status-dot online">●</span>
          <span className="agent-name">Agent ({settings.agentPhone})</span>
        </div>
      </div>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="brand-logo">
                <span className="brand-icon">◉</span> On-Ground.ai
              </div>
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="drawer-nav">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`drawer-nav-item ${currentView === item.id ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span className="drawer-icon">{item.icon}</span>
                  <span className="drawer-label">{item.label}</span>
                  {item.badge > 0 && <span className="badge-count">{item.badge}</span>}
                </button>
              ))}
            </nav>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm w-full"
                onClick={() => {
                  setIsEditingSettings(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                ⚙️ Agent Settings ({settings.agentPhone})
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm w-full"
                onClick={handleReset}
              >
                🔄 Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SETTINGS MODAL */}
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
