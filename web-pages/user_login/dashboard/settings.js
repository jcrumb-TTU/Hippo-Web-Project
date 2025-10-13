// Settings page script (new)
// - Dark mode toggle (persisted locally)
// - Email notifications toggle (persisted locally)
// - Reset account (clears local data, optionally calls API DELETE /api/user/account)

(function(){
  // Defer DOM lookups until DOM is ready
  function qs(id){ return document.getElementById(id); }

  function getSavedSettings(){
    try{ const raw = localStorage.getItem('hippo_settings'); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
  }
  function saveLocalSettings(obj){ localStorage.setItem('hippo_settings', JSON.stringify(obj)); }

  function showAlert(msg, type='success', timeout=4000){
    const alerts = qs('alerts');
    if(!alerts) return;
    const id = 'a' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    alerts.appendChild(el);
    if(timeout) setTimeout(()=>{ const e = document.getElementById(id); if(e) e.remove(); }, timeout);
  }

  function applyDarkMode(enabled){
    if(enabled) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
    // apply card styling for dark mode
    document.querySelectorAll('.card').forEach(c=>{ if(enabled) c.classList.add('dark-mode'); else c.classList.remove('dark-mode'); });
  }

  async function persistSettings(darkMode, emailNotifications){
    const obj = { darkMode: !!darkMode, emailNotifications: !!emailNotifications };
    saveLocalSettings(obj);
    applyDarkMode(obj.darkMode);
    // attempt server save but don't block
    try{
      const r = await fetch('/api/user/settings', { method:'PUT', credentials:'include', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ settings: obj }) });
      if(!r.ok) console.debug('Server save returned', r.status);
    }catch(e){ console.debug('No server available for settings save'); }
    return obj;
  }

  function init(){
    const darkModeToggle = qs('darkModeToggle');
    const emailNotificationsToggle = qs('emailNotificationsToggle');
    const saveSettingsBtn = qs('saveSettingsBtn');
    const cancelSettingsBtn = qs('cancelSettingsBtn');

    const s = getSavedSettings();
    if(darkModeToggle) darkModeToggle.checked = !!s.darkMode;
    if(emailNotificationsToggle) emailNotificationsToggle.checked = !!s.emailNotifications;
    applyDarkMode(!!s.darkMode);

    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const dm = darkModeToggle ? darkModeToggle.checked : false;
      const en = emailNotificationsToggle ? emailNotificationsToggle.checked : false;
      await persistSettings(dm, en);
      showAlert('Settings saved', 'success');
    });

    if(cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', (e)=>{ e.preventDefault(); window.location.href = 'profile.html'; });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
