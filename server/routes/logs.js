import { Router } from 'express';
import { supabase } from '../supabase.js';
import { recordAgentActivity } from '../agentActivity.js';
import { registerAgentLogStream } from '../logStream.js';

const router = Router();

router.get('/stream', (request, response) => {
  registerAgentLogStream(response);
});

router.get('/', async (request, response, next) => {
  try {
    const { severity, department, agent_name, limit = '50' } = request.query;
    let query = supabase
      .from('agent_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number.parseInt(limit, 10) || 50);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (agent_name) {
      query = query.eq('agent_name', agent_name);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    response.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const { agent_name, agentName, action, details, severity = 'info', department } = request.body || {};
    if (!(agent_name || agentName) || !action) {
      return response.status(400).json({ error: 'agent_name and action are required' });
    }

    const data = await recordAgentActivity({
      agent_name,
      agentName,
      action,
      details,
      severity,
      department
    });

    if (!data) {
      return response.status(500).json({ error: 'Unable to record agent log' });
    }

    response.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (request, response, next) => {
  try {
    const [{ data: severityData, error: severityError }, { data: departmentData, error: departmentError }, { count, error: countError }] = await Promise.all([
      supabase.from('agent_logs').select('severity'),
      supabase.from('agent_logs').select('department'),
      supabase
        .from('agent_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    if (severityError) {
      throw severityError;
    }

    if (departmentError) {
      throw departmentError;
    }

    if (countError) {
      throw countError;
    }

    const severityTotals = (severityData ?? []).reduce((accumulator, entry) => {
      const key = entry.severity || 'unknown';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const departmentTotals = (departmentData ?? []).reduce((accumulator, entry) => {
      const key = entry.department || 'unknown';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    response.json({
      total: (severityData ?? []).length,
      bySeverity: severityTotals,
      byDepartment: departmentTotals,
      last24h: count || 0
    });
  } catch (error) {
    next(error);
  }
});

export default router;
