import { useEffect, useRef } from 'react';
import { Bot, CheckCircle2, GitBranch, Lightbulb } from 'lucide-react';

const nodeIcons = {
  trigger: Lightbulb,
  agent: Bot,
  decision: GitBranch,
  action: CheckCircle2
};

export default function PipelineNode({ node, isActive = false, isSelectedBranch = false }) {
  const Icon = nodeIcons[node.type] || Lightbulb;
  const nodeRef = useRef(null);

  useEffect(() => {
    if (isActive && nodeRef.current) {
      // A small delay ensures the DOM has painted the new active state 
      // preventing the browser from instantly jumping/rushing the layout shift
      setTimeout(() => {
        nodeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 150);
    }
  }, [isActive]);

  return (
    <div
      ref={nodeRef}
      className={`pipeline-node pipeline-node--${node.type} ${isActive ? 'is-active' : ''} ${isSelectedBranch ? 'is-selected-branch' : ''}`}
      style={{ left: `${node.x}px`, top: `${node.y}px` }}
      title={`${node.label} (${node.type})`}
    >
      {node.type === 'decision' ? (
        <div className="pipeline-node__diamond">
          <Icon size={18} />
        </div>
      ) : (
        <div className="pipeline-node__body">
          <Icon size={18} />
        </div>
      )}

      <span className="pipeline-node__label">{node.label}</span>
    </div>
  );
}
