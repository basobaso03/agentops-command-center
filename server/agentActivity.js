import { supabase } from './supabase.js';
import { publishAgentLog } from './logStream.js';

function normalizePayload(payload = {}) {
  return {
    agent_name: payload.agent_name || payload.agentName || 'Unknown agent',
    action: payload.action || 'agent_activity',
    details: payload.details || '',
    severity: payload.severity || 'info',
    department: payload.department || null
  };
}

export async function recordAgentActivity(payload) {
  const entry = normalizePayload(payload);

  try {
    const { data, error } = await supabase.from('agent_logs').insert([entry]).select('*').single();

    if (error) {
      throw error;
    }

    publishAgentLog(data);
    return data;
  } catch (error) {
    console.error('Unable to record agent activity', error);
    return null;
  }
}