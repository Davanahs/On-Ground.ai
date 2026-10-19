import { useCalls, useTasks } from '../../data/hooks.js';

export function KPIs() {
  const calls = useCalls();
  const tasks = useTasks();

  const totalCalls = calls.length + 245; // baseline sample plus logged calls
  const connectedCalls = calls.filter((c) => c.outcome !== 'no_answer').length + 185;
  const missedCallsCount = tasks.filter((t) => t.type === 'missed').length;

  const completedTasksValue = tasks
    .filter((t) => t.type === 'completed')
    .reduce((sum, t) => sum + (t.value || 0), 0);

  const kpiData = [
    { icon: '📞', label: 'Total Calls Today', value: totalCalls, trend: '↑ 14%', isUp: true },
    { icon: '👥', label: 'Connected Calls', value: connectedCalls, trend: '↑ 18%', isUp: true },
    { icon: '✖', label: 'Missed (Pending)', value: missedCallsCount, trend: '↓ 6%', isUp: false },
    { icon: '₹', label: 'Closed Earnings', value: `₹ ${completedTasksValue.toLocaleString('en-IN')}`, trend: '↑ 22%', isUp: true }
  ];

  return (
    <div className="kpis-grid">
      {kpiData.map((kpi) => (
        <div key={kpi.label} className="kpi-card glass-card">
          <div className="kpi-header">
            <span className="kpi-icon">{kpi.icon}</span>
            <span className="kpi-label">{kpi.label}</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpi.value}</span>
            <span className={`kpi-trend ${kpi.isUp ? 'up' : 'down'}`}>{kpi.trend}</span>
          </div>
          <span className="kpi-subtext">vs. last 7 days</span>
        </div>
      ))}
    </div>
  );
}
