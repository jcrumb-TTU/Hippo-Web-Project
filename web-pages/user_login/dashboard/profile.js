    /* ===============================
       Session & API configuration

       BACKEND CONTRACTS / NOTES FOR SERVER TEAM

       Endpoints used by this page (all requests send credentials: 'include'):

       GET /api/me
         - Purpose: quick auth check
         - Response: 200 + JSON with basic user/session info OR 401 when not authenticated

       GET /api/user/profile
         - Purpose: load profile data
         - Response JSON shape expected by UI (example):
           {
             "id": "user-id",
             "bio": "...",
             "photoUrl": "https://.../avatar.jpg",
             // optional: backend may include precomputed loan stats here to avoid extra call
             "loanStats": { "total": 12, "active": 2, "completed": 10 }
           }

       PUT /api/user/profile
         - Purpose: update profile fields (currently only 'bio')
         - Request body: { "bio": string }
         - Response: 200 on success, 4xx on validation/auth

       POST /api/user/profile/photo
         - Purpose: upload profile photo
         - Request: multipart/form-data with form field name 'photo' (file)
         - Response JSON example: { "imageUrl": "https://.../new-avatar.jpg" }

       DELETE /api/user/profile/photo
         - Purpose: remove/reset profile photo
         - Response: 200 on success

       GET /api/user/loans  (optional endpoint)
         - Purpose: return either an array of loan objects or a precomputed stats object.
         - Accepted responses:
           - Array of loans: [ { id, status, ... }, ... ]
             client will derive counts from 'status' (see code heuristics for common values)
           - Or stats object: { total: number, active: number, completed: number }

       POST /api/logout
         - Purpose: clear server-side session / auth cookie
         - Response: 200 on success (client will redirect to login regardless)

       Notes:
       - This page uses cookie-based auth so all fetches include credentials.
       - If CORS is configured on the backend, ensure Access-Control-Allow-Credentials: true
         and allowed origin matches the front-end origin.
    =============================== */
    const API = {
      me: '/api/me',
      getProfile: '/api/user/profile',
      updateProfile: '/api/user/profile',
      uploadPhoto: '/api/user/profile/photo',
      removePhoto: '/api/user/profile/photo',
      logout: '/api/logout'
    };

    // Run session guard FIRST
    (async function sessionGuard(){
      const r = await fetch(API.me, { credentials: 'include' });
      if(!r.ok){
        window.location.href = '../login.html';
      }
    })();

    /* ===============================
       DOM elements
       =============================== */
    const alerts = document.getElementById('alerts');
    const profileImg = document.getElementById('profileImg');
    const bioText = document.getElementById('bioText');
    const editBioBtn = document.getElementById('editBioBtn');
    const bioEditor = document.getElementById('bioEditor');
    const bioInput = document.getElementById('bioInput');
    const cancelBioBtn = document.getElementById('cancelBioBtn');
    const saveBioBtn = document.getElementById('saveBioBtn');
    const uploadOption = document.getElementById('uploadOption');
    const removeOption = document.getElementById('removeOption');
    const fileInput = document.getElementById('fileInput');
    const fileError = document.getElementById('fileError');
    const previewModalEl = document.getElementById('previewModal');
    const previewModal = new bootstrap.Modal(previewModalEl, { backdrop: 'static' });
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const confirmUploadBtn = document.getElementById('confirmUploadBtn');
    const confirmSpinner = document.getElementById('confirmSpinner');
    const confirmText = document.getElementById('confirmText');
    const removeModalEl = document.getElementById('removeModal');
    const removeModal = new bootstrap.Modal(removeModalEl);

    const logoutLink = document.getElementById('logoutLink');

// New stats elements / account actions
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statCompleted = document.getElementById('statCompleted');
const actionEditProfile = document.getElementById('actionEditProfile');
const actionSettings = document.getElementById('actionSettings');
const actionLogout = document.getElementById('actionLogout');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');

    const DEFAULT_AVATAR = "data:image/svg+xml;utf8," +
      "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>" +
      "<rect width='100%' height='100%' fill='%23e6f3fb'/>" +
      "<text x='50%' y='54%' font-size='58' text-anchor='middle' fill='%2321215c' font-family='Arial, Helvetica, sans-serif'>P</text>" +
      "</svg>";

    let lastSelectedFile = null;
    let lastSelectedDataUrl = null;

    /* ===============================
       Helper UI functions
       =============================== */
    function showAlert(message, type='success', timeout=4000){
      const id = 'a' + Date.now();
      const html = `
        <div id="${id}" class="alert alert-${type} alert-dismissible fade show" role="alert">
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
      alerts.insertAdjacentHTML('afterbegin', html);
      if(timeout){
        setTimeout(()=>{
          const el = document.getElementById(id);
            if(el){
              try { bootstrap.Alert.getOrCreateInstance(el).close(); } catch {}
            }
        }, timeout);
      }
    }

    function showFileError(text){
      fileError.textContent = text;
      fileError.style.display = 'block';
      setTimeout(()=> fileError.style.display='none', 3500);
    }

    /* ===============================
       Load profile
       =============================== */
    async function loadProfile(){
      try{
        const r = await fetch(API.getProfile, { credentials:'include' });
        if(!r.ok){
          if(r.status === 401) window.location.href='../login.html';
          bioText.textContent='No bio yet. Click edit to add one.';
          profileImg.src = DEFAULT_AVATAR;
          return;
        }
        const data = await r.json();
  bioText.textContent = data.bio || 'No bio yet. Click edit to add one.';
  profileImg.src = data.photoUrl || DEFAULT_AVATAR;
  // populate name/email if available (backend: include fields like 'name' and 'email')
  if(profileName) profileName.textContent = data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 'Your Name');
  if(profileEmail) profileEmail.textContent = data.email || '';
        // If backend exposes loan stats in the profile payload use them
        if(data.loanStats){
          statTotal.textContent = data.loanStats.total ?? '0';
          statActive.textContent = data.loanStats.active ?? '0';
          statCompleted.textContent = data.loanStats.completed ?? '0';
        }
      }catch(err){
        console.warn('Profile load failed:', err);
        bioText.textContent='No bio yet. Click edit to add one.';
        profileImg.src = DEFAULT_AVATAR;
      }
    }

    /* ===============================
       Load loan stats (separate endpoint fallback)
       =============================== */
    async function loadLoanStats(){
      // Try a dedicated endpoint; server may not provide it yet so fail gracefully
      try{
        const r = await fetch('/api/user/loans', { credentials:'include' });
        if(!r.ok) return; // ignore
        const data = await r.json();
        // Expect either an array of loans or a stats object
        if(Array.isArray(data)){
          const total = data.length;
          const active = data.filter(l => {
            // interpret common status fields
            const s = (l.status || l.state || '').toString().toLowerCase();
            return s === 'active' || s === 'ongoing' || s === 'borrowed' || s === 'in_progress' || s === 'in-progress';
          }).length;
          const completed = total - active;
          statTotal.textContent = total;
          statActive.textContent = active;
          statCompleted.textContent = completed;
        }else if(data && typeof data === 'object'){
          statTotal.textContent = data.total ?? (data.count ?? '0');
          statActive.textContent = data.active ?? data.inProgress ?? '0';
          statCompleted.textContent = data.completed ?? '0';
        }
      }catch(err){
        // ignore network errors; keep placeholders
        console.debug('Loan stats unavailable:', err);
      }
    }

    /* ===============================
       Bio editing
       =============================== */
    editBioBtn.addEventListener('click', ()=>{
      bioEditor.classList.remove('d-none');
      bioInput.value = (bioText.textContent.startsWith('No bio yet')) ? '' : bioText.textContent;
      bioInput.focus();
    });

    cancelBioBtn.addEventListener('click', ()=>{
      bioEditor.classList.add('d-none');
    });

    saveBioBtn.addEventListener('click', async ()=>{
      const newBio = bioInput.value.trim();
      if(newBio.length > 500){
        showAlert('Bio must be 500 characters or fewer.', 'warning');
        return;
      }
      saveBioBtn.disabled = true;
      try{
        const r = await fetch(API.updateProfile, {
          method:'PUT',
          credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ bio: newBio })
        });
        if(!r.ok){
          if(r.status === 401){ window.location.href='../login.html'; return; }
          showAlert('Failed to save bio.', 'danger');
        }else{
          bioText.textContent = newBio || 'No bio yet. Click edit to add one.';
          showAlert('Bio saved', 'success');
        }
        bioEditor.classList.add('d-none');
      }catch(err){
        console.error(err);
        showAlert('Network error saving bio.', 'danger', 6000);
      }finally{
        saveBioBtn.disabled = false;
      }
    });

    /* ===============================
       Photo upload flow
       =============================== */
    const allowedTypes = ['image/png','image/jpeg','image/jpg','image/gif'];

    uploadOption.addEventListener('click', e=>{
      e.preventDefault();
      fileInput.value='';
      fileInput.click();
    });

    fileInput.addEventListener('change', e=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
      if(!allowedTypes.includes(type)){
        showFileError('Only PNG, JPG or GIF allowed');
        fileInput.value='';
        return;
      }
      lastSelectedFile = file;
      previewName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = ev=>{
        lastSelectedDataUrl = ev.target.result;
        previewImage.src = lastSelectedDataUrl;
        previewModal.show();
      };
      reader.readAsDataURL(file);
    });

    confirmUploadBtn.addEventListener('click', async ()=>{
      if(!lastSelectedFile){
        previewModal.hide();
        return;
      }
      confirmSpinner.classList.remove('d-none');
      confirmText.textContent ='Uploading...';
      confirmUploadBtn.disabled = true;
      try{
        const fd = new FormData();
        fd.append('photo', lastSelectedFile);
        const r = await fetch(API.uploadPhoto, {
          method:'POST',
          credentials:'include',
          body: fd
        });
        if(!r.ok){
          showAlert('Upload failed ('+r.status+').', 'danger', 6000);
          previewModal.hide();
        }else{
            const data = await r.json();
            profileImg.src = data.imageUrl || lastSelectedDataUrl || DEFAULT_AVATAR;
            showAlert('Profile photo updated', 'success');
            previewModal.hide();
        }
      }catch(err){
        console.error(err);
        showAlert('Network error uploading photo', 'danger', 6000);
      }finally{
        confirmSpinner.classList.add('d-none');
        confirmText.textContent='Confirm';
        confirmUploadBtn.disabled = false;
        lastSelectedFile = null;
        lastSelectedDataUrl = null;
        fileInput.value='';
      }
    });

    removeOption.addEventListener('click', e=>{
      e.preventDefault();
      removeModal.show();
    });

    document.getElementById('confirmRemoveBtn').addEventListener('click', async ()=>{
      try{
        const r = await fetch(API.removePhoto, {
          method:'DELETE',
          credentials:'include'
        });
        if(!r.ok){
          showAlert('Remove failed.', 'danger');
        }else{
          profileImg.src = DEFAULT_AVATAR;
          showAlert('Profile photo removed', 'success');
        }
      }catch(err){
        console.error(err);
        showAlert('Network error removing photo', 'danger');
      }finally{
        removeModal.hide();
      }
    });

    /* ===============================
       Logout
       =============================== */
    logoutLink.addEventListener('click', async (e)=>{
      e.preventDefault();
      try {
        await fetch(API.logout, { method:'POST', credentials:'include' });
      } catch {}
      window.location.href = '../login.html';
    });

    // account action buttons
    if(actionEditProfile){
      actionEditProfile.addEventListener('click', (e)=>{
        e.preventDefault();
        // reuse bio editor
        bioEditor.classList.remove('d-none');
        bioInput.value = (bioText.textContent.startsWith('No bio yet')) ? '' : bioText.textContent;
        bioInput.focus();
      });
    }
    if(actionSettings){
      actionSettings.addEventListener('click', (e)=>{
        e.preventDefault();
        // navigate to edit profile page
        window.location.href = '../edit_profile.html';
      });
    }
    if(actionLogout){
      actionLogout.addEventListener('click', async (e)=>{
        e.preventDefault();
        try{ await fetch(API.logout, { method:'POST', credentials:'include' }); } catch {}
        window.location.href = '../login.html';
      });
    }

    /* ===============================
       Init
       =============================== */
    (function init(){
      loadProfile();
      // try separate loan stats endpoint after profile
      loadLoanStats();
    })();