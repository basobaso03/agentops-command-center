import { Fragment, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { fetchLogStats, fetchLogs } from '../../utils/api';

const severityOptions = ['All', 'info', 'warning', 'error', 'success'];
const dateRangeOptions = ['24h', '7d', '30d', 'All'];

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function buildCsv(rows) {
  const headers = ['Timestamp', 'Severity', 'Agent', 'Department', 'Action', 'Details'];
  const csvRows = rows.map((row) => [
    formatTimestamp(row.created_at),
    row.severity || '',
    row.agent_name || '',
    row.department || '',
    row.action || '',
    String(row.details || '').replaceAll('"', '""')
  ]);

  return [headers, ...csvRows].map((row) => row.map((value) => `"${String(value)}"`).join(',')).join('\n');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getDateCutoff(range) {
  const now = Date.now();

  if (range === '24h') {
    return now - 24 * 60 * 60 * 1000;
  }

  if (range === '7d') {
    return now - 7 * 24 * 60 * 60 * 1000;
  }

  if (range === '30d') {
    return now - 30 * 24 * 60 * 60 * 1000;
  }

  return 0;
}

function severityLabel(value) {
  if (!value) return 'unknown';
  return value;
}

export default function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, bySeverity: {}, byDepartment: {}, last24h: 0 });
  const [severity, setSeverity] = useState('All');
  const [department, setDepartment] = useState('All');
  const [dateRange, setDateRange] = useState('All');
  const [expandedRowId, setExpandedRowId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');

  async function loadLogs() {
    const filters = {};

    if (severity !== 'All') {
      filters.severity = severity;
    }

    if (department !== 'All') {
      filters.department = department;
    }

    const data = await fetchLogs(filters);
    const logList = Array.isArray(data) ? data : [];
    const cutoff = getDateCutoff(dateRange);

    return logList.filter((entry) => {
      if (!cutoff) {
        return true;
      }

      const timestamp = new Date(entry.created_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }

  async function refreshData() {
    setIsLoading(true);
    setError('');

    try {
      const [logList, statsData] = await Promise.all([loadLogs(), fetchLogStats()]);
      setLogs(logList);
      setStats(statsData || { total: 0, bySeverity: {}, byDepartment: {}, last24h: 0 });
    } catch (loadError) {
      setError('Unable to load system logs right now.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRetry() {
    await refreshData();
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      await refreshData();
      if (!isMounted) {
        return;
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [severity, department, dateRange]);

  useEffect(() => {
    const stream = new EventSource('http://localhost:3001/api/logs/stream');

    stream.onmessage = () => {
      refreshData().catch(() => setError('Unable to refresh system logs.'));
    };

    stream.onerror = () => {};

    return () => {
      stream.close();
    };
  }, [severity, department, dateRange]);

  useEffect(() => {
    if (!isPolling) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshData().catch(() => setError('Unable to refresh system logs.'));
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isPolling, severity, department, dateRange]);

  const departmentOptions = useMemo(() => {
    const departments = Object.keys(stats.byDepartment || {});
    return ['All', ...departments.sort((left, right) => left.localeCompare(right))];
  }, [stats.byDepartment]);

  function exportCsv() {
    downloadFile(`system-logs-${new Date().toISOString()}.csv`, buildCsv(logs), 'text/csv;charset=utf-8');
  }

  function exportJson() {
    downloadFile(
      `system-logs-${new Date().toISOString()}.json`,
      JSON.stringify(logs, null, 2),
      'application/json;charset=utf-8'
    );
  }

  return (
    <section className="page-fade-in logs-page">
      <article className="card page-card logs-hero">
        <p className="badge">Live infrastructure</p>
        <h2>System Logs & Data Infrastructure</h2>
        <p>
          Observe agent activity, filter the event stream, and export the current view directly from the database.
        </p>
      </article>

      {error ? (
        <div className="dashboard-alert card knowledge-base-error">
          <span>{error}</span>
          <button type="button" className="knowledge-base-compare-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="logs-stats-grid">
        <article className="card logs-stat-card">
          <span className="logs-stat-label">Total logs</span>
          <strong>{stats.total || 0}</strong>
        </article>
        <article className="card logs-stat-card logs-stat-card--error">
          <span className="logs-stat-label">Errors</span>
          <strong>{stats.bySeverity?.error || 0}</strong>
        </article>
        <article className="card logs-stat-card logs-stat-card--warning">
          <span className="logs-stat-label">Warnings</span>
          <strong>{stats.bySeverity?.warning || 0}</strong>
        </article>
        <article className="card logs-stat-card logs-stat-card--info">
          <span className="logs-stat-label">Info</span>
          <strong>{stats.bySeverity?.info || 0}</strong>
        </article>
      </section>

      <section className="card logs-toolbar">
        <div className="logs-filter-group">
          <span className="logs-filter-label">Severity</span>
          <div className="logs-pill-row">
            {severityOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`logs-pill ${severity === option ? 'is-active' : ''}`}
                onClick={() => setSeverity(option)}
              >
                {option === 'All' ? 'All' : option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <label className="logs-filter-group logs-filter-group--select">
          <span className="logs-filter-label">Department</span>
          <select className="input" aria-label="Department filter" value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="logs-filter-group">
          <span className="logs-filter-label">Date range</span>
          <div className="logs-pill-row">
            {dateRangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`logs-pill ${dateRange === option ? 'is-active' : ''}`}
                onClick={() => setDateRange(option)}
              >
                {option === 'All' ? 'All' : `Last ${option}`}
              </button>
            ))}
          </div>
        </div>

        <div className="logs-toolbar-actions">
          <button type="button" className="btn btn--secondary logs-action-button" onClick={() => refreshData()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button type="button" className="btn btn--secondary logs-action-button" onClick={() => setIsPolling((currentValue) => !currentValue)}>
            {isPolling ? 'Stop Live Updates' : 'Live Updates'}
          </button>
          <button type="button" className="btn btn--secondary logs-action-button" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
          <button type="button" className="btn btn--secondary logs-action-button" onClick={exportJson}>
            <Download size={16} />
            Export JSON
          </button>
        </div>
      </section>

      <section className="card logs-table-card">
        <div className="section-heading">
          <h3>Event Stream</h3>
          <p>{logs.length} events currently shown</p>
        </div>

        {isLoading ? (
          <div className="logs-loading-state">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No logs match the current filters.</div>
        ) : (
          <div className="logs-table-wrap">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>Agent</th>
                  <th>Department</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      role="button"
                      tabIndex={0}
                      aria-label={`${log.agent_name} ${log.action}`}
                      className={`logs-row ${expandedRowId === log.id ? 'is-expanded' : ''}`}
                      onClick={() => setExpandedRowId((currentId) => (currentId === log.id ? '' : log.id))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setExpandedRowId((currentId) => (currentId === log.id ? '' : log.id));
                        }
                      }}
                    >
                      <td>{formatTimestamp(log.created_at)}</td>
                      <td>
                        <span className={`logs-severity logs-severity--${severityLabel(log.severity)}`}>
                          {severityLabel(log.severity)}
                        </span>
                      </td>
                      <td>{log.agent_name}</td>
                      <td>{log.department || 'Unknown'}</td>
                      <td>{log.action}</td>
                      <td>{log.details || '—'}</td>
                    </tr>
                    {expandedRowId === log.id ? (
                      <tr className="logs-row-details">
                        <td colSpan="6">
                          <div className="logs-detail-panel">
                            <strong>Full log record</strong>
                            <pre>{JSON.stringify(log, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}