import { Router } from 'express';
import { supabase } from '../supabase.js';
import { chatWithAgent, classifyRoutingQuery } from '../gemini.js';
import { recordAgentActivity } from '../agentActivity.js';

const router = Router();

function previewText(value, maxLength = 120) {
  const text = String(value || '').trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

router.post('/', async (request, response, next) => {
  let currentAgent = null;

  try {
    const { agentId, message, history = [] } = request.body || {};

    if (!agentId || !message) {
      return response.status(400).json({ error: 'agentId and message are required' });
    }

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, department, system_prompt')
      .eq('id', agentId)
      .maybeSingle();

    currentAgent = agent;

    if (agentError) {
      throw agentError;
    }

    if (!agent) {
      return response.status(404).json({ error: 'Agent not found' });
    }

    const { error: userMessageError } = await supabase.from('chat_messages').insert([
      {
        agent_id: agent.id,
        role: 'user',
        content: message,
        metadata: { history_length: Array.isArray(history) ? history.length : 0 }
      }
    ]);

    if (userMessageError) {
      throw userMessageError;
    }

    void recordAgentActivity({
      agent_name: agent.name,
      department: agent.department,
      action: 'chat_received',
      details: `Received message: ${previewText(message)}`,
      severity: 'info'
    });

    const assistantReply = await chatWithAgent(agent.system_prompt || '', message, history);

    const { error: assistantMessageError } = await supabase.from('chat_messages').insert([
      {
        agent_id: agent.id,
        role: 'assistant',
        content: assistantReply.response,
        metadata: {
          functionCalls: assistantReply.functionCalls,
          handoff: assistantReply.handoff
        }
      }
    ]);

    if (assistantMessageError) {
      throw assistantMessageError;
    }

    void recordAgentActivity({
      agent_name: agent.name,
      department: agent.department,
      action: assistantReply.fallback ? 'chat_fallback_used' : 'chat_response_generated',
      details: assistantReply.fallback
        ? `Gemini fallback returned: ${previewText(assistantReply.response)}`
        : `Assistant response generated${assistantReply.handoff ? ` with handoff to ${assistantReply.handoff.target_agent}` : ''}`,
      severity: assistantReply.fallback ? 'warning' : 'success'
    });

    if (assistantReply.handoff) {
      void recordAgentActivity({
        agent_name: agent.name,
        department: agent.department,
        action: 'handoff_requested',
        details: `Handoff target: ${assistantReply.handoff.target_agent}. Reason: ${previewText(assistantReply.handoff.reason)}`,
        severity: 'info'
      });
    }

    response.json(assistantReply);
  } catch (error) {
    void recordAgentActivity({
      agent_name: currentAgent?.name || request.body?.agentName || request.body?.agent_name || 'Unknown agent',
      department: currentAgent?.department,
      action: 'chat_failed',
      details: String(error?.message || error),
      severity: 'error'
    });

    next(error);
  }
});

router.post('/route', async (request, response, next) => {
  try {
    const { query } = request.body || {};

    if (!query) {
      return response.status(400).json({ error: 'query is required' });
    }

    const classification = await classifyRoutingQuery(query);

    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, department, status')
      .eq('department', classification.department)
      .order('status', { ascending: false });

    if (agentsError) {
      throw agentsError;
    }

    const agentList = Array.isArray(agents) ? agents : [];
    const selectedAgent =
      agentList.find((agent) => agent.status === 'active') || agentList[0] || null;

    if (!selectedAgent) {
      void recordAgentActivity({
        agent_name: 'Router',
        department: classification.department,
        action: 'route_failed',
        details: `No agent found for department: ${classification.department}. Query: ${previewText(query)}`,
        severity: 'error'
      });

      return response.status(404).json({
        error: `No agent found for department: ${classification.department}`
      });
    }

    void recordAgentActivity({
      agent_name: 'Router',
      department: classification.department,
      action: classification.source === 'fallback' ? 'route_classified_fallback' : 'route_classified',
      details: `Routed to ${selectedAgent.name}. Reason: ${previewText(classification.reasoning)}`,
      severity: classification.source === 'fallback' ? 'warning' : 'success'
    });

    response.json({
      department: classification.department,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      reasoning: classification.reasoning
    });
  } catch (error) {
    next(error);
  }
});

export default router;
