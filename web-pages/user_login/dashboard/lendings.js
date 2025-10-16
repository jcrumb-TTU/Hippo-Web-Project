// lendings.js — design-only borrowed items list
(function(){
  const MOCK_BORROWED = [
    { id:101, title:'Mountain Bike', img:'https://placehold.co/600x400?text=Bike', due:'2025-11-02', lender:'Alex M', phone:'(555) 322-1188', notes:'Bring a helmet.' },
    { id:102, title:'Projector', img:'https://placehold.co/600x400?text=Projector', due:'2025-10-28', lender:'Sam W', phone:'(555) 441-9900', notes:'Handle with care.' },
    { id:103, title:'Camping Stove', img:'https://placehold.co/600x400?text=Stove', due:'2025-11-10', lender:'Rita P', phone:'(555) 773-0101', notes:'Refill fuel as needed.' }
  ];

  function el(tag, attrs={}, children=[]){ const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v); }); (Array.isArray(children)?children:[]).forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }); return e; }

  function makeBorrowCard(item){
    const card = el('article',{ class:'borrow-card', 'data-id':String(item.id) });
    const img = el('img',{ class:'borrow-thumb', src:item.img, alt:item.title });
    const body = el('div',{ class:'borrow-body' }, [ el('div',{ class:'borrow-title' }, [ item.title ]), el('div',{ class:'borrow-meta' }, [ `Lender: ${item.lender} • Due: ${item.due}` ]), el('div',{ class:'borrow-meta small-muted' }, [ `Phone: ${item.phone}` ]) ]);

    const actions = el('div',{ class:'borrow-actions' }, [ el('button',{ class:'btn btn-sm btn-outline-primary return-btn', 'data-id':String(item.id) }, ['Return']) ]);
    card.appendChild(img); card.appendChild(body); card.appendChild(actions);
    return card;
  }

  // simple helper to remove card by id
  function removeCardById(id){ const el=document.querySelector(`.borrow-card[data-id="${id}"]`); if(el) el.remove(); }

  function moveToReturned(id){
    const elCard = document.querySelector(`.borrow-card[data-id="${id}"]`);
    const returnedGrid = document.getElementById('returnedGrid');
    if(!elCard || !returnedGrid) return;
    // clone node and add returned meta
    const clone = elCard.cloneNode(true);
    clone.classList.add('returned-card');
    const now = new Date();
    const ts = now.toLocaleString();
    const info = document.createElement('div');
    info.className = 'borrow-meta small-muted';
    info.textContent = `Returned on ${ts}`;
    // remove actions from clone
    const actions = clone.querySelector('.borrow-actions'); if(actions) actions.remove();
    clone.querySelector('.borrow-body')?.appendChild(info);
    returnedGrid.insertBefore(clone, returnedGrid.firstChild);
    // remove original
    elCard.remove();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    const grid = document.getElementById('borrowGrid'); if(!grid) return;
    if(MOCK_BORROWED.length===0){ grid.innerHTML = '<div class="empty-state">You have no active borrowings right now.</div>'; return; }
    MOCK_BORROWED.forEach(b=> grid.appendChild(makeBorrowCard(b)));

    // wire return buttons to open confirm modal
    const returnModalEl = document.getElementById('returnConfirmModal');
    let selectedId = null;
    const bsModal = returnModalEl ? new bootstrap.Modal(returnModalEl) : null;
    grid.addEventListener('click', (e)=>{
      const btn = e.target.closest('.return-btn');
      if(!btn) return;
      selectedId = btn.getAttribute('data-id');
      if(bsModal) bsModal.show();
    });

    const confirmBtn = document.getElementById('confirmReturnBtn');
    if(confirmBtn){ confirmBtn.addEventListener('click', ()=>{ if(selectedId){ moveToReturned(selectedId); selectedId = null; if(bsModal) bsModal.hide(); } }); }
  });
})();
