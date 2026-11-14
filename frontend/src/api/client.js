const BASE_URL = 'http://127.0.0.1:8080/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });

    // Read body ONCE as text, then parse — avoids "body stream already read" error
    const rawText = await res.text();

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = JSON.parse(rawText);
        if (errorJson.error) errorMsg = errorJson.error;
      } catch (_) {
        if (rawText) errorMsg = rawText;
      }
      throw new Error(errorMsg);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(rawText);
      } catch (_) {
        throw new Error(`Invalid JSON response from ${endpoint}: ${rawText.slice(0, 120)}`);
      }
    }
    return rawText;
  } catch (err) {
    console.error(`API Request Failed [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // System Health
  getStatus: () => request('/status'),

  // Thermal FEA
  solveFEA: (params) => request('/fea/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }),
  getConvergence: (params = {}) => request('/fea/convergence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }),
  exportFEACsv: async (params) => {
    const res = await fetch(`${BASE_URL}/fea/export-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.blob();
  },

  // Geometry (Universal: Binary & ASCII STL, Any CSV format)
  parseSTL: (stlData) => request('/geometry/parse-stl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: stlData
  }),
  parseAnsysCSV: (csvContent) => request('/geometry/parse-ansys-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: csvContent
  }),
  getSampleSTL: () => request('/geometry/sample-stl'),
  getSampleAnsysCSV: () => request('/geometry/sample-ansys-csv'),
  getSamplePowerUnitSTL: () => request('/geometry/sample-powerunit-stl'),
  getSamplePowerUnitAnsysCSV: () => request('/geometry/sample-powerunit-ansys-csv'),
  // Backward compatibility aliases
  getSampleLionSTL: () => request('/geometry/sample-powerunit-stl'),
  getSampleLionAnsysCSV: () => request('/geometry/sample-powerunit-ansys-csv'),

  // Performance Benchmark
  runBenchmark: (config) => request('/benchmark/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  }),

  // Hardware Mock
  getDevices: () => request('/hardware/devices'),
  connectDevice: (id) => request('/hardware/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }),
  disconnectDevice: (id) => request('/hardware/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }),
  injectFailure: (id, type = 'TIMEOUT') => request('/hardware/inject-failure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type })
  }),
  recoverDevice: (id) => request('/hardware/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }),
  getHardwareDoc: () => request('/hardware/architecture-doc'),

  // Neural Network Backprop
  simulateNeuralNet: (params = { learning_rate: 0.1, steps: 100 }) => request('/neural/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }),
  exportNeuralCsv: async (params) => {
    const res = await fetch(`${BASE_URL}/neural/export-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.blob();
  }
};
