// API base URL (override by setting localStorage.API_BASE in the console)
// Example: localStorage.setItem('API_BASE', 'http://localhost:5257')
const API_BASE = localStorage.getItem('API_BASE') || '';

/*
  BACKEND MODE:
  Your Program.cs uses cookie-based auth (AddCookie). To make that work
  the browser must send credentials (include) so the hippo.auth cookie is set
  and later sent with each request.
*/
const USE_COOKIES = true;

// Redirect targets (relative to user_login folder)
// After successful login or signup, send users to the main dashboard page
const PATH_AFTER_SIGNUP = 'dashboard.html';
const PATH_AFTER_LOGIN = 'dashboard.html';

// Optional: path to send the user to if an auth check fails on a protected page
const LOGIN_PAGE_REL = 'login.html';

/* ----------- Core fetch helpers ----------- */
async function postJson(path, payload, opts = {}) {
  const req = new Request(`${API_BASE}${path}`);
  const res = await fetch(req, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In cookie mode we do not need Authorization header
      ...(USE_COOKIES ? {} : opts.headers || {})
    },
    body: JSON.stringify(payload),
    credentials: USE_COOKIES ? 'include' : 'omit'
  });

  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    try { data = await res.text(); } catch { data = null; }
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.title || data.error)) || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: USE_COOKIES ? 'include' : 'omit',
    headers: USE_COOKIES ? {} : authHeader()
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

/* ----------- Auth header (token mode fallback) ----------- */
function authHeader() {
  if (USE_COOKIES) return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

/* ----------- UI utility ----------- */
function toggleSubmitting(button, isSubmitting, busyText = 'Processing...') {
  if (!button) return;
  if (isSubmitting) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

/* ----------- Logout ----------- */
async function logout() {
  try {
    if (USE_COOKIES) {
      // In cookie mode notify server to clear cookie
      await postJson('/api/logout', {});
    } else {
      // Token mode: discard client token
      localStorage.removeItem('auth_token');
    }
  } catch (e) {
    console.warn('Logout warning:', e);
  } finally {
    // Always go to root or login
    window.location.href = '../../index.html';
  }
}
window.logout = logout;

/* ----------- Session check (call on protected pages) ----------- */
// Example usage on dashboard:
// sessionCheck().catch(() => window.location.href = '../login.html');
async function sessionCheck() {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: 'GET',
    credentials: USE_COOKIES ? 'include' : 'omit',
    headers: USE_COOKIES ? {} : authHeader()
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}
window.sessionCheck = sessionCheck;

/* ----------- DOM wiring ----------- */
document.addEventListener('DOMContentLoaded', () => {

  /* ---- LOGIN ---- */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      toggleSubmitting(submitBtn, true, 'Signing in...');

      const email = document.getElementById('email')?.value.trim() || '';
      const password = document.getElementById('password')?.value || '';

      try {
        const resp = await postJson('/api/login', { email, password });

        // Token mode (not active now) fallback:
        if (!USE_COOKIES && resp && resp.token) {
            localStorage.setItem('auth_token', resp.token);
        }

        // Immediately test session (optional, helps debug cookie issues)
        try {
          await sessionCheck();
        } catch {
          alert('Login response received, but session not established (cookie not stored). Check CORS/origin.');
          return;
        }

        window.location.href = PATH_AFTER_LOGIN;
      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed: ' + err.message);
      } finally {
        toggleSubmitting(submitBtn, false);
      }
    });
  }

  /* ---- SIGNUP ---- */
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      toggleSubmitting(submitBtn, true, 'Creating...');

      const firstName = document.getElementById('firstName')?.value.trim() || '';
      const lastName = document.getElementById('lastName')?.value.trim() || '';
      const email = document.getElementById('email')?.value.trim() || '';
      const phone = document.getElementById('phone')?.value.trim() || null;
      const password = document.getElementById('password')?.value || '';
      const confirmPassword = document.getElementById('confirmPassword')?.value || '';
      const terms = !!document.getElementById('terms')?.checked;

      const payload = {
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        terms
      };

      try {
        await postJson('/api/register', payload);
        alert('Account created! Redirecting to dashboard...');
        window.location.href = PATH_AFTER_SIGNUP;
      } catch (err) {
        console.error('Registration error:', err);
        alert('Sign-up failed: ' + err.message);
      } finally {
        toggleSubmitting(submitBtn, false);
      }
    });
  }
});
