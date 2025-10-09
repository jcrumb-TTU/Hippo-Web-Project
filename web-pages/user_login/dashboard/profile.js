    /* ===============================
       Session & API configuration
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
      }catch(err){
        console.warn('Profile load failed:', err);
        bioText.textContent='No bio yet. Click edit to add one.';
        profileImg.src = DEFAULT_AVATAR;
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

    /* ===============================
       Init
       =============================== */
    (function init(){
      loadProfile();
    })();