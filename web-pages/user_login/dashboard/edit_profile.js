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
// design mode removed; no toggle element

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

// design mode removed: always use live API

async function sessionCheck(){
  const url = api('/api/me');
  const r = await fetch(url, { credentials:'include' });
  if(!r.ok){ try{ const txt = await r.text(); console.debug('sessionCheck body:', txt); }catch{}; throw new Error('Not authenticated'); }
  return r.json();
}

async function loadSettings(){
  try{
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
    if(state){
      // Accept either two-letter abbrev or full state name from API; normalize to abbrev if possible
      const s = (data.address?.state || '').toString().trim();
      const abbrev = normalizeStateAbbrev(s);
      state.value = abbrev || s || '';
    }
    if(zip) zip.value = data.address?.zip || '';
  }catch(err){
    console.error(err);
    const container = document.createElement('div');
    container.className='alert alert-danger';
    container.innerHTML=`<div>Unable to load settings (you may be signed out).</div><div class="mt-2 d-flex gap-2"><button class="btn btn-sm btn-primary" id="__retrySettings">Retry</button><a class="btn btn-sm btn-link text-danger" href="../login.html">Sign in</a></div>`;
    if(alerts) alerts.innerHTML='';
    if(alerts) alerts.appendChild(container);
    const retryBtn = document.getElementById('__retrySettings');
    if(retryBtn) retryBtn.addEventListener('click', ()=>{ loadSettings(); });
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault(); saveBtn.disabled=true; try{ const payload={ firstName:firstName?.value?.trim()||null, lastName:lastName?.value?.trim()||null, name: `${firstName?.value||''} ${lastName?.value||''}`.trim(), phone: phone.value.trim()||null, address:{ street:street.value.trim()||null, city:city.value.trim()||null, state:state.value.trim()||null, zip:zip.value.trim()||null } }; if(DESIGN_MODE){ await new Promise(r=>setTimeout(r,350)); showAlert('Settings saved (design mode)','success'); } else { const settingsUrl = api('/api/user/settings'); const r = await fetch(settingsUrl,{ method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); if(!r.ok) throw new Error('Save failed'); showAlert('Settings saved','success'); } }catch(err){ console.error(err); showAlert('Failed to save settings','danger',6000);} finally{ saveBtn.disabled=false; } });

cancelBtn.addEventListener('click',(e)=>{ e.preventDefault(); window.location.href = '../profile.html'; });

window.addEventListener('DOMContentLoaded', ()=>{ loadSettings(); if(designToggle){ designToggle.checked = DESIGN_MODE; designToggle.addEventListener('change', (e)=>{ const on = !!e.target.checked; if(on) localStorage.setItem('DESIGN_MODE','1'); else localStorage.removeItem('DESIGN_MODE'); loadSettings(); }); } });

// Helper: map common full state names to abbreviations (case-insensitive)
function normalizeStateAbbrev(input){
  if(!input) return '';
  const map = {
    'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY'
  };
  const key = input.toString().toLowerCase();
  return map[key] || null;
}
