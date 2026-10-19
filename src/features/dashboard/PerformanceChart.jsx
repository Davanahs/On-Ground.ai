import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const SERIES = [
  { day: 'Mon', total: 35, connected: 15 },
  { day: 'Tue', total: 100, connected: 55 },
  { day: 'Wed', total: 55, connected: 25 },
  { day: 'Thu', total: 100, connected: 55 },
  { day: 'Fri', total: 55, connected: 30 },
  { day: 'Sat', total: 100, connected: 50 },
  { day: 'Sun', total: 120, connected: 75 }
];

export function PerformanceChart() {
  return (
    <div className="chart-container glass-card">
      <div className="chart-header">
        <h3>Call Performance Trends</h3>
        <span className="chart-subtitle">Total Calls vs. Connected Calls</span>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={SERIES}>
            <CartesianGrid stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f1f5f9'
              }}
            />
            <Line dataKey="total" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Total Calls" />
            <Line dataKey="connected" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Connected" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
