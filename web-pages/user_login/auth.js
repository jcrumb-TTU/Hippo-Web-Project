// API base URL (override by setting localStorage.API_BASE in the console)
// Example: localStorage.setItem('API_BASE', 'http://localhost:5257')
const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:5257';

// If your API authenticates with cookies (Set-Cookie on login), set this to true.
// Then ensure CORS on the API allows credentials and specific origins.
// Otherwise, leave false and use token-based auth via Authorization headers.
const USE_COOKIES = false;

// Redirect targets (relative to user_login folder)
const PATH_AFTER_SIGNUP = 'login.html';
const PATH_AFTER_LOGIN = 'dashboard/dashboard.html';

async function postJson(path, payload, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(USE_COOKIES ? {} : opts.headers),
    },
    body: JSON.stringify(payload),
    credentials: USE_COOKIES ? 'include' : 'same-origin',
  });

  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.title || data.error)) || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

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

// Logout helper
async function logout() {
  try {
    if (USE_COOKIES) {
      // Tell the API to clear any auth cookies
      await postJson('/api/logout', {});
    } else {
      // Token-based: just clear client storage
      localStorage.removeItem('auth_token');
    }
  } catch (e) {
    // No-op; logout should complete even if API not reachable
    console.warn('Logout warning:', e);
  } finally {
    // Send user to login page
    window.location.href = '../user_login/login.html';
  }
}

// Make available globally so you can call window.logout() from any page
window.logout = logout;

document.addEventListener('DOMContentLoaded', () => {
  // Handle Login submit
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
        if (!USE_COOKIES && resp && resp.token) {
          localStorage.setItem('auth_token', resp.token);
        }
        alert('Login successful');
        window.location.href = PATH_AFTER_LOGIN;
      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed: ' + err.message);
      } finally {
        toggleSubmitting(submitBtn, false);
      }
    });
  }

  // Handle Signup submit
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
        const resp = await postJson('/api/register', payload);
        console.log('Registration success:', resp);
        //alert('Account created! Redirecting to sign in...');
        window.location.href = PATH_AFTER_SIGNUP;
      } catch (err) {
        console.error('Registration error:', err);
        //alert('Sign-up failed: ' + err.message);
      } finally {
        toggleSubmitting(submitBtn, false);
      }
    });
  }
});