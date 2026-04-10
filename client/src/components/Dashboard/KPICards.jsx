import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, TrendingUp, Zap } from 'lucide-react';

const cards = [
  { key: 'activeAgents', label: 'Active Agents', icon: Bot, accent: 'blue' },
  { key: 'tasksCompleted', label: 'Tasks Completed', icon: CheckCircle2, accent: 'green' },
  { key: 'avgResponse', label: 'Avg Response Time', icon: Zap, accent: 'amber' },
  { key: 'successRate', label: 'Success Rate', icon: TrendingUp, accent: 'purple' }
];

function animateValue(target) {
  const steps = 28;
  const increment = target / steps;
  return Array.from({ length: steps }, (_, index) => Math.round(increment * (index + 1)));
}

export default function KPICards({ stats = {}, isLoading = false }) {
  const values = {
    activeAgents: Number(stats.activeAgents || 0),
    tasksCompleted: Number(stats.tasksCompleted || 0),
    avgResponse: Number(stats.avgResponse || 0),
    successRate: Number(stats.successRate || 0)
  };

  const [displayValues, setDisplayValues] = useState({
    activeAgents: 0,
    tasksCompleted: 0,
    avgResponse: 0,
    successRate: 0
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const sequences = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, animateValue(value)])
    );

    let frame = 0;
    const interval = window.setInterval(() => {
      setDisplayValues({
        activeAgents: sequences.activeAgents[Math.min(frame, sequences.activeAgents.length - 1)] || 0,
        tasksCompleted: sequences.tasksCompleted[Math.min(frame, sequences.tasksCompleted.length - 1)] || 0,
        avgResponse: sequences.avgResponse[Math.min(frame, sequences.avgResponse.length - 1)] || 0,
        successRate: sequences.successRate[Math.min(frame, sequences.successRate.length - 1)] || 0
      });

      frame += 1;

      if (frame >= 28) {
        window.clearInterval(interval);
      }
    }, 24);

    return () => window.clearInterval(interval);
  }, [isLoading, values.activeAgents, values.avgResponse, values.successRate, values.tasksCompleted]);

  return (
    <section className="kpi-grid">
      {cards.map(({ key, label, icon: Icon, accent }) => (
        <article key={key} className="card kpi-card">
          <div className={`kpi-icon kpi-icon--${accent}`}>
            <Icon size={18} />
          </div>
          <p className="kpi-label">{label}</p>
          {isLoading ? (
            <div data-testid="dashboard-skeleton" className="skeleton skeleton-value" />
          ) : (
            <h3 className="kpi-value">
              {key === 'avgResponse'
                ? `${displayValues[key]}ms`
                : key === 'successRate'
                  ? `${displayValues[key]}%`
                  : displayValues[key].toLocaleString()}
            </h3>
          )}
        </article>
      ))}
    </section>
  );
}