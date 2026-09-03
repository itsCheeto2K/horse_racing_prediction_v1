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

export async function fetchRaceAndPrediction(
  date,
  track,
  race,
  raceCode = 'gallops',
  simulations = 10000,
  country = null,
  timezone = null
) {
  let url = `${API_BASE}/race?date=${encodeURIComponent(date)}&track=${encodeURIComponent(track)}&race=${race}&race_code=${encodeURIComponent(raceCode)}&simulations=${simulations}`;
  if (country) url += `&country=${encodeURIComponent(country.toLowerCase())}`;
  if (timezone) url += `&timezone=${encodeURIComponent(timezone)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch race details');
  }
  return res.json();
}

export async function simulateCustomWeights(
  date,
  track,
  race,
  raceCode = 'gallops',
  weights = null,
  simulations = 10000,
  country = null,
  timezone = null
) {
  const res = await fetch(`${API_BASE}/race/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date,
      track,
      race,
      race_code: raceCode,
      simulations,
      weights,
      country: country ? country.toLowerCase() : null,
      timezone: timezone || null
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

export async function analyzeRaceWithAI(form, prediction) {
  const res = await fetch(`${API_BASE}/ai/analyze-race`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form, prediction })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate AI analysis');
  }
  return res.json();
}

export async function submitPostMortem(raceInfo, predictedTop3, actualTop3, allPredictions = []) {
  const res = await fetch(`${API_BASE}/ai/post-mortem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      race_info: raceInfo,
      predicted_top3: predictedTop3,
      actual_top3: actualTop3,
      all_predictions: allPredictions
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit post-mortem evaluation');
  }
  return res.json();
}

export async function fetchAIMemory() {
  const res = await fetch(`${API_BASE}/ai/memory`);
  if (!res.ok) throw new Error('Failed to fetch AI memory');
  return res.json();
}

export async function deleteAILesson(lessonId) {
  const res = await fetch(`${API_BASE}/ai/memory/lessons/${lessonId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete lesson');
  return res.json();
}

export async function resetAIMemory() {
  const res = await fetch(`${API_BASE}/ai/memory/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset AI memory');
  return res.json();
}

