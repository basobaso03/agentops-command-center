import { useEffect, useState } from 'react';
import KPICards from '../components/Dashboard/KPICards';
import ActivityFeed from '../components/Dashboard/ActivityFeed';
import PerformanceChart from '../components/Dashboard/PerformanceChart';
import { fetchDashboardOverview } from '../utils/api';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError('');

      try {
        const overviewData = await fetchDashboardOverview();

        if (!isMounted) {
          return;
        }

        setOverview(overviewData);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = overview?.stats ?? {
    totalAgents: 0,
    totalLogs: 0,
    activeAgents: 0,
    tasksCompleted: 0,
    avgResponse: 0,
    successRate: 0
  };

  const departmentSummary = overview?.departmentSummary ?? [];
  const recentLogs = overview?.recentLogs ?? [];
  const trend = overview?.trend ?? { departments: [], seriesByRange: {} };

  async function handleRetry() {
    setIsLoading(true);
    setError('');

    try {
      const overviewData = await fetchDashboardOverview();
      setOverview(overviewData);
    } catch (loadError) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="dashboard-view page-fade-in">
      {error ? (
        <div className="dashboard-alert card knowledge-base-error">
          <span>{error}</span>
          <button type="button" className="knowledge-base-compare-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="dashboard-grid dashboard-grid--hero">
        <article className="card dashboard-hero">
          <p className="badge">Live overview</p>
          <h2>Command Center Operations</h2>
          <p>
            A real-time view of active agents, task volume, performance, and recent system activity.
          </p>
          <div className="dashboard-hero-stats">
            <div>
              <span className="dashboard-hero-value">{stats.totalAgents}</span>
              <span className="dashboard-hero-label">Registered agents</span>
            </div>
            <div>
              <span className="dashboard-hero-value">{stats.totalLogs}</span>
              <span className="dashboard-hero-label">Total log entries</span>
            </div>
          </div>
        </article>

        <KPICards stats={stats} isLoading={isLoading} />
      </div>

      <div className="dashboard-grid dashboard-grid--content">
        <PerformanceChart trend={trend} />
        <ActivityFeed logs={recentLogs} isLoading={isLoading} />
      </div>

      <section className="dashboard-section">
        <div className="section-heading">
          <h3>Department Breakdown</h3>
          <p>Agent health and task volume by department.</p>
        </div>

        <div className="department-grid">
          {isLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <div key={index} data-testid="dashboard-skeleton" className="card department-card skeleton-card">
                  <div className="skeleton skeleton-line skeleton-line--short" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--short" />
                </div>
              ))
            : departmentSummary.map((item) => (
                <article key={item.department} className="card department-card">
                  <p className="department-name">{item.department}</p>
                  <div className="department-metrics">
                    <div>
                      <span className="department-number">{item.activeCount}</span>
                      <span className="department-label">Active agents</span>
                    </div>
                    <div>
                      <span className="department-number">{item.taskTotal}</span>
                      <span className="department-label">Tasks completed</span>
                    </div>
                  </div>
                  <p className="department-footnote">{item.agentCount} total agents in this department</p>
                </article>
              ))}
        </div>
      </section>
    </section>
  );
}