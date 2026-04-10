import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AgentDetailView from '../components/Agents/AgentDetailView';
import { fetchAgent, fetchAgents, fetchLogs } from '../utils/api';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [agentList, setAgentList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAgent() {
      setIsLoading(true);
      setError('');

      try {
        const [agentData, agentsData] = await Promise.all([fetchAgent(id), fetchAgents()]);

        if (!isMounted) return;

        setAgent(agentData);
        setAgentList(Array.isArray(agentsData) ? agentsData : []);

        const logsData = await fetchLogs({ agent_name: agentData.name, limit: 10 });
        if (!isMounted) return;
        setLogs(Array.isArray(logsData) ? logsData : []);
      } catch (loadError) {
        if (isMounted) {
          setError('Unable to load this agent right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAgent();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const agentNameMap = useMemo(
    () => new Map(agentList.map((item) => [item.name, item.id])),
    [agentList]
  );

  async function handleRetry() {
    setIsLoading(true);
    setError('');

    try {
      const [agentData, agentsData] = await Promise.all([fetchAgent(id), fetchAgents()]);
      setAgent(agentData);
      setAgentList(Array.isArray(agentsData) ? agentsData : []);

      const logsData = await fetchLogs({ agent_name: agentData.name, limit: 10 });
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (loadError) {
      setError('Unable to load this agent right now.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSwitchAgent(targetAgentName) {
    const targetId = agentNameMap.get(targetAgentName);
    if (targetId) {
      navigate(`/agents/${targetId}`);
    }
  }

  return (
    <section className="page-fade-in">
      {error ? (
        <div className="dashboard-alert card knowledge-base-error">
          <span>{error}</span>
          <button type="button" className="knowledge-base-compare-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {isLoading || !agent ? (
        <div className="card page-card">
          <div className="skeleton skeleton-line skeleton-line--short" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line skeleton-line--short" />
        </div>
      ) : (
        <AgentDetailView agent={agent} logs={logs} onSwitchAgent={handleSwitchAgent} />
      )}
    </section>
  );
}