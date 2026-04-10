import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import AgentChat from './AgentChat';

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function formatUptime(createdAt) {
  if (!createdAt) return 'Unknown';
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? '' : 's'}`;
}

function formatLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AgentDetailView({ agent, logs = [], onSwitchAgent }) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const capabilityList = Array.isArray(agent.capabilities) ? agent.capabilities : [];

  const stats = useMemo(
    () => [
      { label: 'Performance Score', value: `${agent.performance_score}` },
      { label: 'Tasks Completed', value: `${agent.tasks_completed}` },
      { label: 'Avg Response', value: `${agent.avg_response_ms} ms` },
      { label: 'Uptime', value: formatUptime(agent.created_at) }
    ],
    [agent.avg_response_ms, agent.created_at, agent.performance_score, agent.tasks_completed]
  );

  return (
    <section className="agent-detail-layout page-fade-in">
      <article className="card agent-detail-main">
        <div className="agent-detail-header">
          <div>
            <p className={`department-pill department-pill--${String(agent.department).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{agent.department}</p>
            <h2>{agent.name}</h2>
            <p className="agent-role">{agent.role}</p>
          </div>

          <button type="button" className="btn" onClick={() => setIsChatOpen(true)}>
            <MessageSquare size={16} />
            Chat with Agent
          </button>
        </div>

        <div className="agent-stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="agent-stat-card card">
              <span className="metric-label">{stat.label}</span>
              <strong className="metric-value metric-value--large">{stat.value}</strong>
            </div>
          ))}
        </div>

        <section className="agent-section">
          <h3>Capabilities</h3>
          <div className="chip-row">
            {capabilityList.map((capability) => (
              <span key={capability} className="chip">
                {formatLabel(capability)}
              </span>
            ))}
          </div>
        </section>

        <section className="agent-section">
          <button type="button" className="collapsible-trigger" onClick={() => setIsPromptOpen((value) => !value)}>
            <span>System Prompt</span>
            {isPromptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isPromptOpen ? <p className="collapsible-content">{agent.system_prompt}</p> : null}
        </section>

        <section className="agent-section">
          <h3>Recent Logs</h3>
          <div className="agent-log-list">
            {logs.length === 0 ? (
              <p className="empty-state">No recent logs for this agent.</p>
            ) : (
              logs.map((log) => (
                <article key={log.id} className="card agent-log-item">
                  <div className="agent-log-item__top">
                    <strong>{formatLabel(log.action)}</strong>
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                  <p>{log.details}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </article>

      {isChatOpen ? (
        <AgentChat
          agent={agent}
          onClose={() => setIsChatOpen(false)}
          onSwitchAgent={onSwitchAgent}
        />
      ) : null}
    </section>
  );
}