import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const ranges = ['7d', '30d', '90d'];
const chartColors = {
  blue: '#3b82f6',
  purple: '#8b5cf6'
};

function buildSeries(trend, range) {
  return trend.seriesByRange?.[range] ?? [];
}

export default function PerformanceChart({ trend = { departments: [], seriesByRange: {} } }) {
  const [range, setRange] = useState('7d');

  const data = useMemo(() => buildSeries(trend, range), [trend, range]);
  const [primaryDepartment, secondaryDepartment] = trend.departments ?? [];

  return (
    <article className="card chart-card">
      <div className="chart-header">
        <div className="section-heading">
          <h3>Performance Overview</h3>
          <p>Agent workload trends across the selected time range.</p>
        </div>

        <div className="range-switcher" role="tablist" aria-label="Time range">
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              className={`range-button ${range === item ? 'is-active' : ''}`}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.blue} stopOpacity={0.45} />
                <stop offset="95%" stopColor={chartColors.blue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.purple} stopOpacity={0.4} />
                <stop offset="95%" stopColor={chartColors.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#8888a0', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8888a0', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#12121a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: '#e8e8ed'
              }}
            />
            {primaryDepartment ? (
              <Area
                type="monotone"
                dataKey={primaryDepartment}
                name={primaryDepartment}
                stroke={chartColors.blue}
                fill="url(#blueGradient)"
                strokeWidth={2}
              />
            ) : null}
            {secondaryDepartment ? (
              <Area
                type="monotone"
                dataKey={secondaryDepartment}
                name={secondaryDepartment}
                stroke={chartColors.purple}
                fill="url(#purpleGradient)"
                strokeWidth={2}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}