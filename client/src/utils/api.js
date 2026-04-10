const FALLBACK_API_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001/api`
  : 'http://localhost:3001/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || FALLBACK_API_BASE_URL;

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const fetchAgents = () => request('/agents');
export const fetchAgent = (id) => request(`/agents/${id}`);
export const fetchDashboardOverview = () => request('/dashboard/overview');
export const sendChatMessage = (agentId, message, history) =>
  request('/chat', {
    method: 'POST',
    body: JSON.stringify({ agentId, message, history })
  });
export const routeQuery = (query) =>
  request('/chat/route', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
export const fetchArticles = (category) => request(category ? `/kb?category=${encodeURIComponent(category)}` : '/kb');
export const fetchArticle = (id) => request(`/kb/${id}`);
export const createArticle = (data) =>
  request('/kb', {
    method: 'POST',
    body: JSON.stringify(data)
  });
export const updateArticle = (id, data) =>
  request(`/kb/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
export const fetchVersions = (articleId) => request(`/kb/${articleId}/versions`);
export const deleteArticle = (id) =>
  request(`/kb/${id}`, {
    method: 'DELETE'
  });
export const fetchLogs = (filters = {}) => {
  const params = new URLSearchParams(filters);
  const query = params.toString();
  return request(query ? `/logs?${query}` : '/logs');
};
export const fetchLogStats = () => request('/logs/stats');
export const fetchWorkflows = () => request('/workflows');
