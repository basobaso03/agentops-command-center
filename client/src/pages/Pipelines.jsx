import { useEffect, useMemo, useState } from 'react';
import { fetchWorkflows } from '../utils/api';
import PipelineCanvas from '../components/Pipelines/PipelineCanvas';

function formatDate(value) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export default function Pipelines() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkflows() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchWorkflows();
        if (!isMounted) return;

        const workflowList = Array.isArray(data) ? data : [];
        setWorkflows(workflowList);
        setSelectedWorkflowId((currentId) => currentId || workflowList[0]?.id || '');
      } catch (loadError) {
        if (isMounted) {
          setError('Unable to load workflow pipelines.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkflows();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) || workflows[0] || null,
    [selectedWorkflowId, workflows]
  );

  async function toggleWorkflow(workflow) {
    const response = await fetch(`http://localhost:3001/api/workflows/${workflow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !workflow.is_active })
    });

    if (!response.ok) {
      throw new Error('Unable to update workflow');
    }

    const updatedWorkflow = await response.json();
    setWorkflows((currentWorkflows) =>
      currentWorkflows.map((item) => (item.id === updatedWorkflow.id ? updatedWorkflow : item))
    );
  }

  const totalRuns = workflows.reduce((sum, workflow) => sum + Number(workflow.run_count || 0), 0);

  async function handleRetry() {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchWorkflows();
      const workflowList = Array.isArray(data) ? data : [];
      setWorkflows(workflowList);
      setSelectedWorkflowId((currentId) => currentId || workflowList[0]?.id || '');
    } catch (loadError) {
      setError('Unable to load workflow pipelines.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="page-fade-in pipelines-page">
      <article className="card page-card pipelines-hero">
        <p className="badge">Live workflows</p>
        <h2>Workflow Pipelines</h2>
        <p>Visualize the workflow definitions stored in Supabase and simulate how the steps execute.</p>
      </article>

      <div className="pipelines-layout">
        <aside className="card pipeline-list-panel">
          <div className="section-heading">
            <h3>Workflows</h3>
            <p>{workflows.length} records loaded from the database</p>
            <p className="pipeline-filter-hint">Tap to show or hide the workflows list.</p>
            <button
              type="button"
              className="pipeline-filter-toggle btn"
              aria-expanded={isWorkflowsOpen}
              onClick={() => setIsWorkflowsOpen((currentValue) => !currentValue)}
            >
              <span>{isWorkflowsOpen ? 'Close workflows list' : 'Select a workflow'}</span>
            </button>
          </div>

          <div className={`pipeline-list-collapsible ${isWorkflowsOpen ? 'is-open' : ''}`}>
            {isLoading ? (
            <div className="pipeline-list">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="card pipeline-list-item skeleton-card">
                  <div className="skeleton skeleton-line skeleton-line--short" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--short" />
                </div>
              ))}
            </div>
          ) : null}

          {!isLoading ? (
            <div className="pipeline-list">
              {workflows.map((workflow) => (
                <article
                  key={workflow.id}
                  className={`card pipeline-list-item ${workflow.id === selectedWorkflow?.id ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedWorkflowId(workflow.id);
                    setIsWorkflowsOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedWorkflowId(workflow.id);
                      setIsWorkflowsOpen(false);
                    }
                  }}
                >
                  <div className="pipeline-list-item__top">
                    <strong>{workflow.name}</strong>
                    <span className={`pipeline-status ${workflow.is_active ? 'status-active' : 'status-idle'}`}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p>{workflow.description}</p>
                  <div className="pipeline-list-item__meta">
                    <span>{workflow.trigger_type}</span>
                    <span>{workflow.run_count} runs</span>
                  </div>
                  <button
                    type="button"
                    className="pipeline-toggle"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWorkflow(workflow).catch(() => setError('Unable to update workflow status.'));
                    }}
                  >
                    Toggle {workflow.is_active ? 'Off' : 'On'}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
          </div>
        </aside>

        <div className="pipeline-workspace">
          {error ? (
            <div className="dashboard-alert card knowledge-base-error">
              <span>{error}</span>
              <button type="button" className="knowledge-base-compare-button" onClick={handleRetry}>
                Retry
              </button>
            </div>
          ) : null}

          <div className="pipeline-stats-bar card">
            <div>
              <span className="pipeline-stat-label">Total runs</span>
              <strong className="pipeline-stat-value">{totalRuns.toLocaleString()}</strong>
            </div>
            <div>
              <span className="pipeline-stat-label">Trigger type</span>
              <strong className="pipeline-badge">{selectedWorkflow?.trigger_type || 'Unknown'}</strong>
            </div>
            <div>
              <span className="pipeline-stat-label">Last run</span>
              <strong className="pipeline-stat-value">{formatDate(selectedWorkflow?.last_run)}</strong>
            </div>
          </div>

          <PipelineCanvas workflow={selectedWorkflow} />
        </div>
      </div>
    </section>
  );
}