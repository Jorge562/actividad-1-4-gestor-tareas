// Cliente API con fetch (credentials: same-origin para cookies de sesión)
const API_BASE = '/api';

async function fetchWithCsrf(method, url, body = null) {
 const options = {
 method,
 credentials: 'same-origin',
 headers: { 'Content-Type': 'application/json' }
 };
 if (body) options.body = JSON.stringify(body);

 // Obtener CSRF si es POST/PATCH/DELETE y no hay uno en sesión
 if (['POST', 'PATCH', 'DELETE'].includes(method)) {
 const csrfRes = await fetch(`${API_BASE}/auth/csrf`);
 const { csrfToken } = await csrfRes.json();
 options.headers['X-CSRF-Token'] = csrfToken;
 }

 const res = await fetch(API_BASE + url, options);

// Si no hay contenido (204), devolver objeto vacío
if (res.status === 204) return {};

// Intentar parsear JSON
let data = {};
try {
 data = await res.json();
} catch (e) {
 console.error('Respuesta no JSON:', await res.text());
 throw new Error(`Error ${res.status}: Respuesta no válida del servidor`);
}

if (!res.ok) throw new Error(data.error || data.errors?.[0] || `Error ${res.status}`);
return data;
}

export const api = {
 health: () => fetch(`${API_BASE}/health`).then(r => r.json()),
 csrf: () => fetch(`${API_BASE}/auth/csrf`).then(r => r.json()),
 login: (username, password) => fetchWithCsrf('POST', '/auth/login', { username, password }),
 me: () => fetch(`${API_BASE}/auth/me`).then(r => r.json()),
 logout: () => fetchWithCsrf('POST', '/auth/logout'),
 getTasks: (status = null) => {
 const url = status ? `/tasks?status=${status}` : '/tasks';
 return fetch(`${API_BASE}${url}`, { credentials: 'same-origin' }).then(r => r.json());
 },
 createTask: (title, description, status) => fetchWithCsrf('POST', '/tasks', { title, description, status }),
 updateTask: (id, patch) => fetchWithCsrf('PATCH', `/tasks/${id}`, patch),
 deleteTask: (id) => fetchWithCsrf('DELETE', `/tasks/${id}`)
};
