// ==========================================
// API SERVICE LAYER — Local-First Mode
// ==========================================
// All auth functions removed. Only scan operations remain.

const API_BASE = import.meta.env.PROD ? 'http://localhost:3000/api' : '/api';

/**
 * Wrapper around fetch() that automatically:
 * - Adds Content-Type: application/json
 * - Parses the JSON response
 * - Throws an error if the response is not OK
 */
async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// ─── Scans ─────────────────────────────────────────
export async function createScan(url, toolType, geminiKey = null) {
  const body = { url, toolType };
  if (geminiKey) body.geminiKey = geminiKey;

  return request('/scans', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getScans() {
  return request('/scans');
}

export async function getScanById(id) {
  return request(`/scans/${id}`);
}
