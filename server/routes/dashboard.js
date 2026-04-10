import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

function buildDateLabels(dayCount) {
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (dayCount - index - 1));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });
}

function buildDepartmentSummary(agents, departments) {
  return departments.map((department) => {
    const departmentAgents = agents.filter((agent) => agent.department === department);

    return {
      department,
      activeCount: departmentAgents.filter((agent) => agent.status === 'active').length,
      taskTotal: departmentAgents.reduce((total, agent) => total + Number(agent.tasks_completed || 0), 0),
      agentCount: departmentAgents.length
    };
  });
}

function buildSeries(logs, departments, dayCount) {
  const labels = buildDateLabels(dayCount);
  const series = labels.map(({ key, label }) => {
    const row = { label };

    for (const department of departments) {
      row[department] = 0;
    }

    for (const log of logs) {
      const logDateKey = new Date(log.created_at).toISOString().slice(0, 10);
      if (logDateKey !== key) {
        continue;
      }

      const departmentKey = log.department || 'Unassigned';
      row[departmentKey] = (row[departmentKey] || 0) + 1;
    }

    return row;
  });

  return series;
}

async function fetchAllRows(table, columns, orderBy = 'created_at') {
  const { data, error } = await supabase.from(table).select(columns).order(orderBy, { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

router.get('/overview', async (request, response, next) => {
  try {
    const agentsPromise = fetchAllRows('agents', 'id, name, department, status, tasks_completed, avg_response_ms, created_at', 'created_at');
    const logsPromise = fetchAllRows('agent_logs', 'id, agent_name, action, details, severity, department, created_at', 'created_at');

    const [agents, logs] = await Promise.all([agentsPromise, logsPromise]);

    const departments = Array.from(
      new Set([
        ...agents.map((agent) => agent.department).filter(Boolean),
        ...logs.map((log) => log.department).filter(Boolean)
      ])
    );

    const activeAgents = agents.filter((agent) => agent.status === 'active').length;
    const tasksCompleted = agents.reduce((total, agent) => total + Number(agent.tasks_completed || 0), 0);
    const avgResponse = agents.length
      ? Math.round(agents.reduce((total, agent) => total + Number(agent.avg_response_ms || 0), 0) / agents.length)
      : 0;
    const successRate = logs.length
      ? Math.round((logs.filter((log) => log.severity === 'success').length / logs.length) * 100)
      : 0;

    const recentLogs = logs.slice(0, 10);

    const departmentSummary = buildDepartmentSummary(agents, departments);

    const last7Days = buildSeries(logs, departments, 7);
    const last30Days = buildSeries(logs, departments, 30);
    const last90Days = buildSeries(logs, departments, 90);

    response.json({
      stats: {
        totalAgents: agents.length,
        totalLogs: logs.length,
        activeAgents,
        tasksCompleted,
        avgResponse,
        successRate
      },
      recentLogs,
      departmentSummary,
      trend: {
        departments,
        seriesByRange: {
          '7d': last7Days,
          '30d': last30Days,
          '90d': last90Days
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;