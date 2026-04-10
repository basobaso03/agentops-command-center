import { useMemo } from 'react';

const severityClassNames = {
  success: 'severity-dot severity-dot--success',
  warning: 'severity-dot severity-dot--warning',
  error: 'severity-dot severity-dot--error',
  info: 'severity-dot severity-dot--info'
};

function timeAgo(createdAt) {
  const created = new Date(createdAt);
  const diff = Date.now() - created.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} h ago`;
}

export default function ActivityFeed({ logs = [], isLoading = false }) {
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);

  return (
    <article className="card activity-card">
      <div className="section-heading">
        <h3>Recent Activity</h3>
        <p>Latest agent events and escalation signals.</p>
      </div>

      <div className="activity-feed">
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => (
              <div key={index} data-testid="dashboard-skeleton" className="activity-item activity-item--skeleton">
                <div className="skeleton skeleton-dot" />
                <div className="activity-copy">
                  <div className="skeleton skeleton-line skeleton-line--short" />
                  <div className="skeleton skeleton-line" />
                </div>
              </div>
            ))
          : recentLogs.map((log, index) => (
              <div key={log.id || index} className="activity-item" style={{ animationDelay: `${index * 60}ms` }}>
                <span className={severityClassNames[log.severity] || severityClassNames.info} />
                <div className="activity-copy">
                  <div className="activity-title-row">
                    <strong>{log.agent_name}</strong>
                    <span>{timeAgo(log.created_at)}</span>
                  </div>
                  <p>{log.action}</p>
                  {log.details ? <span className="activity-details">{log.details}</span> : null}
                </div>
              </div>
            ))}
      </div>
    </article>
  );
}