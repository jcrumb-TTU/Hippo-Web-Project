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
    // Use floating toasts for danger and warning to match other pages
    if(type === 'danger' || type === 'warning'){
      try{ 
        // ensure a container exists and show toast
        let container = document.getElementById('floating-toasts');
        if(!container){
          container = document.createElement('div');
          container.id = 'floating-toasts';
          container.style.cssText = `position: fixed; top: 12px; left: 50%; transform: translateX(-50%); display:flex; flex-direction:column; gap:8px; align-items:center; z-index:9999; pointer-events:none;`;
          document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} shadow-lg`;
        toast.style.cssText = `min-width:320px; border-radius:8px; padding:12px 18px; display:flex; align-items:center; gap:10px; animation: slideDown 0.28s ease; font-weight:500; pointer-events:auto;`;
        const icons = {
          success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
          warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
          info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
          danger: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        };
        toast.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
        if (!document.getElementById('toast-animations')){
          const style = document.createElement('style');
          style.id = 'toast-animations';
          style.textContent = `@keyframes slideDown{from{opacity:0;transform:translateY(-12px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}}@keyframes slideUp{from{opacity:1;transform:translateY(0) scale(1);}to{opacity:0;transform:translateY(-8px) scale(.98);}}`;
          document.head.appendChild(style);
        }
        container.appendChild(toast);
        const removeAfter = timeout && typeof timeout === 'number' ? timeout + 200 : 4200;
        setTimeout(()=>{ toast.style.animation = 'slideUp 0.28s ease'; setTimeout(()=>toast.remove(),280); }, removeAfter);
      }catch(e){ /* fall back to inline alert below */ }
      return;
    }

    const id = 'a' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    alerts.appendChild(el);
    if(timeout) setTimeout(()=>{ const e = document.getElementById(id); if(e) e.remove(); }, timeout);
  }

  // Persist settings (no toggles present in this build)
  async function persistSettings(){
    const obj = {};
    saveLocalSettings(obj);
    try{
      const r = await fetch('/api/user/settings', { method:'PUT', credentials:'include', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ settings: obj }) });
      if(!r.ok) console.debug('Server save returned', r.status);
    }catch(e){ console.debug('No server available for settings save'); }
    return obj;
  }

  function init(){
    const saveSettingsBtn = qs('saveSettingsBtn');
    const cancelSettingsBtn = qs('cancelSettingsBtn');

    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      await persistSettings();
      showAlert('Settings saved', 'success');
      setTimeout(()=>{ window.location.href = '/user_login/dashboard/profile/profile.html'; }, 600);
    });

    if(cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', (e)=>{ e.preventDefault(); window.location.href = '/user_login/dashboard/profile/profile.html'; });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
