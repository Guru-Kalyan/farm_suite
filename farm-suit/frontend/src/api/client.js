/**
 * Centralized API Client for Farm Suit
 * Manages CSRF tokens, session credentials, JSON envelopes, and Blob downloads.
 */

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function ensureCsrfToken() {
  let token = getCookie('csrftoken');
  if (!token) {
    try {
      const res = await fetch('/api/accounts/csrf/', { credentials: 'include' });
      const data = await res.json();
      if (data && data.data && data.data.csrfToken) {
        token = data.data.csrfToken;
      }
    } catch (e) {
      console.warn("Could not fetch CSRF token automatically:", e);
    }
  }
  return token;
}

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include'
  };

  try {
    const response = await fetch(url, config);

    // If downloading a blob/PDF
    if (options.responseType === 'blob') {
      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        try {
          const errJson = await response.json();
          errorMsg = errJson.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      return await response.blob();
    }

    const data = await response.json().catch(() => ({
      success: false,
      message: `Failed to parse response (Status ${response.status})`
    }));

    if (!response.ok || data.success === false) {
      const error = new Error(data.message || 'Request failed');
      error.status = response.status;
      error.errors = data.errors || {};
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      err.message = 'Unable to connect to server. Please check your network or backend service.';
    }
    throw err;
  }
}

export async function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}
