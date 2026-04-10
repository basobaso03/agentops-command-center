import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase.js';
import { recordAgentActivity } from './agentActivity.js';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('Missing GEMINI_API_KEY in environment variables.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

const functionDeclarations = [
  {
    name: 'search_knowledge_base',
    description: 'Search the company knowledge base for relevant articles',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Search terms to look up in the knowledge base'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'log_action',
    description: 'Log an action to the system',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: {
          type: 'STRING',
          description: 'Short action label'
        },
        details: {
          type: 'STRING',
          description: 'Detailed log message'
        },
        severity: {
          type: 'STRING',
          description: 'Log severity level'
        }
      },
      required: ['action', 'details', 'severity']
    }
  },
  {
    name: 'handoff_to_agent',
    description: 'Hand off the conversation to another specialist agent',
    parameters: {
      type: 'OBJECT',
      properties: {
        target_agent: {
          type: 'STRING',
          description: 'Name of the specialist agent'
        },
        reason: {
          type: 'STRING',
          description: 'Why the handoff is needed'
        }
      },
      required: ['target_agent', 'reason']
    }
  }
];

function normaliseHistory(chatHistory = []) {
  if (!Array.isArray(chatHistory)) {
    return [];
  }

  return chatHistory
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      if (entry.role === 'system') {
        return null;
      }

      const content = typeof entry.content === 'string' ? entry.content : entry.text;

      if (!content) {
        return null;
      }

      return {
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      };
    })
    .filter(Boolean);
}

function buildHandoff(targetAgent, reason) {
  return {
    handoff: {
      target_agent: targetAgent,
      reason
    }
  };
}

async function executeFunctionCall(functionCall) {
  const args = functionCall.args ?? {};

  if (functionCall.name === 'search_knowledge_base') {
    const query = String(args.query || '').trim();

    if (!query) {
      return {
        response: { results: [] }
      };
    }

    const { data, error } = await supabase
      .from('kb_articles')
      .select('id, title, content, category, version, status, updated_at')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return {
      response: { results: data ?? [] }
    };
  }

  if (functionCall.name === 'log_action') {
    const payload = {
      action: String(args.action || 'Agent action'),
      details: String(args.details || ''),
      severity: String(args.severity || 'info')
    };

    const data = await recordAgentActivity(payload);

    return {
      response: { log: data }
    };
  }

  if (functionCall.name === 'handoff_to_agent') {
    return {
      response: { status: 'Handoff initiated successfully.' },
      ...buildHandoff(String(args.target_agent || 'Specialist Agent'), String(args.reason || ''))
    };
  }

  return {
    response: { error: `Unknown function call: ${functionCall.name}` }
  };
}

function buildFallbackResponse(agentSystemPrompt, userMessage, chatHistory) {
  const historyCount = Array.isArray(chatHistory) ? chatHistory.length : 0;
  const promptSnippet = String(agentSystemPrompt || '').slice(0, 120).trim();

  return {
    response: `Local fallback response: I received your message about "${userMessage}". The Gemini API is currently unavailable for this project, so this development fallback is being returned instead. Context seen: ${historyCount} prior messages. ${promptSnippet ? `Agent context: ${promptSnippet}` : ''}`.trim(),
    functionCalls: [],
    handoff: null,
    fallback: true
  };
}

function parseJsonResponse(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (parseError) {
    const match = String(text).match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch (nestedParseError) {
      return null;
    }
  }
}

function isTransientGeminiError(error) {
  const message = String(error?.message || error || '').toLowerCase();

  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('500') ||
    message.includes('resource_exhausted') ||
    message.includes('service unavailable') ||
    message.includes('high demand') ||
    message.includes('overloaded')
  );
}

function normaliseDepartment(value) {
  const key = String(value || '').trim().toLowerCase();

  const departmentMap = {
    sales: 'Sales',
    'customer support': 'Customer Support',
    support: 'Customer Support',
    customer_support: 'Customer Support',
    compliance: 'Compliance',
    hr: 'HR',
    'human resources': 'HR',
    operations: 'Operations',
    ops: 'Operations'
  };

  return departmentMap[key] || null;
}

function fallbackRouteClassification(query) {
  const normalizedQuery = String(query || '').toLowerCase();

  if (/invoice|refund|support|ticket|customer|billing|issue/.test(normalizedQuery)) {
    return {
      department: 'Customer Support',
      reasoning: 'The query contains support and billing keywords that map to customer support.',
      source: 'fallback'
    };
  }

  if (/po(pi|)a|compliance|privacy|regulation|policy|audit|security|data protection/.test(normalizedQuery)) {
    return {
      department: 'Compliance',
      reasoning: 'The query references compliance, privacy, or policy controls.',
      source: 'fallback'
    };
  }

  if (/employee|onboarding|new hire|hr|benefit|start/.test(normalizedQuery)) {
    return {
      department: 'HR',
      reasoning: 'The query is about employee onboarding or HR processes.',
      source: 'fallback'
    };
  }

  if (/process|workflow|bottleneck|performance|ops|processing time|delay|operations/.test(normalizedQuery)) {
    return {
      department: 'Operations',
      reasoning: 'The query focuses on operational performance or process improvement.',
      source: 'fallback'
    };
  }

  return {
    department: 'Sales',
    reasoning: 'The query is commercial in nature and best handled by sales.',
    source: 'fallback'
  };
}

export async function classifyRoutingQuery(query) {
  const routingModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction:
      'You are a routing AI. Classify customer queries into one of these departments: Sales, Customer Support, Compliance, HR, Operations. Return only JSON with keys department and reasoning.'
  });

  try {
    const result = await routingModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Classify this query: ${query}` }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const text = result.response?.text?.() || '';
    const parsed = parseJsonResponse(text);

    if (!parsed?.department) {
      return fallbackRouteClassification(query);
    }

    const department = normaliseDepartment(parsed.department);

    if (!department) {
      return fallbackRouteClassification(query);
    }

    return {
      department,
      reasoning: String(parsed.reasoning || 'Routed by Gemini classification.'),
      source: 'gemini'
    };
  } catch (error) {
    if (isTransientGeminiError(error)) {
      return fallbackRouteClassification(query);
    }

    throw error;
  }
}

export async function chatWithAgent(agentSystemPrompt, userMessage, chatHistory = []) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: agentSystemPrompt,
      tools: [{ functionDeclarations }]
    });

    const chat = model.startChat({
      history: normaliseHistory(chatHistory)
    });

    const functionCalls = [];
    let handoff = null;
    let result = await chat.sendMessage(userMessage);
    let responseText = '';

    for (let iteration = 0; iteration < 6; iteration += 1) {
      const candidate = result.response?.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const textParts = parts.map((part) => part.text).filter(Boolean);
      if (textParts.length > 0) {
        responseText = textParts.join('\n').trim();
      }

      const calls = parts.map((part) => part.functionCall).filter(Boolean);

      if (calls.length === 0) {
        break;
      }

      for (const functionCall of calls) {
        functionCalls.push({
          name: functionCall.name,
          args: functionCall.args ?? {}
        });

        const executionResult = await executeFunctionCall(functionCall);

        if (executionResult.handoff) {
          handoff = executionResult.handoff;
        }

        result = await chat.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: executionResult.response ?? executionResult
            }
          }
        ]);
      }
    }

    if (!responseText) {
      responseText = result.response?.text?.() || '';
    }

    return {
      response: responseText,
      functionCalls,
      handoff
    };
  } catch (error) {
    if (isTransientGeminiError(error)) {
      return buildFallbackResponse(agentSystemPrompt, userMessage, chatHistory);
    }

    throw error;
  }
}
