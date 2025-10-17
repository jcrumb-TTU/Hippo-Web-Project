// lendings.js — updated to match postings.js click-to-expand and hover interactions
(function(){
  const MOCK_BORROWED = [
    { id:101, title:'Mountain Bike', img:'https://placehold.co/600x400?text=Bike', due:'2025-11-02', lender:'Alex M', phone:'(555) 322-1188', notes:'Bring a helmet.' },
    { id:102, title:'Projector', img:'https://placehold.co/600x400?text=Projector', due:'2025-10-28', lender:'Sam W', phone:'(555) 441-9900', notes:'Handle with care.' },
    { id:103, title:'Camping Stove', img:'https://placehold.co/600x400?text=Stove', due:'2025-11-10', lender:'Rita P', phone:'(555) 773-0101', notes:'Refill fuel as needed.' }
  ];

  function el(tag, attrs={}, children=[]){ const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v); }); (Array.isArray(children)?children:[]).forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }); return e; }

  function makeCard(item){
    const card = el('article',{ class:'asset-card borrow-card', tabindex:'0', role:'button', 'aria-expanded':'false', 'data-id':String(item.id) });
    const img = el('img',{ class:'asset-thumb borrow-thumb', src:item.img, alt:item.title });
    const body = el('div',{ class:'asset-body borrow-body' }, [ el('div',{ class:'asset-title borrow-title' }, [ item.title ]) ]);

    const details = el('div',{ class:'asset-details' }, [
      el('div',{ class:'mb-2' }, [ el('strong',{},['Lender: ']), el('div',{ class:'small-muted mt-1' }, [ item.lender || '—' ]) ]),
      el('div',{ class:'mb-2' }, [ el('strong',{},['Due: ']), el('div',{ class:'small-muted mt-1' }, [ item.due || '—' ]) ]),
      el('div',{ class:'mb-2' }, [ el('strong',{},['Phone: ']), el('div',{ class:'small-muted mt-1' }, [ item.phone || '—' ]) ]),
      el('div',{ class:'mb-2' }, [ el('strong',{},['Notes: ']), el('div',{ class:'small-muted mt-1' }, [ item.notes || '—' ]) ]),
      el('div',{ class:'mt-2' }, [ el('button',{ class:'btn btn-sm btn-outline-primary return-btn', 'data-id':String(item.id) }, ['Mark returned'], ) ])
    ]);

    card.appendChild(img); card.appendChild(body); card.appendChild(details);

    function toggle(expand){
      const currently = document.querySelectorAll('.asset-card.expanded');
      const willExpand = (typeof expand === 'boolean') ? expand : !card.classList.contains('expanded');
      if(willExpand){
        currently.forEach(c=>{ if(c !== card){ c.classList.remove('expanded'); c.setAttribute('aria-expanded','false'); } });
        card.classList.add('expanded');
        card.setAttribute('aria-expanded','true');
      }else{
        card.classList.remove('expanded');
        card.setAttribute('aria-expanded','false');
      }
    }

    card.addEventListener('click', (e)=>{
      // if the click originated from the return button, let it bubble to the grid handler
      if (e.target.closest && e.target.closest('.return-btn')) return;
      e.stopPropagation();
      toggle();
    });
    card.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); } if(e.key==='Escape'){ toggle(false); } });

    return card;
  }

  function moveToReturned(id){
    const elCard = document.querySelector(`.asset-card[data-id="${id}"]`);
    const returnedGrid = document.getElementById('returnedGrid');
    if(!elCard || !returnedGrid) return;
    const clone = elCard.cloneNode(true);
    clone.classList.add('returned-card');
    const now = new Date();
    const ts = now.toLocaleString();
    const info = document.createElement('div');
    info.className = 'asset-meta small-muted';
    info.textContent = `Returned on ${ts}`;
    const actions = clone.querySelector('.borrow-actions, .asset-actions'); if(actions) actions.remove();
    clone.querySelector('.asset-body')?.appendChild(info);
    returnedGrid.insertBefore(clone, returnedGrid.firstChild);
    elCard.remove();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    const grid = document.getElementById('borrowGrid'); if(!grid) return;
    if(MOCK_BORROWED.length===0){ grid.innerHTML = '<div class="empty-state">You have no active borrowings right now.</div>'; return; }
    MOCK_BORROWED.forEach(b=> grid.appendChild(makeCard(b)));

    // wire return buttons to modal
    const returnModalEl = document.getElementById('returnConfirmModal');
    let selectedId = null;
    const bsModal = returnModalEl ? new bootstrap.Modal(returnModalEl) : null;
    grid.addEventListener('click', (e)=>{ const btn = e.target.closest('.return-btn'); if(!btn) return; selectedId = btn.getAttribute('data-id'); if(bsModal) bsModal.show(); });
    const confirmBtn = document.getElementById('confirmReturnBtn');
    if(confirmBtn){ confirmBtn.addEventListener('click', ()=>{ if(selectedId){ moveToReturned(selectedId); selectedId = null; if(bsModal) bsModal.hide(); } }); }

    // close expanded when clicking outside
    document.addEventListener('click', (e)=>{ const expanded = document.querySelectorAll('.asset-card.expanded'); expanded.forEach(c=>{ if(!c.contains(e.target)){ c.classList.remove('expanded'); c.setAttribute('aria-expanded','false'); } }); });
  });
})();


