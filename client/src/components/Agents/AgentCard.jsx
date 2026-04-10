import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';

const departmentPalettes = {
  Sales: 'department-pill department-pill--sales',
  'Customer Support': 'department-pill department-pill--customer-support',
  Compliance: 'department-pill department-pill--compliance',
  HR: 'department-pill department-pill--hr',
  Operations: 'department-pill department-pill--operations'
};

function getStatusClass(status) {
  if (status === 'active') return 'status-dot status-dot--active';
  if (status === 'idle') return 'status-dot status-dot--idle';
  return 'status-dot status-dot--error';
}

export default function AgentCard({ agent, onClick }) {
  const departmentClass = departmentPalettes[agent.department] || 'department-pill';

  const performanceWidth = useMemo(() => `${Math.min(100, Number(agent.performance_score || 0))}%`, [agent.performance_score]);

  return (
    <button type="button" className="card agent-card" onClick={onClick}>
      <div className="agent-card__top">
        <div>
          <p className={departmentClass}>{agent.department}</p>
          <h3>{agent.name}</h3>
          <p className="agent-role">{agent.role}</p>
        </div>
        <span className={getStatusClass(agent.status)} title={agent.status} />
      </div>

      <p className="agent-description">{agent.description}</p>

      <div className="agent-card__metrics">
        <div>
          <span className="metric-value">{agent.performance_score}</span>
          <span className="metric-label">Performance</span>
        </div>
        <div>
          <span className="metric-value">{agent.tasks_completed}</span>
          <span className="metric-label">Tasks</span>
        </div>
      </div>

      <div className="progress-bar" aria-label="Performance score">
        <span style={{ width: performanceWidth }} />
      </div>

      <div className="agent-card__footer">
        <span>{agent.avg_response_ms} ms avg response</span>
        <span className="agent-card__cta">
          Open
          <ArrowRight size={14} />
        </span>
      </div>
    </button>
  );
}