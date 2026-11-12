const API_BASE = '/api/parking';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const rawText = await res.text();
  let data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(res.ok ? 'Invalid JSON response from server' : `Server error (${res.status})`);
    }
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const parkingApi = {
  getStatus: () => request('/status'),
  scanRfid: (rfidTag, vehicleId) =>
    request('/rfid-scan', {
      method: 'POST',
      body: JSON.stringify({ rfidTag, vehicleId }),
    }),
  setGate: (status) =>
    request('/gate', {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  processEntry: ({ slotId, vehicleId, rfidTag }) =>
    request('/entry', {
      method: 'POST',
      body: JSON.stringify({ slotId, vehicleId, rfidTag }),
    }),
  processExit: (slotId) =>
    request('/exit', {
      method: 'POST',
      body: JSON.stringify({ slotId }),
    }),
  resetAll: () =>
    request('/reset', {
      method: 'POST',
    }),
  fillDemo: () =>
    request('/fill-demo', {
      method: 'POST',
    }),
};
