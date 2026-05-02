const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // Dashboard
  dashboard: () => request('/dashboard'),

  // Projects
  getProjects: () => request('/projects'),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: (projectId) => request(`/projects/${projectId}/members`),
  addMember: (projectId, body) => request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  removeMember: (projectId, userId) => request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (projectId) => request(`/projects/${projectId}/tasks`),
  createTask: (projectId, body) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskId, body) => request(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),
};
