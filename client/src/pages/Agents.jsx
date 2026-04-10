import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentCard from '../components/Agents/AgentCard';
import { fetchAgents } from '../utils/api';

const statusOptions = ['All', 'active', 'idle', 'offline'];

function buildDepartments(agents) {
  return ['All', ...new Set(agents.map((agent) => agent.department).filter(Boolean))];
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadAgents() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchAgents();
        if (!isMounted) return;
        setAgents(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (isMounted) {
          setError('Unable to load the agent roster.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  const departments = useMemo(() => buildDepartments(agents), [agents]);
  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        const matchesDepartment = department === 'All' || agent.department === department;
        const matchesStatus = status === 'All' || agent.status === status;
        return matchesDepartment && matchesStatus;
      }),
    [agents, department, status]
  );

  async function handleRetry() {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError('Unable to load the agent roster.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="page-fade-in agents-page">
      <article className="card page-card agents-hero">
        <p className="badge">Live roster</p>
        <h2>AI Agent Ecosystem</h2>
        <p>Browse the active agents stored in Supabase, filter by department or status, and open any profile.</p>
      </article>

      <div className="agents-toolbar card">
        <div className="filter-block">
          <label htmlFor="department-filter">Department</label>
          <select
            id="department-filter"
            className="input"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="status-toggle-group" role="tablist" aria-label="Agent status filter">
          {statusOptions.map((item) => (
            <button
              key={item}
              type="button"
              className={`status-toggle ${status === item ? 'is-active' : ''}`}
              onClick={() => setStatus(item)}
            >
              {item === 'All' ? 'All' : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="dashboard-alert card knowledge-base-error">
          <span>{error}</span>
          <button type="button" className="knowledge-base-compare-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="agents-meta">
        <span>{filteredAgents.length} agents</span>
        <span>{department === 'All' ? 'All departments' : department}</span>
        <span>{status === 'All' ? 'All statuses' : status}</span>
      </div>

      {isLoading ? (
        <div className="agents-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="card agent-card agent-card--skeleton">
              <div className="skeleton skeleton-line skeleton-line--short" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line skeleton-line--short" />
              <div className="skeleton skeleton-line" />
            </div>
          ))}
        </div>
      ) : (
        <div className="agents-grid">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onClick={() => navigate(`/agents/${agent.id}`)} />
          ))}
        </div>
      )}

      {!isLoading && filteredAgents.length === 0 ? (
        <div className="card empty-panel">
          <p>No agents match the current filters.</p>
        </div>
      ) : null}
    </section>
  );
}