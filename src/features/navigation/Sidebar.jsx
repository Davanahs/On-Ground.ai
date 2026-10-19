import { useTasks } from '../../data/hooks.js';

export function Sidebar({ currentView, onViewChange, onOpenAIPractice }) {
  const tasks = useTasks();
  const missedCount = tasks.filter((t) => t.type === 'missed').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'calls', label: 'Calls to Make', icon: '📞' },
    { id: 'incoming', label: 'Incoming Calls', icon: '🔔', badge: missedCount },
    { id: 'recent', label: 'Recent Calls', icon: '🕘' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'pulse', label: 'Pulse', icon: '💬' }
  ];

  return (
    <aside className="sidebar-container glass-card">
      <div className="brand-logo">
        <span className="brand-icon">◉</span> On-Ground.ai
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
              aria-label={`Navigate to ${item.label}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="badge-count" aria-label={`${item.badge} pending calls`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="ai-practice-section">
        <button
          className="btn btn-secondary ai-practice-btn"
          onClick={onOpenAIPractice}
          aria-label="Open AI Call Practice Simulation"
        >
          <span>🤖</span> Practise a call
        </button>
      </div>
    </aside>
  );
}
