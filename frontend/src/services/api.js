/**
 * API service layer — all requests go through authFetch for automatic
 * JWT token attachment and transparent refresh on 401.
 *
 * The real backend runs on http://localhost:8000 (FastAPI).
 * In dev, Vite proxies /api/* to the backend automatically.
 */

// authFetch is injected at runtime from AuthContext via setAuthFetch()
let _authFetch = null;

/**
 * Called once by AuthContext on mount to inject the authenticated fetch wrapper.
 */
export function setAuthFetch(fn) {
  _authFetch = fn;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Internal fetch wrapper — uses authFetch if available, else falls back to regular fetch.
 */
function apiFetch(url, options = {}) {
  const fullUrl = `${API_BASE}${url}`;
  if (_authFetch) {
    return _authFetch(fullUrl, options);
  }
  return fetch(fullUrl, options);
}

/**
 * Returns the correct WebSocket URL, adapting between local dev (proxy) and production.
 */
export function getWsUrl(path) {
  if (API_BASE) {
    return API_BASE.replace(/^http/, 'ws') + path;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use window.location.hostname in dev to allow external connections, but .host works too
  const host = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
  return `${protocol}//${host}${path}`;
}

// ── Audio Upload & Ingestion ────────────────────────────────────────────────

/**
 * Upload an audio file for processing.
 * @param {File} file - The audio file to upload
 * @returns {Promise<{ meetingId: string, status: string, audio_url: string }>}
 */
export async function uploadAudio(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch('/api/ingest', { method: 'POST', body: formData });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Upload failed');
    throw new Error(text || `Upload failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Get the current processing status of a meeting.
 * @param {string} meetingId
 * @returns {Promise<{ status: string }>}
 */
export async function getMeetingStatus(meetingId) {
  const res = await apiFetch(`/api/meetings/${meetingId}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error(`Failed to get status: ${res.status}`);
  }
  return res.json();
}

// ── Meetings ────────────────────────────────────────────────────────────────

/**
 * List all meetings/chats.
 * @returns {Promise<Array>}
 */
export async function listMeetings() {
  const res = await apiFetch('/api/meetings');
  return res.json();
}

/**
 * Get a specific meeting by ID.
 * @param {string} meetingId
 * @returns {Promise<Object|null>}
 */
export async function getMeeting(meetingId) {
  const res = await apiFetch(`/api/meetings/${meetingId}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Delete a meeting.
 * @param {string} meetingId
 * @returns {Promise<{ status: string }>}
 */
export async function deleteMeeting(meetingId) {
  const res = await apiFetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
  return res.json();
}

// ── Chat / Query ────────────────────────────────────────────────────────────

/**
 * Send a question about a meeting and get an answer.
 * @param {string} meetingId
 * @param {string} question
 * @returns {Promise<{ answer: string, sources: Array }>}
 */
export async function sendQuery(meetingId, question) {
  const res = await apiFetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: meetingId, question }),
  });
  return res.json();
}

/**
 * Get chat history for a meeting.
 * @param {string} meetingId
 * @returns {Promise<Array>}
 */
export async function getChatHistory(meetingId) {
  const res = await apiFetch(`/api/meetings/${meetingId}/history`);
  return res.json();
}

/**
 * Clear chat history for a meeting.
 * @param {string} meetingId
 * @returns {Promise<{ status: string }>}
 */
export async function clearChatHistory(meetingId) {
  const res = await apiFetch(`/api/meetings/${meetingId}/history`, { method: 'DELETE' });
  return res.json();
}

// ── Graph Data ──────────────────────────────────────────────────────────────

/**
 * Get knowledge graph data for a meeting.
 * @param {string} meetingId
 * @returns {Promise<{ nodes: Array, links: Array }>}
 */
export async function getGraphData(meetingId) {
  const res = await apiFetch(`/api/meetings/${meetingId}/graph`);
  if (!res.ok) {
    console.error("Failed to fetch graph data");
    return { nodes: [], links: [] };
  }
  return res.json();
}
