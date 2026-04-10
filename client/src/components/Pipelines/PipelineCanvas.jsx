import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import PipelineNode from './PipelineNode';

function buildConnections(steps = []) {
  return steps.slice(1).map((step, index) => ({
    from: steps[index],
    to: step
  }));
}

function buildPath(from, to) {
  const startX = from.x + 70;
  const startY = from.y + 28;
  const endX = to.x + 70;
  const endY = to.y + 28;
  const midX = (startX + endX) / 2;
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

export default function PipelineCanvas({ workflow }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [outputMessage, setOutputMessage] = useState('');
  const [simulationState, setSimulationState] = useState('idle');
  const timerRef = useRef(null);
  const activeNode = activeIndex >= 0 ? workflow?.steps?.[activeIndex] : null;

  const connections = useMemo(() => buildConnections(workflow?.steps || []), [workflow]);

  useEffect(() => {
    return () => {
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      }
    };
  }, []);

  function stopSimulation() {
    if (Array.isArray(timerRef.current)) {
      timerRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    }

    setActiveIndex(-1);
    setSelectedBranchId('');
    setOutputMessage('');
    setSimulationState('idle');
    timerRef.current = [];
  }

  function runSimulation() {
    if (!workflow?.steps?.length) {
      return;
    }

    stopSimulation();
    setSimulationState('running');

    const decisionNodeIndex = workflow.steps.findIndex((step) => step.type === 'decision');
    const branchNode =
      workflow.steps[decisionNodeIndex + (Math.random() > 0.5 ? 1 : 2)] || workflow.steps[workflow.steps.length - 1];

    const timeline = workflow.steps.map((step, index) => ({
      index,
      label: step.label,
      delay: 700 + index * 500
    }));

    timerRef.current = [];

    timeline.forEach(({ index, label, delay }) => {
      const timeoutId = window.setTimeout(() => {
        setActiveIndex(index);

        if (index === decisionNodeIndex) {
          setOutputMessage('Decision point reached. Evaluating branch.');
        }

        if (workflow.steps[index]?.id === branchNode.id) {
          setSelectedBranchId(branchNode.id);
          setOutputMessage(`Selected output: ${branchNode.label}`);
        } else {
          setOutputMessage(`Step completed: ${label}`);
        }

        if (index === timeline.length - 1) {
          setSimulationState('completed');
        }
      }, delay);

      timerRef.current.push(timeoutId);
    });

    const completionTimerId = window.setTimeout(() => {
      setSimulationState('completed');
    }, 700 + timeline.length * 500 + 350);

    timerRef.current.push(completionTimerId);
  }

  return (
    <section className="card pipeline-canvas-card">
      <div className="pipeline-canvas__header">
        <div>
          <h3>{workflow?.name || 'Select a workflow'}</h3>
          <p>{workflow?.description || 'No workflow selected'}</p>
        </div>

        <button type="button" className="btn" onClick={simulationState === 'running' ? stopSimulation : runSimulation}>
          <Play size={16} />
          {simulationState === 'running' ? 'Stop' : 'Simulate'}
        </button>
      </div>

      <div className="pipeline-canvas">
        <div className="pipeline-canvas__stage">
          <svg className="pipeline-canvas__lines" viewBox="0 0 900 420" preserveAspectRatio="none">
            {connections.map((connection) => (
              <path key={`${connection.from.id}-${connection.to.id}`} d={buildPath(connection.from, connection.to)} />
            ))}
            <circle
              className={`pipeline-flow-dot ${activeNode ? 'is-visible' : ''}`}
              cx={activeNode ? activeNode.x + 70 : 0}
              cy={activeNode ? activeNode.y + 28 : 0}
              r="6"
            />
          </svg>

          <div className="pipeline-canvas__nodes">
            {(workflow?.steps || []).map((step, index) => (
              <PipelineNode
                key={step.id}
                node={step}
                isActive={index === activeIndex}
                isSelectedBranch={step.id === selectedBranchId}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pipeline-canvas__output card">
        {simulationState === 'idle' ? <p>Press simulate to run the selected workflow.</p> : null}
        {simulationState !== 'idle' ? <p>{outputMessage}</p> : null}
      </div>
    </section>
  );
}