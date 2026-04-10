import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Send } from 'lucide-react';
import { fetchAgents, routeQuery, sendChatMessage } from '../../utils/api';
import MarkdownContent from '../Common/MarkdownContent';

const exampleQueries = [
  'I want to buy your enterprise plan',
  'My invoice is wrong and I want a refund',
  "What's your POPIA compliance status?",
  "I'm a new employee, where do I start?",
  'Our processing time has increased by 40%'
];

function buildAgentPositions(agents, layout) {
  const radiusX = layout.radiusX;
  const radiusY = layout.radiusY;
  const centerX = layout.centerX;
  const centerY = layout.centerY;
  const total = Math.max(agents.length, 1);

  return agents.map((agent, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;

    return {
      ...agent,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY
    };
  });
}

function getAgentInitials(name) {
  return String(name || '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function resolveHandoffTarget(agents, targetLabel) {
  const normalizedLabel = String(targetLabel || '').trim().toLowerCase();

  if (!normalizedLabel) {
    return null;
  }

  const exactNameMatch = agents.find((agent) => String(agent.name || '').toLowerCase() === normalizedLabel);
  if (exactNameMatch) {
    return exactNameMatch;
  }

  const containsNameMatch = agents.find((agent) => normalizedLabel.includes(String(agent.name || '').toLowerCase()));
  if (containsNameMatch) {
    return containsNameMatch;
  }

  const departmentKeywords = [
    { pattern: /sales/, department: 'Sales' },
    { pattern: /support|billing|customer/, department: 'Customer Support' },
    { pattern: /compliance|regulatory|privacy/, department: 'Compliance' },
    { pattern: /hr|human resources|onboarding/, department: 'HR' },
    { pattern: /operations|ops|process/, department: 'Operations' }
  ];

  const matchedDepartment = departmentKeywords.find((item) => item.pattern.test(normalizedLabel))?.department;

  if (!matchedDepartment) {
    return null;
  }

  const departmentAgents = agents.filter((agent) => agent.department === matchedDepartment);
  return departmentAgents.find((agent) => agent.status === 'active') || departmentAgents[0] || null;
}

export default function HandoffSimulator() {
  const [agents, setAgents] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRouting, setIsRouting] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedAgentResponse, setSelectedAgentResponse] = useState('');
  const [handoffResult, setHandoffResult] = useState(null);
  const [routingTrail, setRoutingTrail] = useState([]);
  const [error, setError] = useState('');
  const [mobilePane, setMobilePane] = useState('map');
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const mapRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAgents() {
      setIsLoading(true);

      try {
        const data = await fetchAgents();
        if (!isMounted) return;
        setAgents(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (isMounted) {
          setError('Unable to load the agent network.');
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

  async function handleRetry() {
    setError('');
    setIsLoading(true);

    try {
      const data = await fetchAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError('Unable to load the agent network.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mapLayout = useMemo(() => {
    const isCompact = viewportWidth <= 640;

    if (!isCompact) {
      return {
        width: 720,
        height: 520,
        radiusX: 210,
        radiusY: 170,
        centerX: 360,
        centerY: 260,
        isCompact: false
      };
    }

    const width = Math.max(300, Math.min(420, viewportWidth - 36));
    const height = 430;

    return {
      width,
      height,
      radiusX: width * 0.32,
      radiusY: height * 0.29,
      centerX: width / 2,
      centerY: height / 2,
      isCompact: true
    };
  }, [viewportWidth]);

  const positionedAgents = useMemo(() => buildAgentPositions(agents, mapLayout), [agents, mapLayout]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId]
  );

  useEffect(() => {
    if (isLoading || !mapRef.current) {
      return;
    }

    const mapElement = mapRef.current;
    const isMobileLayout = window.innerWidth <= 1024;

    if (!isMobileLayout || mapLayout.isCompact) {
      return;
    }

    const centeredLeft = Math.max(0, (mapElement.scrollWidth - mapElement.clientWidth) / 2);
    mapElement.scrollTo({ left: centeredLeft, behavior: 'smooth' });
  }, [isLoading, agents.length, mapLayout.isCompact]);

  useEffect(() => {
    if (!mapRef.current || !selectedAgentId) {
      return;
    }

    const activeNode = mapRef.current.querySelector('.handoff-agent-node.is-active');

    if (!activeNode) {
      return;
    }

    activeNode.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [selectedAgentId]);

  async function runRouting(selectedQuery) {
    const finalQuery = String(selectedQuery || query).trim();

    if (!finalQuery || isRouting) {
      return;
    }

    setIsRouting(true);
    setError('');
    setRouteResult(null);
    setSelectedAgentResponse('');
    setHandoffResult(null);
    setRoutingTrail([{ label: 'Query received', detail: finalQuery }]);
    
    // Automatically switch back to the "Map" (Live Routing) view on mobile
    setMobilePane('map');

    let route;
    try {
      route = await routeQuery(finalQuery);
    } catch (routeError) {
      setError('Unable to classify and route the query right now.');
      setIsRouting(false);
      return;
    }

    try {
      setRouteResult(route);
      setRoutingTrail((currentTrail) => [
        ...currentTrail,
        { label: 'Query classified', detail: `${route.department} via ${route.reasoning}` },
        { label: 'Primary agent selected', detail: route.agentName }
      ]);

      setSelectedAgentId(route.agentId);

      let primaryAgentResponse;
      try {
        primaryAgentResponse = await sendChatMessage(route.agentId, finalQuery, []);
      } catch (chatError) {
        setRoutingTrail((currentTrail) => [
          ...currentTrail,
          {
            label: 'Primary agent response failed',
            detail: 'Routing succeeded, but the selected agent is temporarily unavailable. Please retry in a moment.'
          }
        ]);
        setError('Routing worked, but the selected agent is temporarily unavailable.');
        return;
      }

      setSelectedAgentResponse(primaryAgentResponse.response);
      setRoutingTrail((currentTrail) => [
        ...currentTrail,
        { label: 'Primary agent response', detail: primaryAgentResponse.response }
      ]);

      if (primaryAgentResponse.handoff?.target_agent) {
        const targetAgent = resolveHandoffTarget(agents, primaryAgentResponse.handoff.target_agent);

        setHandoffResult({
          targetAgentName: targetAgent?.name || primaryAgentResponse.handoff.target_agent,
          reason: primaryAgentResponse.handoff.reason,
          targetAgentId: targetAgent?.id || ''
        });

        setRoutingTrail((currentTrail) => [
          ...currentTrail,
          {
            label: 'Handoff requested',
            detail: `${primaryAgentResponse.handoff.target_agent} because ${primaryAgentResponse.handoff.reason}`
          }
        ]);

        if (targetAgent) {
          setSelectedAgentId(targetAgent.id);
          let followUpResponse;
          try {
            followUpResponse = await sendChatMessage(
              targetAgent.id,
              `${finalQuery}\n\nHandoff context: ${primaryAgentResponse.response}`,
              [{ role: 'user', content: finalQuery }]
            );
          } catch (followUpError) {
            setRoutingTrail((currentTrail) => [
              ...currentTrail,
              {
                label: 'Secondary agent response failed',
                detail: `${targetAgent.name} is temporarily unavailable. Handoff intent was logged.`
              }
            ]);
            return;
          }

          setRoutingTrail((currentTrail) => [
            ...currentTrail,
            { label: 'Secondary agent response', detail: followUpResponse.response }
          ]);

          setSelectedAgentResponse(
            `${primaryAgentResponse.response}\n\nHandoff response from ${targetAgent.name}: ${followUpResponse.response}`
          );
        } else {
          setRoutingTrail((currentTrail) => [
            ...currentTrail,
            {
              label: 'Handoff target unresolved',
              detail: `No matching agent profile was found for "${primaryAgentResponse.handoff.target_agent}".`
            }
          ]);
        }
      }
    } catch (processingError) {
      setError('Routing completed, but processing the agent response failed.');
    } finally {
      setIsRouting(false);
    }
  }

  return (
    <section className="page-fade-in handoff-page">
      <article className="card page-card handoff-hero">
        <p className="badge">Live routing</p>
        <h2>Inter-Agent Handoff Simulator</h2>
        <p>
          Route a live query through the agent network, classify it with Gemini, and watch the handoff trail update
          against real Supabase-backed agents.
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

      <div className="handoff-mobile-tabs card">
        <button
          type="button"
          className={`handoff-mobile-tab ${mobilePane === 'map' ? 'is-active' : ''}`}
          onClick={() => setMobilePane('map')}
        >
          Map & Results
        </button>
        <button
          type="button"
          className={`handoff-mobile-tab ${mobilePane === 'query' ? 'is-active' : ''}`}
          onClick={() => setMobilePane('query')}
        >
          Send Query
        </button>
        <button
          type="button"
          className={`handoff-mobile-tab ${mobilePane === 'log' ? 'is-active' : ''}`}
          onClick={() => setMobilePane('log')}
        >
          Activity Log
        </button>
      </div>

      <div className={`handoff-grid is-${mobilePane}-active`}>
        <section className="card handoff-map-card">
          <div className="section-heading">
            <h3>Agent Network Map</h3>
            <p>{agents.length || 5} live agents connected in the routing mesh</p>
          </div>

          {isLoading ? (
            <div className="handoff-map handoff-map--loading">
              <div className="skeleton skeleton-circle" />
              <div className="skeleton skeleton-circle" />
              <div className="skeleton skeleton-circle" />
              <div className="skeleton skeleton-circle" />
              <div className="skeleton skeleton-circle" />
            </div>
          ) : (
            <div ref={mapRef} className={`handoff-map ${mapLayout.isCompact ? 'is-compact' : ''}`}>
              <div className="handoff-map__stage" style={{ width: `${mapLayout.width}px`, minWidth: `${mapLayout.width}px`, height: `${mapLayout.height}px` }}>
                <svg
                  className="handoff-map__links"
                  viewBox={`0 0 ${mapLayout.width} ${mapLayout.height}`}
                  preserveAspectRatio="none"
                >
                  {positionedAgents.map((agent, index) => {
                    const nextAgent = positionedAgents[(index + 1) % positionedAgents.length];

                    if (!nextAgent) {
                      return null;
                    }

                    return (
                      <line
                        key={`${agent.id}-${nextAgent.id}`}
                        x1={agent.x}
                        y1={agent.y}
                        x2={nextAgent.x}
                        y2={nextAgent.y}
                        className="handoff-link"
                      />
                    );
                  })}
                </svg>

                {positionedAgents.map((agent) => (
                  <article
                    key={agent.id}
                    className={`handoff-agent-node ${selectedAgentId === agent.id ? 'is-active' : ''} ${
                      routeResult?.agentId === agent.id ? 'is-route-target' : ''
                    } ${handoffResult?.targetAgentId === agent.id ? 'is-handoff-target' : ''}`}
                    style={{ left: `${agent.x}px`, top: `${agent.y}px` }}
                  >
                    <div className="handoff-agent-node__avatar">{getAgentInitials(agent.name)}</div>
                    <div className="handoff-agent-node__content">
                      <strong>{agent.name}</strong>
                      <span>{agent.department}</span>
                    </div>
                    <span className={`status-dot status-dot--${agent.status}`} />
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="handoff-routing-panel">
            <div className="handoff-routing-summary">
              <div>
                <span className="handoff-label">Query classified as</span>
                <strong>{routeResult?.department || 'Waiting for routing'}</strong>
              </div>
              <div>
                <span className="handoff-label">Routing to</span>
                <strong>
                  {routeResult?.agentName ? `${routeResult.agentName} (${routeResult.department})` : 'No agent selected'}
                </strong>
              </div>
            </div>

            {handoffResult ? (
              <div className="handoff-forward-card">
                <ArrowRightLeft size={18} />
                <div>
                  <strong>Handing off to {handoffResult.targetAgentName}</strong>
                  <p>{handoffResult.reason}</p>
                </div>
              </div>
            ) : null}

            <article className="card handoff-response-card">
              <div className="section-heading">
                <h4>Agent Response</h4>
                <p>{selectedAgent?.name || 'No agent response yet'}</p>
              </div>
              <MarkdownContent
                className="handoff-response-card__content markdown-content"
                content={selectedAgentResponse || 'Route a query to see the selected agent response here.'}
              />
            </article>
          </div>
        </section>

        <section className="card handoff-route-card">
          <div className="section-heading">
            <h3>Query Input</h3>
            <p>Type a customer query and route it into the live agent network.</p>
          </div>

          <div className="handoff-query-box">
            <textarea
              className="input handoff-query-input"
              rows="4"
              placeholder="Enter a customer query to see how it gets routed"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" className="btn handoff-route-button" onClick={() => runRouting()} disabled={isRouting}>
              <Send size={16} />
              {isRouting ? 'Routing...' : 'Route Query'}
            </button>
          </div>

          <div className="handoff-chip-row" aria-label="Example queries">
            {exampleQueries.map((exampleQuery) => (
              <button
                key={exampleQuery}
                type="button"
                className="handoff-chip"
                onClick={() => {
                  setQuery(exampleQuery);
                  runRouting(exampleQuery);
                }}
              >
                {exampleQuery}
              </button>
            ))}
          </div>
        </section>

        <section className="card handoff-trail-card">
          <div className="section-heading">
            <h3>Routing Log</h3>
            <p>Step-by-step decision trail for the current query.</p>
          </div>

          <div className="handoff-trail-list">
            {routingTrail.length === 0 ? (
              <p className="empty-state">No routing activity yet.</p>
            ) : (
              routingTrail.map((entry, index) => (
                <article key={`${entry.label}-${index}`} className="handoff-trail-item">
                  <span className="handoff-trail-index">0{index + 1}</span>
                  <div>
                    <strong>{entry.label}</strong>
                    <MarkdownContent className="handoff-trail-item__detail markdown-content" content={entry.detail} />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}