const envApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/+$/, '')}/api` : '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchMeetings(date, raceCode = 'gallops') {
  const res = await fetch(`${API_BASE}/meetings?date=${encodeURIComponent(date)}&race_code=${encodeURIComponent(raceCode)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch meetings');
  }
  return res.json();
}

export async function fetchRaceAndPrediction(date, track, race, raceCode = 'gallops', simulations = 10000) {
  const url = `${API_BASE}/race?date=${encodeURIComponent(date)}&track=${encodeURIComponent(track)}&race=${race}&race_code=${encodeURIComponent(raceCode)}&simulations=${simulations}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch race details');
  }
  return res.json();
}

export async function simulateCustomWeights(date, track, race, raceCode = 'gallops', weights, simulations = 10000) {
  const res = await fetch(`${API_BASE}/race/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date,
      track,
      race,
      race_code: raceCode,
      simulations,
      weights
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to re-simulate predictions');
  }
  return res.json();
}

export async function fetchVenues(raceType = 'gallops') {
  const res = await fetch(`${API_BASE}/venues?raceType=${encodeURIComponent(raceType)}`);
  if (!res.ok) throw new Error('Failed to fetch venues');
  return res.json();
}
