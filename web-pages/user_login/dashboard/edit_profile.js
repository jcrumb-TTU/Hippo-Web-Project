/* Edit profile page JS (renamed from settings.js)
   - Prefills fields from GET /api/user/profile
   - Saves via PUT /api/user/settings
   - Uses cookie auth (credentials: 'include')
*/

// Prefer a relative API root by default to match profile.js behavior and avoid cross-origin cookie issues.
const API_BASE = (localStorage.getItem('API_BASE') || '').replace(/\/$/, '');
function api(path){ return (API_BASE || '') + path; }

const form = document.getElementById('settingsForm');
const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const displayName = document.getElementById('displayName');
const email = document.getElementById('email');
const phone = document.getElementById('phone');
const street = document.getElementById('street');
const city = document.getElementById('city');
const state = document.getElementById('state');
const zip = document.getElementById('zip');
const emailNotifications = document.getElementById('emailNotifications');
const alerts = document.getElementById('alerts');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const designToggle = document.getElementById('designModeToggle');

function showAlert(msg, type='success', timeout=4000){
  const id = 'a' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = `alert alert-${type} alert-dismissible fade show`;
  el.role = 'alert';
  el.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  alerts.appendChild(el);
  if(timeout) setTimeout(()=>{ const e = document.getElementById(id); if(e) e.remove(); }, timeout);
}

// Design mode
const urlSearch = new URLSearchParams(window.location.search);
const DESIGN_MODE = (localStorage.getItem('DESIGN_MODE') === '1') || urlSearch.get('design') === '1';
function mockProfile(){ return { firstName:'Ava', lastName:'Harrison', name:'Ava Harrison', email:'ava.harrison@example.com', phone:'555-123-4567', address:{street:'123 Oak St', city:'College Town', state:'TX', zip:'77840'}, settings:{ } }; }

async function sessionCheck(){
  if(DESIGN_MODE) return Promise.resolve({ id: 'mock' });
  const url = api('/api/me');
  const r = await fetch(url, { credentials:'include' });
  if(!r.ok){ try{ const txt = await r.text(); console.debug('sessionCheck body:', txt); }catch{}; throw new Error('Not authenticated'); }
  return r.json();
}

async function loadSettings(){
  try{
    if(DESIGN_MODE){ const data = mockProfile(); if(firstName) firstName.value=data.firstName||''; if(lastName) lastName.value=data.lastName||''; if(email) email.value=data.email||''; if(phone) phone.value=data.phone||''; if(street) street.value=data.address?.street||''; if(city) city.value=data.address?.city||''; if(state) state.value=data.address?.state||''; if(zip) zip.value=data.address?.zip||''; return; }
    await sessionCheck();
    const profileUrl = api('/api/user/profile');
    const r = await fetch(profileUrl, { credentials:'include' });
    if(!r.ok) throw new Error('Failed to load profile');
    const data = await r.json();
    if(firstName) firstName.value = data.firstName || data.name?.split(' ')?.[0] || '';
    if(lastName) lastName.value = data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : '') || '';
    if(email) email.value = data.email || '';
    if(phone) phone.value = data.phone || '';
    if(street) street.value = data.address?.street || '';
    if(city) city.value = data.address?.city || '';
    if(state) state.value = data.address?.state || '';
    if(zip) zip.value = data.address?.zip || '';
  }catch(err){ console.error(err); const container = document.createElement('div'); container.className='alert alert-danger'; container.innerHTML=`<div>Unable to load settings (you may be signed out).</div><div class="mt-2 d-flex gap-2"><button class="btn btn-sm btn-primary" id="__retrySettings">Retry</button><button class="btn btn-sm btn-outline-secondary" id="__enterDesign">Enter design mode</button><a class="btn btn-sm btn-link text-danger" href="../login.html">Sign in</a></div>`; if(alerts) alerts.innerHTML=''; if(alerts) alerts.appendChild(container); const retryBtn = document.getElementById('__retrySettings'); if(retryBtn) retryBtn.addEventListener('click', ()=>{ loadSettings(); }); const designBtn = document.getElementById('__enterDesign'); if(designBtn) designBtn.addEventListener('click', ()=>{ localStorage.setItem('DESIGN_MODE','1'); loadSettings(); }); }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault(); saveBtn.disabled=true; try{ const payload={ firstName:firstName?.value?.trim()||null, lastName:lastName?.value?.trim()||null, name: `${firstName?.value||''} ${lastName?.value||''}`.trim(), phone: phone.value.trim()||null, address:{ street:street.value.trim()||null, city:city.value.trim()||null, state:state.value.trim()||null, zip:zip.value.trim()||null } }; if(DESIGN_MODE){ await new Promise(r=>setTimeout(r,350)); showAlert('Settings saved (design mode)','success'); } else { const settingsUrl = api('/api/user/settings'); const r = await fetch(settingsUrl,{ method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); if(!r.ok) throw new Error('Save failed'); showAlert('Settings saved','success'); } }catch(err){ console.error(err); showAlert('Failed to save settings','danger',6000);} finally{ saveBtn.disabled=false; } });

cancelBtn.addEventListener('click',(e)=>{ e.preventDefault(); window.location.href = '../profile.html'; });

window.addEventListener('DOMContentLoaded', ()=>{ loadSettings(); if(designToggle){ designToggle.checked = DESIGN_MODE; designToggle.addEventListener('change', (e)=>{ const on = !!e.target.checked; if(on) localStorage.setItem('DESIGN_MODE','1'); else localStorage.removeItem('DESIGN_MODE'); loadSettings(); }); } });
