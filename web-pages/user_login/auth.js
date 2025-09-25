// API base URL (override by setting localStorage.API_BASE if needed)
const API_BASE = localStorage.getItem('API_BASE') || 'https://localhost:5001';

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
    const msg = (data && (data.message || data.title)) || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  // Handle Login submit
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email')?.value.trim() || '';
      const password = document.getElementById('password')?.value || '';

      try {
        const resp = await postJson('/api/login', { email, password });
        console.log('Login success:', resp);
        alert('Login successful');
      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed: ' + err.message);
      }
    });
  }

  // Handle Signup submit
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

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
        // birthday omitted intentionally
      };

      try {
        const resp = await postJson('/api/register', payload);
        console.log('Registration success:', resp);
        alert('Account created!');
      } catch (err) {
        console.error('Registration error:', err);
        alert('Sign-up failed: ' + err.message);
      }
    });
  }
});