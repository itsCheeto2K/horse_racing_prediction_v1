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

export function getStoredGeminiKey() {
  try {
    return localStorage.getItem('gemini_api_key') || '';
  } catch (e) {
    return '';
  }
}

export function setStoredGeminiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  } catch (e) {
    console.warn('Could not persist Gemini API key:', e);
  }
}

export function removeStoredGeminiKey() {
  try {
    localStorage.removeItem('gemini_api_key');
  } catch (e) {
    console.warn('Could not remove Gemini API key:', e);
  }
}

export async function validateGeminiKey(key) {
  const cleanKey = (key || '').trim();
  if (!cleanKey) {
    throw new Error('Vui lòng nhập API Key.');
  }

  // 1. Try validating via backend endpoint
  try {
    const res = await fetch(`${API_BASE}/ai/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: cleanKey })
    });
    if (res.ok) {
      return res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error(err.detail || 'API Key không hợp lệ.');
    }
  } catch (err) {
    // If it's a specific validation failure from backend, rethrow
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  // 2. Direct fallback check to Google Generative Language API
  try {
    const directRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    if (directRes.ok) {
      return { status: 'success', message: 'Gemini API Key hợp lệ và đã kích hoạt thành công!' };
    }
    const directErr = await directRes.json().catch(() => ({}));
    const msg = directErr?.error?.message || `Lỗi Google API (${directRes.status})`;
    throw new Error(msg);
  } catch (err) {
    throw new Error(err.message || 'Không thể xác thực API Key với Google.');
  }
}

export async function analyzeRaceWithAI(form, prediction, customApiKey = null) {
  const apiKey = customApiKey || getStoredGeminiKey() || null;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['x-gemini-api-key'] = apiKey;
  }

  const res = await fetch(`${API_BASE}/ai/analyze-race`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      form,
      prediction,
      gemini_api_key: apiKey
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate AI analysis');
  }
  return res.json();
}

export async function submitPostMortem(raceInfo, predictedTop3, actualTop3, allPredictions = [], customApiKey = null) {
  const apiKey = customApiKey || getStoredGeminiKey() || null;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['x-gemini-api-key'] = apiKey;
  }

  const res = await fetch(`${API_BASE}/ai/post-mortem`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      race_info: raceInfo,
      predicted_top3: predictedTop3,
      actual_top3: actualTop3,
      all_predictions: allPredictions,
      gemini_api_key: apiKey
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

